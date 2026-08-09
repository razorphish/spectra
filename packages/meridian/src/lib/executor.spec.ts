import Anthropic from '@anthropic-ai/sdk';

import {
  invokeExecutor,
  resolveExecutorModel,
  resolveExecutorApiKey,
  MeridianBudgetExceededError,
  MeridianModelNotConfiguredError,
  type ExecutorDeps,
} from './executor';

/** Minimal fake Anthropic client whose messages.create returns a canned message. */
function fakeClient(content: unknown[], usage = { input_tokens: 10, output_tokens: 5 }) {
  const create = jest.fn().mockResolvedValue({ content, usage, stop_reason: 'end_turn' });
  return { client: { messages: { create } } as unknown as Anthropic, create };
}

const baseReq = {
  tier: 'small' as const,
  messages: [{ role: 'user' as const, content: 'hi' }],
};
const zeroSpent: ExecutorDeps['spentToday'] = async () => 0;

describe('resolveExecutorModel', () => {
  const saved = process.env['MERIDIAN_EXECUTOR_SMALL'];
  afterEach(() => {
    if (saved === undefined) delete process.env['MERIDIAN_EXECUTOR_SMALL'];
    else process.env['MERIDIAN_EXECUTOR_SMALL'] = saved;
  });

  it('defaults per tier', () => {
    delete process.env['MERIDIAN_EXECUTOR_SMALL'];
    expect(resolveExecutorModel('small')).toBe('claude-haiku-4-5-20251001');
    expect(resolveExecutorModel('mid')).toBe('claude-sonnet-4-6');
    expect(resolveExecutorModel('frontier')).toBe('claude-opus-4-8');
  });

  it('honors env override', () => {
    process.env['MERIDIAN_EXECUTOR_SMALL'] = 'claude-haiku-pinned';
    expect(resolveExecutorModel('small')).toBe('claude-haiku-pinned');
  });
});

describe('resolveExecutorApiKey', () => {
  const saved = process.env['ANTHROPIC_API_KEY'];
  afterEach(() => {
    if (saved === undefined) delete process.env['ANTHROPIC_API_KEY'];
    else process.env['ANTHROPIC_API_KEY'] = saved;
  });

  it('throws when nothing is configured', () => {
    delete process.env['ANTHROPIC_API_KEY'];
    expect(() => resolveExecutorApiKey()).toThrow(MeridianModelNotConfiguredError);
  });

  it('reads an env: ref', () => {
    process.env['MERIDIAN_TEST_KEY'] = 'sk-test';
    expect(resolveExecutorApiKey('env:MERIDIAN_TEST_KEY')).toBe('sk-test');
    delete process.env['MERIDIAN_TEST_KEY'];
  });
});

describe('invokeExecutor', () => {
  it('makes one no-loop call and returns text + usage + resolved model', async () => {
    const { client, create } = fakeClient([{ type: 'text', text: 'done' }]);
    const res = await invokeExecutor(baseReq, { client, spentToday: zeroSpent });

    expect(create).toHaveBeenCalledTimes(1);
    expect(res.text).toBe('done');
    expect(res.model).toBe('claude-haiku-4-5-20251001');
    expect(res.usage).toEqual({ inputTokens: 10, outputTokens: 5, totalTokens: 15 });
    expect(res.toolUse).toBeNull();
  });

  it('extracts a tool_use block when present', async () => {
    const { client } = fakeClient([{ type: 'tool_use', id: 't1', name: 'emit', input: { a: 1 } }]);
    const res = await invokeExecutor(baseReq, { client, spentToday: zeroSpent });
    expect(res.toolUse?.name).toBe('emit');
  });

  it('fails closed when the daily budget is spent (no model call)', async () => {
    const { client, create } = fakeClient([{ type: 'text', text: 'x' }]);
    await expect(
      invokeExecutor(baseReq, { client, spentToday: async () => 9_999_999_999 }),
    ).rejects.toThrow(MeridianBudgetExceededError);
    expect(create).not.toHaveBeenCalled();
  });

  it('aborts an explicit over-ask past the per-task ceiling (no model call)', async () => {
    process.env['MERIDIAN_MAX_TOKENS_PER_TASK'] = '100';
    const { client, create } = fakeClient([{ type: 'text', text: 'x' }]);
    await expect(
      invokeExecutor({ ...baseReq, maxTokens: 500 }, { client, spentToday: zeroSpent }),
    ).rejects.toThrow(MeridianBudgetExceededError);
    expect(create).not.toHaveBeenCalled();
    delete process.env['MERIDIAN_MAX_TOKENS_PER_TASK'];
  });
});
