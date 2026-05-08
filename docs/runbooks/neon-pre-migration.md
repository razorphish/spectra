# Neon pre-migration branch

We rely on Neon's branching for safe schema changes. This runbook is the
companion to [`rollback.md`](./rollback.md).

## When to take a pre-migration branch

Always, when **any** of the following are true:

- the migration drops a column / table / index
- the migration changes a column type
- the migration runs a backfill or `UPDATE`/`DELETE`
- the deploy is going to staging or prod

For additive changes (new tables, new columns with defaults), a branch is
optional but cheap.

## How to take it (manual)

```bash
neon branches create \
  --project-id <PROJECT_ID> \
  --name "pre-<release>-<env>" \
  --parent main
```

Or, in the Neon console, **Branches → New branch from primary**.

Note the new branch's pooled and direct connection strings — they are *only*
needed if you decide to restore from this branch later.

## How to take it (Cursor / MCP)

If using the Neon MCP integration, ask your assistant to:

1. List projects.
2. Branch the active environment branch with name `pre-<release>-<env>`.
3. Print the new branch ID and timestamps for the runbook.

Always paste the branch name + creation timestamp into the deploy PR or
incident channel — that is the audit trail used by `rollback.md`.

## Cleanup policy

- **dev / qa / hotfix:** delete the pre-migration branch after **7 days**.
- **staging:** keep until the next staging deploy succeeds (and at least 7
  days).
- **prod:** keep at least 30 days; coordinate deletion with the platform
  owner.

CI does not auto-create or auto-delete Neon branches. The intentional
manual step keeps a human in the loop before destructive migrations.
