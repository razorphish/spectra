import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

import type { GitOps, ProposeArgs, ProposeResult } from './assisted';

const pexec = promisify(execFile);

/**
 * Real GitOps backend for the Assisted phase. Uses an **isolated `git worktree`** so it never
 * touches the caller's working tree or current branch (important — the repo may have unrelated
 * uncommitted changes). With `dryRun`, it creates the branch + commit locally and cleans them up
 * (no push, no PR) — that verifies the git glue without any remote side effects. Only a non-dry
 * run pushes and calls `gh pr create` (requires an authenticated `gh`).
 */
export interface WorktreeGitOpsOptions {
  repoRoot?: string;
  /** Branch/sha the worktree starts from. Default `HEAD`. */
  baseRef?: string;
  /** PR base branch (must exist on the remote). Default: `baseRef` with any `origin/` prefix removed. */
  prBaseRef?: string;
  remote?: string;
  /** Skip `git push` + `gh pr create`; create branch+commit locally then remove them. */
  dryRun?: boolean;
}

/** Parse `owner/repo` from an https or ssh GitHub remote URL. */
function parseGitHubSlug(remoteUrl: string): string | null {
  const m = /github\.com[/:]([^/]+)\/(.+?)(?:\.git)?$/.exec(remoteUrl.trim());
  return m ? `${m[1]}/${m[2]}` : null;
}

export function worktreeGitOps(opts: WorktreeGitOpsOptions = {}): GitOps {
  const repoRoot = opts.repoRoot ?? process.cwd();
  const base = opts.baseRef ?? 'HEAD';
  const remote = opts.remote ?? 'origin';
  const git = (args: string[], cwd: string) => pexec('git', args, { cwd, maxBuffer: 16 * 1024 * 1024 });

  return {
    async propose(args: ProposeArgs): Promise<ProposeResult> {
      const wt = await mkdtemp(join(tmpdir(), 'meridian-wt-'));
      let branchCreated = false;
      try {
        await git(['worktree', 'add', '-b', args.branch, wt, base], repoRoot);
        branchCreated = true;

        for (const f of args.files) {
          const abs = join(wt, f.path);
          await mkdir(dirname(abs), { recursive: true });
          await writeFile(abs, f.content, 'utf8');
        }
        await git(['add', '-A'], wt);
        await git(['commit', '-m', args.commitMessage], wt);
        const commitSha = (await git(['rev-parse', 'HEAD'], wt)).stdout.trim();

        let prUrl = '(dry-run: not pushed)';
        if (!opts.dryRun) {
          const prBase = opts.prBaseRef ?? base.replace(/^origin\//, '');
          await git(['push', '-u', remote, args.branch], wt);
          try {
            const pr = await pexec(
              'gh',
              ['pr', 'create', '--base', prBase, '--head', args.branch, '--title', args.prTitle, '--body', args.prBody],
              { cwd: wt },
            );
            prUrl = pr.stdout.trim();
          } catch {
            // gh missing/unauthed → hand back a prefilled compare URL (branch is already pushed).
            const slug = parseGitHubSlug((await git(['remote', 'get-url', remote], wt)).stdout);
            prUrl = slug
              ? `https://github.com/${slug}/compare/${prBase}...${args.branch}?expand=1`
              : `(pushed ${args.branch}; open a PR manually — gh unavailable)`;
          }
        }
        return { branch: args.branch, commitSha, prUrl };
      } finally {
        await pexec('git', ['worktree', 'remove', '--force', wt], { cwd: repoRoot }).catch(() => undefined);
        await rm(wt, { recursive: true, force: true }).catch(() => undefined);
        // Dry-run leaves no trace: delete the local-only branch (nothing was pushed).
        if (opts.dryRun && branchCreated) {
          await pexec('git', ['branch', '-D', args.branch], { cwd: repoRoot }).catch(() => undefined);
        }
      }
    },
  };
}
