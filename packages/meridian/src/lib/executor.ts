import Anthropic from '@anthropic-ai/sdk';
import { sql } from 'drizzle-orm';

import { getDb, meridianActionLog, type SpectraDb } from '@spectra/database';

/**
 * Meridian executor wrapper. A single, no-loop model call tiered by task difficulty,
 * behind a fail-closed daily token budget. It does NOT write the action-log row or run
 * task logic — the append-only log forces the runner (step 4) to write one final row.
 * See docs/adr/meridian-001-executor-model-policy.md.
 */

// --- Shared contract values (mirror the meridian_action_log CHECK constraints) ----------

export const EXECUTOR_TIERS = ['small', 'mid', 'frontier'] as const;
export type ExecutorTier = (typeof EXECUTOR_TIERS)[number];

export const MERIDIAN_PHASES = ['shadow', 'assisted', 'gated_auto', 'broad_auto'] as const;
export type MeridianPhase = (typeof MERIDIAN_PHASES)[number];

export const MERIDIAN_DECISIONS = ['accepted', 'rejected', 'aborted'] as const;
export type MeridianDecision = (typeof MERIDIAN_DECISIONS)[number];

/** Default model per tier (ADR-001). Override per tier with `MERIDIAN_EXECUTOR_*`. */
const DEFAULT_MODELS: Record<ExecutorTier, string> = {
  small: 'claude-haiku-4-5-20251001',
  mid: 'claude-sonnet-4-6',
  frontier: 'claude-opus-4-8',
};

const DEFAULT_DAILY_TOKEN_BUDGET = 2_000_000;
// Output ceiling per call (the controllable lever). 8192: a live Shadow run showed a
// generated test for a 187-line module truncated at 4096 (failed L0). Still bounded.
const DEFAULT_MAX_TOKENS_PER_TASK = 8192;

// --- Errors ------------------------------------------------------------------------------

/** No API key configured. Mirrors sandbox-ai's AiModelNotConfiguredError (→ HTTP 503). */
export class MeridianModelNotConfiguredError extends Error {
  constructor(message = 'Meridian executor has no API key. Set ANTHROPIC_API_KEY.') {
    super(message);
    this.name = 'MeridianModelNotConfiguredError';
  }
}

/** Daily budget spent, or a request asking past the per-task ceiling. Fail-closed. */
export class MeridianBudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MeridianBudgetExceededError';
  }
}

// --- Config resolution -------------------------------------------------------------------

export function resolveExecutorModel(tier: ExecutorTier): string {
  const override = {
    small: process.env['MERIDIAN_EXECUTOR_SMALL'],
    mid: process.env['MERIDIAN_EXECUTOR_MID'],
    frontier: process.env['MERIDIAN_EXECUTOR_FRONTIER'],
  }[tier];
  return override?.trim() || DEFAULT_MODELS[tier];
}

/** `env:VARNAME` ref or the conventional ANTHROPIC_API_KEY (mirrors sandbox-ai-llm). */
export function resolveExecutorApiKey(secretRef?: string | null): string {
  const ref = (secretRef ?? '').trim();
  let key: string | null = null;
  if (!ref) {
    key = process.env['ANTHROPIC_API_KEY']?.trim() || null;
  } else if (ref.startsWith('env:')) {
    const name = ref.slice('env:'.length).trim();
    key = (name ? process.env[name]?.trim() : '') || null;
  }
  if (!key) throw new MeridianModelNotConfiguredError();
  return key;
}

function parsePositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export const dailyTokenBudget = (): number =>
  parsePositiveIntEnv('MERIDIAN_DAILY_TOKEN_BUDGET', DEFAULT_DAILY_TOKEN_BUDGET);

export const maxTokensPerTask = (): number =>
  parsePositiveIntEnv('MERIDIAN_MAX_TOKENS_PER_TASK', DEFAULT_MAX_TOKENS_PER_TASK);

/** Total tokens recorded in meridian_action_log since the start of the current UTC day. */
export async function dailyTokensSpent(db: SpectraDb): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`coalesce(sum(${meridianActionLog.tokensSpent}), 0)` })
    .from(meridianActionLog)
    .where(sql`${meridianActionLog.createdAt} >= date_trunc('day', now())`);
  return Number(rows[0]?.total ?? 0);
}

// --- Executor ----------------------------------------------------------------------------

export interface ExecutorRequest {
  /** Task class from the taxonomy (ADR-003); used for error/telemetry context only. */
  taskClass?: string;
  tier: ExecutorTier;
  messages: Anthropic.MessageParam[];
  system?: string;
  tools?: Anthropic.Tool[];
  toolChoice?: Anthropic.MessageCreateParamsNonStreaming['tool_choice'];
  /** Output token cap for this call; must not exceed the per-task ceiling. */
  maxTokens?: number;
  /** `env:VAR` ref; defaults to ANTHROPIC_API_KEY. */
  secretRef?: string | null;
}

export interface ExecutorDeps {
  client?: Anthropic;
  db?: SpectraDb;
  /** Override the budget reader (tests inject this to avoid a DB). */
  spentToday?: () => Promise<number>;
}

export interface ExecutorResult {
  model: string;
  tier: ExecutorTier;
  text: string;
  toolUse: Anthropic.ToolUseBlock | null;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  stopReason: string | null;
}

/**
 * One model call, no loop. Enforces the fail-closed daily budget BEFORE dispatch and caps
 * output at the per-task ceiling (an explicit over-ask aborts rather than silently truncates).
 */
export async function invokeExecutor(
  req: ExecutorRequest,
  deps: ExecutorDeps = {},
): Promise<ExecutorResult> {
  const perTaskCap = maxTokensPerTask();
  if (req.maxTokens !== undefined && req.maxTokens > perTaskCap) {
    throw new MeridianBudgetExceededError(
      `Requested maxTokens ${req.maxTokens} exceeds MERIDIAN_MAX_TOKENS_PER_TASK ${perTaskCap}.`,
    );
  }
  const maxOutputTokens = req.maxTokens ?? perTaskCap;

  // Fail-closed: refuse to dispatch once the day's budget is spent.
  const budget = dailyTokenBudget();
  const spent = await (deps.spentToday ?? (() => dailyTokensSpent(deps.db ?? getDb())))();
  if (spent >= budget) {
    throw new MeridianBudgetExceededError(
      `Daily token budget reached (${spent}/${budget}); refusing to dispatch ${req.taskClass ?? 'task'}.`,
    );
  }

  const client = deps.client ?? new Anthropic({ apiKey: resolveExecutorApiKey(req.secretRef) });
  const model = resolveExecutorModel(req.tier);

  const message = await client.messages.create({
    model,
    max_tokens: maxOutputTokens,
    ...(req.system ? { system: req.system } : {}),
    ...(req.tools ? { tools: req.tools } : {}),
    ...(req.toolChoice ? { tool_choice: req.toolChoice } : {}),
    messages: req.messages,
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  const toolUse =
    message.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use') ?? null;

  return {
    model,
    tier: req.tier,
    text,
    toolUse,
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      totalTokens: message.usage.input_tokens + message.usage.output_tokens,
    },
    stopReason: message.stop_reason,
  };
}
