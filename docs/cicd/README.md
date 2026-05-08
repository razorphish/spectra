# Spectra CI/CD overview

Spectra deploys via GitHub Actions to AWS, with Neon PostgreSQL as the
database. Workflows live in [`.github/workflows/`](../../.github/workflows/)
and call the helper scripts under [`scripts/ci/`](../../scripts/ci/).

The full design lives in
`vital-woman-reset/.cursor/plans/DEVELOPER-API-PLATFORM-PLAN.md`. This file is
the operational quick-start.

## Branch → stage table

| Branch pattern        | Main env | Stage label    | Auto deploy?       | Hostnames (base = `${BASE_DOMAIN}`)              |
| --------------------- | -------- | -------------- | ------------------ | ------------------------------------------------ |
| `main`                | `prod`   | `prod`         | No (dispatch only) | `api.${base}`, `admin.api.${base}`, `developers.${base}` |
| `dev[0-9][0-9]`       | `dev`    | `dev01` …      | Yes                | `api.dev01.sandbox.${base}` …                    |
| `qa[0-9][0-9]`        | `qa`     | `qa01` …       | Yes                | `api.qa01.sandbox.${base}` …                     |
| `staging[0-9][0-9]`   | `staging`| `staging01` …  | Yes (env approval) | `api.staging01.sandbox.${base}` …                |
| `hotfix[0-9][0-9]`    | `hotfix` | `hotfix01` …   | Yes                | `api.hotfix01.sandbox.${base}` …                 |

Anything that doesn’t match the table fails [`spectra-detect-environment.yml`](../../.github/workflows/spectra-detect-environment.yml).

## Required GitHub configuration

### Repo-level **vars** (Settings → Secrets and variables → Actions → Variables)

| Name              | Example      | Notes                                                |
| ----------------- | ------------ | ---------------------------------------------------- |
| `BASE_DOMAIN`     | `spectra.com`| Public DNS root.                                     |
| `PROJECT_NAME`    | `spectra`    | Resource prefix.                                     |
| `ORGANIZATION_NAME` | `spectra`  | Used in tags / scope names (optional).               |
| `AWS_REGION`      | `us-west-2`  | Primary region.                                      |
| `AWS_CERT_REGION` | `us-east-1`  | ACM region for CloudFront (mandatory).               |
| `NODE_VERSION`    | `20.19.5`    | Should match [`.nvmrc`](../../.nvmrc).               |

### Repo-level **secrets** (fallback only)

| Name                  | Required | Notes                                  |
| --------------------- | -------- | -------------------------------------- |
| `TF_STATE_BUCKET`     | Yes      | S3 bucket holding Terraform state.     |
| `TF_STATE_LOCK_TABLE` | Optional | DynamoDB lock table.                   |

### GitHub **Environments** (one per stage label)

For each of `dev01`, `dev02`, …, `qa01`, `staging01`, `hotfix01`, `prod`:

| Secret                  | Required | Notes                                                  |
| ----------------------- | -------- | ------------------------------------------------------ |
| `AWS_ROLE_TO_ASSUME`    | Preferred| OIDC IAM role ARN; e.g. `arn:aws:iam::123:role/spectra-cicd-dev`. |
| `AWS_ACCESS_KEY_ID`     | Fallback | Only if OIDC isn’t in place yet.                       |
| `AWS_SECRET_ACCESS_KEY` | Fallback | Same.                                                  |
| `NEON_DATABASE_URL`     | Yes      | Pooled Neon connection string.                         |
| `DATABASE_DIRECT_URL`   | Recommended | Direct (non-pooler) URL for `drizzle-kit migrate`.  |
| `JWT_ISSUER`            | Step 3   | IdP issuer.                                            |
| `JWT_AUDIENCE_PUBLIC`   | Step 3   | Audience for the public API.                           |
| `JWT_AUDIENCE_STAFF`    | Step 3   | Audience for the staff API.                            |
| `JWT_JWKS_URI`          | Step 3   | JWKS URL exposed by the IdP.                           |

`prod` should require **reviewer approval** under environment protection rules.

### OIDC

