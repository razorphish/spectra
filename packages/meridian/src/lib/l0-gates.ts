import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const pexecFile = promisify(execFile);

/**
 * L0 objective gates — the cheapest, fully-independent verifier (a compiler / test runner,
 * not a model grading itself). Runs configured shell commands and reports pass/fail.
 * See docs/adr/meridian-002-judge-panel.md (L0).
 */

export interface L0GateResult {
  command: string;
  ok: boolean;
  /** Tail of combined stdout/stderr, for the audit row. */
  summary: string;
}

export interface L0Result {
  passed: boolean;
  gates: L0GateResult[];
}

/** Runs one shell command; resolves ok=false on non-zero exit (never throws). Injectable for tests. */
export type CommandRunner = (command: string) => Promise<{ ok: boolean; summary: string }>;

function tail(s: string, n = 2000): string {
  return s.length > n ? s.slice(-n) : s;
}

const defaultRunner: CommandRunner = async (command) => {
  try {
    const { stdout, stderr } = await pexecFile('bash', ['-lc', command], {
      maxBuffer: 16 * 1024 * 1024,
    });
    return { ok: true, summary: tail(`${stdout}${stderr}`) };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return { ok: false, summary: tail(`${e.stdout ?? ''}${e.stderr ?? ''}${e.message ?? ''}`) };
  }
};

/**
 * Runs gates in order; **short-circuits on the first failure** (cheap-first: a failing
 * lint/typecheck stops before the slower build/test). `passed` requires at least one gate
 * and all gates green — no gates means no objective evidence, so it is NOT trusted.
 */
export async function runL0Gates(
  commands: string[],
  runner: CommandRunner = defaultRunner,
): Promise<L0Result> {
  const gates: L0GateResult[] = [];
  for (const command of commands) {
    const { ok, summary } = await runner(command);
    gates.push({ command, ok, summary });
    if (!ok) break;
  }
  return { passed: gates.length > 0 && gates.every((g) => g.ok), gates };
}
