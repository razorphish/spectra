import {
  runAssistedTask,
  meridianBranch,
  meridianCommitMessage,
  gitOpsNotConfigured,
  type AssistedRunDeps,
  type GitOps,
  type ProposeArgs,
} from './assisted';
import type { ExecutorResult } from './executor';
import type { MeridianTask } from './runner';

const fakeResult: ExecutorResult = {
  model: 'claude-haiku-4-5-20251001',
  tier: 'small',
  text: 'export const generated = 1;',
  toolUse: null,
  usage: { inputTokens: 50, outputTokens: 20, totalTokens: 70 },
  stopReason: 'end_turn',
};

function authoringTask(): MeridianTask {
  return {
    taskClass: 'test_author',
    tier: 'small',
    prompt: 'p',
    l0Commands: [],
    artifactFor: (r) => [{ path: 'pkg/x.spec.ts', content: r.text }],
  };
}

function captureDb() {
  const values = jest.fn().mockResolvedValue(undefined);
  const db = { insert: jest.fn().mockReturnValue({ values }) } as unknown as AssistedRunDeps['db'];
  return { db, values };
}

/** Mock GitOps that records the propose() args. */
function mockGit() {
  let captured: ProposeArgs | undefined;
  const git: GitOps = {
    propose: (args) => {
      captured = args;
      return Promise.resolve({ branch: args.branch, commitSha: 'sha123', prUrl: 'https://pr/1' });
    },
  };
  return { git, get: () => captured };
}

describe('provenance helpers', () => {
  it('branch is namespaced + never a default branch', () => {
    expect(meridianBranch('test_author', 'abcdef12-9999')).toBe('meridian/test_author/abcdef12');
  });
  it('commit message carries the OQ-3 trailers', () => {
    const msg = meridianCommitMessage(authoringTask(), 'run-xyz', 'accepted');
    expect(msg).toContain('Meridian-Task: test_author');
    expect(msg).toContain('Meridian-Run: run-xyz');
  });
});

describe('runAssistedTask', () => {
  it('proposes the artifact and logs an assisted row with branch/pr/sha + applied_at', async () => {
    const { db, values } = captureDb();
    const { git, get } = mockGit();
    const res = await runAssistedTask(authoringTask(), {
      executor: async () => fakeResult,
      runGates: async () => ({ passed: true, gates: [{ command: 'tsc', ok: true, summary: '' }] }),
      db,
      git,
      newRunId: () => 'run-1',
      now: () => new Date('2026-06-29T00:00:00Z'),
    });

    expect(res.applied).toBe(true);
    expect(get()?.files).toEqual([{ path: 'pkg/x.spec.ts', content: 'export const generated = 1;' }]);
    expect(get()?.branch).toBe('meridian/test_author/run-1');

    const row = values.mock.calls[0][0];
    expect(row).toMatchObject({
      phase: 'assisted',
      decision: 'accepted',
      branch: 'meridian/test_author/run-1',
      prUrl: 'https://pr/1',
      commitSha: 'sha123',
    });
    expect(row.appliedAt).toBeInstanceOf(Date); // Assisted DID apply (to a branch)
  });

  it('opens a PR even when L0 fails (draft for a human to finish)', async () => {
    const { db } = captureDb();
    const { git } = mockGit();
    const res = await runAssistedTask(authoringTask(), {
      executor: async () => fakeResult,
      runGates: async () => ({ passed: false, gates: [{ command: 'tsc', ok: false, summary: 'err' }] }),
      db,
      git,
      newRunId: () => 'run-2',
    });
    expect(res.decision).toBe('rejected');
    expect(res.proposal.prUrl).toBe('https://pr/1');
  });

  it('refuses a task with no artifact (a check, not authoring)', async () => {
    const check: MeridianTask = { taskClass: 'openapi_contract_check', tier: 'small', prompt: 'p', l0Commands: [] };
    await expect(runAssistedTask(check, { git: mockGit().git })).rejects.toThrow(/not Assisted-eligible/);
  });

  it('default GitOps refuses to mutate the repo', async () => {
    await expect(gitOpsNotConfigured.propose({} as ProposeArgs)).rejects.toThrow(/no GitOps configured/);
  });
});
