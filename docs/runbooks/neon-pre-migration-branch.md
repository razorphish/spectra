# Neon pre-migration branch runbook

Before any **destructive** Drizzle migration (drop column, type change, NOT
NULL backfill, …) we take a Neon branch so we can roll back instantly.

> Ad-hoc `psql` against production is forbidden. All schema changes go through
> Drizzle and the [migrate workflow](../cicd/README.md#migrate-ordering-per-plan-521).

## When required

- Every prod migration (mandatory).
- Staging migrations that touch tables containing real user data.
- Any migration whose down-path Drizzle cannot generate cleanly.

## Process

### A. Via Neon CLI (preferred, scripts-friendly)

```bash
# 1. Authenticate once: `neonctl auth`
PROJECT_ID="<from Neon project settings>"
PARENT_BRANCH_ID="<the env's primary branch>"
TS="$(date -u +%Y-%m-%dT%H-%MZ)"
neonctl branches create \
  --project-id "$PROJECT_ID" \
  --parent "$PARENT_BRANCH_ID" \
  --name "pre-migrate-$TS"
```

The branch is read/write but not used by any deployed env until you
explicitly promote it.

### B. Via Neon MCP / console

1. Open the project, select the env primary branch.
2. Click **Create branch from this branch**.
3. Name it `pre-migrate-<UTC timestamp>` and confirm.

## Hand-off to the deploy

1. Note the branch ID/name in the migration PR description.
2. Run [`spectra-deploy.yml`](../../.github/workflows/spectra-deploy.yml) (or
   `spectra-db-migrate.yml` if you’re migrating without a code deploy).
3. Verify with `npm run db:verify` that the env URL still points at the
   *primary* branch, not the snapshot.

## Cleanup

Once the deploy has been healthy for the agreed soak window (≥24h prod,
≥1h sandbox), delete the branch:

```bash
neonctl branches delete --project-id "$PROJECT_ID" --branch "pre-migrate-$TS"
```

If you needed it for [rollback](./rollback.md), promote it instead and
delete the old primary after another soak period.