Mint one IAM role per `main_env` (`spectra-cicd-dev`, `spectra-cicd-qa`,
`spectra-cicd-staging`, `spectra-cicd-prod`). Trust policy must accept GitHub’s
OIDC provider for `repo:<org>/spectra:ref:refs/heads/<branch-pattern>` *and*
`repo:<org>/spectra:environment:<stage>`. Once the roles exist, populate
`AWS_ROLE_TO_ASSUME` per environment and remove the static keys.

## Workflows

| File                                | Purpose                                                       |
| ----------------------------------- | ------------------------------------------------------------- |
| `spectra-ci.yml`                    | Required check on every PR/push. `nx affected` on PRs, `run-many --all` on push. |
| `spectra-detect-environment.yml`    | Reusable; maps branch → outputs (env, hostnames, buckets, TF state key). |
| `spectra-build-lambdas.yml`         | Reusable matrix: Nx build per Node service → zip + hash artifact. |
| `spectra-build-frontends.yml`       | Reusable matrix: Angular SPAs (per env config + API base URL injection). |
| `spectra-terraform.yml`             | Reusable: fmt + validate always; plan on PR; apply on push/dispatch. |
| `spectra-db-migrate.yml`            | Reusable: `drizzle-kit migrate` with the env’s direct Neon URL. |
| `spectra-deploy.yml`                | **Orchestrator**. detect → ci-gates → tf-apply → db-migrate → build-lambdas → deploy-lambdas → build-frontends → sync-spas → verify. |
| `spectra-cleanup-subenv.yml`        | Manual dispatch: destroy a sandbox sub-env (typed confirmation). |
| `spectra-rollback.yml`              | Manual dispatch: flip Lambda alias `live` to a prior S3 zip key. |
| `dependency-scan.yml`               | Trivy fs scan; soft on dev/qa PRs, required on `main`/`staging*`. |
| `spectra-build-{seq,quantum,corridor,ml-camp}.yml` | Polyglot placeholders (`if: false` until the runtimes ship). |

### Migrate ordering (per plan §521)

1. `terraform apply` ensures buckets, queues, IAM, and SSM are present.
2. `drizzle-kit migrate` brings Neon up to the new schema.
3. `deploy-lambdas` updates the Node runtime against the new schema.
4. `sync-spas` ships the matching frontend bundles.
5. `verify` smoke-tests `/v1/<segment>/health` and `/ready`.

### `scripts/ci` entrypoints

| Script                              | Used by                                              |
| ----------------------------------- | ---------------------------------------------------- |
| `pre-flight-validation.sh`          | Local dry-run before invoking deploys.               |
| `apply-terraform.sh`                | `spectra-terraform.yml` (init / plan / apply).       |
| `package-lambda.sh`                 | `spectra-build-lambdas.yml`.                          |
| `sync-spa.sh`                       | `spectra-deploy.yml` (sync-spas matrix).             |
| `run-migrations.sh`                 | `spectra-db-migrate.yml`.                             |
| `verify-deployment.sh`              | `spectra-deploy.yml` (verify).                        |
| `cleanup-subenv.sh`                 | `spectra-cleanup-subenv.yml`.                         |
| `rollback-lambda.sh`                | `spectra-rollback.yml`.                               |

Library helpers live under `scripts/ci/lib/`. Sourcing one transitively pulls
the rest (`common.sh` is the foundation).

## Branch protection (recommended)

For `main`, `staging*`, `qa*`, `dev*`:

- Require status checks before merging:
  - `Spectra - CI / lint-test-build (lint)`
  - `Spectra - CI / lint-test-build (test)`
  - `Spectra - CI / lint-test-build (build)`
  - `Spectra - Terraform / terraform` (when `action == plan`)
- Require linear history (optional).
- Require at least one approving review on `main` and `staging*`.
- Restrict who can push to `main`.

## Sub-environment lifecycle

- **Spin up `devNN`:** create the matching GitHub Environment with the secrets
  above, push the branch, then let `spectra-deploy.yml` create everything from
  scratch.
- **Tear down:** dispatch `spectra-cleanup-subenv.yml` with the env name typed
  twice (refuses to run on `prod`).

See [`docs/runbooks/`](../runbooks/) for incident playbooks.
