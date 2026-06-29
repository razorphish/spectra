import { randomUUID } from 'node:crypto';
import { rm, writeFile } from 'node:fs/promises';

import type Anthropic from '@anthropic-ai/sdk';

import { getDb, meridianActionLog, type SpectraDb } from '@spectra/database';

import {
  invokeExecutor,
  type ExecutorDeps,
  type ExecutorRequest,
  type ExecutorResult,
  type ExecutorTier,
  type MeridianDecision,
} from './executor';
import { runL0Gates, type CommandRunner, type L0Result } from './l0-gates';

/**
 * Shadow runner — the thinnest end-to-end slice (roadmap step 4). Drives one typed task:
 * executor → L0 gates → writes ONE append-only meridian_action_log row. In Shadow it
 * **applies nothing** (`applied_at` stays null). See docs/meridian/activation-plan.md.
 */

export interface MeridianTask {
  /** Task class from the taxonomy (ADR-003). */
  taskClass: string;
  tier: ExecutorTier;
  system?: string;
  /** Instructions for the executor. */
  prompt: string;
  /** Forced structured output (bounded classes emit a tool call instead of free text). */
  tools?: Anthropic.Tool[];
  toolChoice?: Anthropic.MessageCreateParamsNonStreaming['tool_choice'];
  /**
   * Programmatic L0: verify the executor's output against a deterministic check (e.g. compare
   * structured findings to ground truth). Takes precedence over `buildL0`/`l0Commands`.
   */
  verify?: (result: ExecutorResult) => Promise<L0Result> | L0Result;
  /** Static objective gate commands (used when `buildL0` and `verify` are absent). */
  l0Commands: string[];
  /**
   * Artifact-validating L0: given the executor's output, materialize it (e.g. write the
   * generated file to a temp path), return the gate commands to run against it, and an
   * optional cleanup (Shadow applies nothing, so the temp artifact is always removed).
   */
  buildL0?: (result: ExecutorResult) => Promise<{ commands: string[]; cleanup?: () => Promise<void> | void }>;
  /** Typed input, logged verbatim for audit. */
  input?: unknown;
}

export interface ShadowRunDeps {
  /** Defaults to the real executor (a live Claude call). Inject to mock. */
  executor?: (req: ExecutorRequest, deps?: ExecutorDeps) => Promise<ExecutorResult>;
  executorDeps?: ExecutorDeps;
  runGates?: (commands: string[], runner?: CommandRunner) => Promise<L0Result>;
  commandRunner?: CommandRunner;
  db?: SpectraDb;
  newRunId?: () => string;
}

export interface ShadowRunResult {
  runId: string;
  decision: MeridianDecision;
  result: ExecutorResult;
  l0: L0Result;
  /** Always false in Shadow — kept explicit so callers can't assume it applied. */
  applied: false;
}

export async function runShadowTask(
  task: MeridianTask,
  deps: ShadowRunDeps = {},
): Promise<ShadowRunResult> {
  const runId = (deps.newRunId ?? randomUUID)();
  const exec = deps.executor ?? invokeExecutor;
  const runGates = deps.runGates ?? runL0Gates;

  const result = await exec(
    {
      taskClass: task.taskClass,
      tier: task.tier,
      system: task.system,
      messages: [{ role: 'user', content: task.prompt }],
      tools: task.tools,
      toolChoice: task.toolChoice,
    },
    deps.executorDeps,
  );

  // L0 objective gates on the proposed output. Shadow never applies it. Order of precedence:
  // programmatic `verify` → `buildL0` (materialize to temp + shell gate) → static `l0Commands`.
  let l0: L0Result;
  if (task.verify) {
    l0 = await task.verify(result);
  } else {
    let commands = task.l0Commands;
    let cleanup: (() => Promise<void> | void) | undefined;
    if (task.buildL0) {
      const built = await task.buildL0(result);
      commands = built.commands;
      cleanup = built.cleanup;
    }
    try {
      l0 = await runGates(commands, deps.commandRunner);
    } finally {
      if (cleanup) await cleanup();
    }
  }
  const decision: MeridianDecision = l0.passed ? 'accepted' : 'rejected';

  const db = deps.db ?? getDb();
  await db.insert(meridianActionLog).values({
    runId,
    taskClass: task.taskClass,
    phase: 'shadow',
    executorModel: result.model,
    executorTier: result.tier,
    tokensSpent: result.usage.totalTokens,
    l0Results: l0,
    decision,
    input: (task.input ?? null) as object,
    output: { text: result.text, toolUse: result.toolUse, stopReason: result.stopReason },
    // applied_at intentionally omitted — Shadow logs, never applies.
  });

  return { runId, decision, result, l0, applied: false };
}

/** Strip a leading ```lang / trailing ``` fence if the model wrapped its output. */
export function stripCodeFences(text: string): string {
  const t = text.trim();
  const fenced = /^```[a-zA-Z]*\n([\s\S]*?)\n```$/.exec(t);
  return fenced ? fenced[1] : t;
}

/**
 * `test_author`: generate a Jest spec for a source module (low-risk authoring class).
 *
 * When `specPath` + `tsconfigPath` are given, L0 is **artifact-validating**: the generated
 * test is written to `specPath` and typechecked (`tsc --noEmit`), then removed. Import the
 * module via `importPath` (the relative specifier from `specPath` to the module). Without
 * them it falls back to `l0Commands` (used by unit tests).
 */
export function testAuthorTask(args: {
  targetPath: string;
  sourceCode: string;
  importPath?: string;
  specPath?: string;
  /** Gate command to run against the materialized spec (e.g. a scoped `nx test`). */
  l0Command?: string;
  l0Commands?: string[];
}): MeridianTask {
  const importHint = args.importPath
    ? ` The test file will be saved at ${args.specPath}; import the module under test with \`from '${args.importPath}'\`.`
    : '';
  const task: MeridianTask = {
    taskClass: 'test_author',
    tier: 'small',
    system:
      'You write a single focused Jest unit test in TypeScript for the provided module. ' +
      'Output only the test file contents — no prose, no code fences. ' +
      'Repo conventions (the file must compile under strict TypeScript): use the ambient ' +
      'jest/describe/it/expect globals — do NOT import from "@jest/globals". When mocking, ' +
      'use plain `jest.fn()` and cast inputs with `as` where types are awkward; never leave a ' +
      'mock argument inferred as `never`.' +
      importHint,
    prompt: `Write a Jest spec for this module (${args.targetPath}):\n\n${args.sourceCode}`,
    l0Commands: args.l0Commands ?? [],
    input: { targetPath: args.targetPath },
  };

  if (args.specPath && args.l0Command) {
    const specPath = args.specPath;
    const l0Command = args.l0Command;
    task.buildL0 = async (result) => {
      await writeFile(specPath, stripCodeFences(result.text) + '\n', 'utf8');
      return {
        commands: [l0Command],
        cleanup: () => rm(specPath, { force: true }),
      };
    };
  }
  return task;
}
