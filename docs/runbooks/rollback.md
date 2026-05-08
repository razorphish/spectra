# Rollback runbook

Spectra rolls back **code** by pointing the Lambda alias `live` at a previous
zip; **schema** rollbacks use a Neon branch / point-in-time restore. SPA
content is rolled back by re-shipping the prior CloudFront origin contents.

## When to roll back

- `verify` job fails after deploy and the issue isn’t a transient outage.
- Production paging alarm fires and the regression is tied to the most recent
  deploy.
- Anomalous error rate or latency spike on `/v1/platform/*` or `/v1/admin/*`
  immediately after a deploy.

## 1. Roll back the Lambdas

1. Find the previous good `backend_hash` (and S3 key) from a successful run of
   `spectra-deploy.yml`. The hash + key are written to the deploy job summary.
2. Dispatch [`spectra-rollback.yml`](../../.github/workflows/spectra-rollback.yml):
   - `environment` — stage label (e.g. `dev01`, `prod`).
   - `service` — name of the misbehaving service (e.g. `aviate-api`).
   - `target_s3_key` — `deployments/<service>/<env>/<service>-<ts>-<hash>.zip`.
3. Watch the workflow for `Alias live -> v<n>`.

`scripts/ci/rollback-lambda.sh` does the same thing locally if you prefer.

The deploy bucket retains the last N zips (configurable via lifecycle policy
in the `lambda_deploy_bucket` module). Hashes from the previous five runs are
always safe choices.

## 2. Roll back the database

Spectra always takes a **Neon branch** before destructive migrations (see
[`neon-pre-migration-branch.md`](./neon-pre-migration-branch.md)). To roll back:

1. From the [Neon console](https://console.neon.tech/) for the project, locate
   the branch (e.g. `pre-migrate-2026-05-07T17-22Z`).
2. Promote it back as the primary branch for the env. The pooled URL stays the
   same; the underlying compute now points at the snapshot.
3. Re-run `spectra-db-migrate.yml` *only if* the new Lambda needs additional
   migrations beyond the rollback target.

If a Neon branch wasn’t taken (older deploys or manual changes), use Neon’s
**point-in-time restore** in the console:

1. Select the env database.
2. Choose “Restore point” and pick a timestamp slightly before the offending
   migration.
3. Open a one-off PR to revert the schema in `packages/database/drizzle/` and
   merge after the env is healthy.

## 3. Roll back the SPA

If a frontend regression slipped through, redeploy the previous artifact:

1. From the matching [`spectra-deploy.yml`](../../.github/workflows/spectra-deploy.yml)
   run, download the `frontend-<env>-<app>` artifact for the last good build.
2. `aws s3 sync` it back into the SPA bucket and force a CloudFront
   invalidation:
   ```bash
   ./scripts/ci/sync-spa.sh <app> <bucket> <distribution-id>
   FORCE_INVALIDATE=true ./scripts/ci/sync-spa.sh <app> <bucket> <distribution-id>
   ```
3. If the artifact is older than the GitHub Actions retention window, build
   manually with `npx nx build <app> --configuration=<env>` and run the same
   sync.

## 4. Confirm health

After the rollback steps:

```bash
./scripts/ci/verify-deployment.sh \
  https://api.<env>.sandbox.<base>.com \
  https://admin.api.<env>.sandbox.<base>.com
```

Document the incident in the on-call channel with: timeline, blast radius,
rollback target hash/branch, follow-ups.
