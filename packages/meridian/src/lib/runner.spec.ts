import { runShadowTask, testAuthorTask, type ShadowRunDeps } from './runner';
import type { ExecutorResult } from './executor';
import { runL0Gates } from './l0-gates';

const fakeResult: ExecutorResult = {
  model: 'claude-haiku-4-5-20251001',
  tier: 'small',
  text: 'describe("x", () => { it("works", () => expect(1).toBe(1)); });',
  toolUse: null,
  usage: { inputTokens: 100, outputTokens: 40, totalTokens: 140 },
  stopReason: 'end_turn',
};

/** Captures the row passed to db.insert(...).values(...). */
function captureDb() {
  const values = jest.fn().mockResolvedValue(undefined);
  const db = { insert: jest.fn().mockReturnValue({ values }) } as unknown as ShadowRunDeps['db'];
  return { db, values };
}

describe('runShadowTask', () => {
  it('logs accepted + applies nothing when L0 passes', async () => {
    const { db, values } = captureDb();
    const res = await runShadowTask(testAuthorTask({ targetPath: 'a.ts', sourceCode: 'export const a = 1;' }), {
      executor: async () => fakeResult,
      runGates: async () => ({ passed: true, gates: [{ command: 'tsc', ok: true, summary: '' }] }),
      db,
      newRunId: () => 'run-1',
    });

    expect(res.applied).toBe(false);
    expect(res.decision).toBe('accepted');
    const row = values.mock.calls[0][0];
    expect(row).toMatchObject({
      runId: 'run-1',
      taskClass: 'test_author',
      phase: 'shadow',
      executorModel: 'claude-haiku-4-5-20251001',
      executorTier: 'small',
      tokensSpent: 140,
      decision: 'accepted',
    });
    expect(row.appliedAt).toBeUndefined(); // Shadow never applies
  });

  it('logs rejected when L0 fails', async () => {
    const { db, values } = captureDb();
    const res = await runShadowTask(testAuthorTask({ targetPath: 'a.ts', sourceCode: 'x' }), {
      executor: async () => fakeResult,
      runGates: async () => ({ passed: false, gates: [{ command: 'tsc', ok: false, summary: 'TS error' }] }),
      db,
      newRunId: () => 'run-2',
    });
    expect(res.decision).toBe('rejected');
    expect(values.mock.calls[0][0].decision).toBe('rejected');
  });
});

describe('runL0Gates', () => {
  it('passes when every gate is green', async () => {
    const r = await runL0Gates(['a', 'b'], async () => ({ ok: true, summary: 'ok' }));
    expect(r.passed).toBe(true);
    expect(r.gates).toHaveLength(2);
  });

  it('short-circuits on first failure', async () => {
    const runner = jest.fn().mockResolvedValue({ ok: false, summary: 'boom' });
    const r = await runL0Gates(['a', 'b', 'c'], runner);
    expect(r.passed).toBe(false);
    expect(runner).toHaveBeenCalledTimes(1); // stopped after the first
  });

  it('does not trust an empty gate set', async () => {
    const r = await runL0Gates([], async () => ({ ok: true, summary: '' }));
    expect(r.passed).toBe(false);
  });
});
