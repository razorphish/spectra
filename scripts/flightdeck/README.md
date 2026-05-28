# Spectra flightdeck — direct deploy scripts

Direct (laptop -> AWS) deploy scripts for Spectra's active deployable assets.
They mirror the flow of [`.github/workflows/spectra-deploy.yml`](../../.github/workflows/spectra-deploy.yml)
but bypass GitHub Actions for fast local iteration. Every script consumes
helpers under [`scripts/ci/`](../ci/) so behavior stays in lockstep with CI.

> CI is still the source of truth, especially for `prod`. These scripts are
> for tightening the dev/qa/staging feedback loop. Direct deploys to `prod`
> require an explicit `FLIGHTDECK_ALLOW_PROD=1`.

## When to use

| Situation                                               | Use this folder?                  |
| ------------------------------------------------------- | --------------------------------- |
| Iterating on `aviate-api` against `dev01`               | Yes — `deploy-aviate-api-direct.sh dev01` |
| Spinning up a brand new `dev02` env from scratch        | Use CI, then come back here for hot-fixes |
| Fixing a Terraform drift before opening a PR            | `deploy-infra-direct.sh dev01` (plan first) |
| Releasing to `prod`                                     | Use CI (`workflow_dispatch` on `main`) |
| Reproducing a CI failure locally                        | Yes — same scripts CI runs        |

## Prereqs

- Bash 4+ (CI uses `set -euo pipefail` everywhere; scripts inherit it)
- Node matching [`.nvmrc`](../../.nvmrc) (currently 20.19.5) + `npm`
- `aws` CLI v2 with credentials available (`aws sts get-caller-identity` must
  succeed). OIDC isn't an option from a laptop — use `aws-vault`,
  `aws sso login`, or `AWS_PROFILE=<spectra-dev>` etc.
- `terraform` (only for `deploy-infra-direct.sh`)
- `jq`, `curl`, `zip`, `sha256sum` — checked at script start via
  [`require_command`](../ci/lib/common.sh).

## Required env

Either source a `.env` at repo root or export before running:

| Var                       | Used by                          | Notes |
| ------------------------- | -------------------------------- | --- |
| `AWS_PROFILE` *or* `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` | all                              | Whatever lets `aws sts get-caller-identity` pass. |
| `AWS_REGION`              | all                              | Defaults to `us-west-2`. |
| `BASE_DOMAIN`             | all                              | Defaults to `spectra.com`. |
| `PROJECT_NAME`            | all                              | Defaults to `spectra`. |
| `TF_STATE_BUCKET`         | `deploy-infra-direct.sh`         | S3 bucket holding Terraform state (same as CI). |
| `TF_VAR_neon_database_url`| `deploy-infra-direct.sh`         | Sensitive Neon URL passed to Terraform. |
| `TF_STATE_LOCK_TABLE`     | `deploy-infra-direct.sh`         | Optional DynamoDB lock table. |
| `NEON_DATABASE_URL`       | `deploy-migrations-direct.sh`    | Pooled Neon URL (used as `DATABASE_URL`). |
| `DATABASE_DIRECT_URL`     | `deploy-migrations-direct.sh`    | Preferred direct (non-pooler) URL for `drizzle-kit migrate`. |
| `FLIGHTDECK_ALLOW_PROD`   | every script                     | Must equal `1` to deploy to `prod`. |

## Branch -> stage table

Mirrors [`docs/cicd/README.md`](../../docs/cicd/README.md). The first arg
to every script is the **stage label**; nothing inside flightdeck looks at
your git branch.

| Stage label         | Main env  | Hostnames (base = `${BASE_DOMAIN}`)                  |
| ------------------- | --------- | ---------------------------------------------------- |
| `prod`              | `prod`    | `api.${base}`, `admin.api.${base}`, `developers.${base}` |
| `dev[0-9][0-9]`     | `dev`     | `api.dev01.sandbox.${base}` ...                      |
| `qa[0-9][0-9]`      | `qa`      | `api.qa01.sandbox.${base}` ...                       |
| `staging[0-9][0-9]` | `staging` | `api.staging01.sandbox.${base}` ...                  |
| `hotfix[0-9][0-9]`  | `hotfix`  | `api.hotfix01.sandbox.${base}` ...                   |

## Asset table

| Asset         | Script                              | What it does                                                |
| ------------- | ----------------------------------- | ----------------------------------------------------------- |
| `aviate-api`  | `deploy-aviate-api-direct.sh`       | Build + zip + S3 + Lambda alias flip + `/v1/platform/health` |
| `admin-ui-api`| `deploy-admin-ui-api-direct.sh`     | Same, on the admin plane                                    |
| `spectra-ui`  | `deploy-spectra-ui-direct.sh`       | nx build + `s3 sync` + CloudFront invalidate                |
| `sandbox-ui`  | `deploy-sandbox-ui-direct.sh`       | Same                                                        |
| `admin-ui`    | `deploy-admin-ui-direct.sh`         | Same                                                        |
| infra         | `deploy-infra-direct.sh`            | Terraform plan/apply via `scripts/ci/apply-terraform.sh`    |
| DB            | `deploy-migrations-direct.sh`       | `drizzle-kit migrate` + `db:verify`                         |
| everything    | `deploy-all-direct.sh`              | Run them in CI's order (with `--skip-*` / `--only` flags)   |

## Polyglot services not yet wired

| Service        | Runtime  | CI workflow status                                               |
| -------------- | -------- | ---------------------------------------------------------------- |
| `seq-api`      | .NET 8   | [`spectra-build-seq.yml`](../../.github/workflows/spectra-build-seq.yml) (`if: false`); local: `nx serve seq-api` |
| `quantum-api`  | Python   | [`spectra-build-quantum.yml`](../../.github/workflows/spectra-build-quantum.yml) (`if: false`); local: `nx serve quantum-api` |
| `corridor-api` | Go       | [`spectra-build-corridor.yml`](../../.github/workflows/spectra-build-corridor.yml) (`if: false`); local: `nx serve corridor-api` |
| `ml-camp`      | Docker / Batch | [`spectra-build-ml-camp.yml`](../../.github/workflows/spectra-build-ml-camp.yml) (`if: false`) |

A direct script will land alongside each runtime when it ships. For now run
those placeholder workflows manually if you need to test the build glue.

## Examples

```bash
# Iterate on aviate-api against dev01
./scripts/flightdeck/deploy-aviate-api-direct.sh dev01

# Push spectra-ui to qa02
./scripts/flightdeck/deploy-spectra-ui-direct.sh qa02

# Apply terraform to a brand new sandbox sub-env
TF_STATE_BUCKET=spectra-tfstate-prod \
TF_VAR_neon_database_url='postgres://...' \
  ./scripts/flightdeck/deploy-infra-direct.sh dev03

# Run the whole CI flow against staging01, but skip the infra step
./scripts/flightdeck/deploy-all-direct.sh staging01 --skip-infra

# Only deploy aviate-api + spectra-ui to dev01
./scripts/flightdeck/deploy-all-direct.sh dev01 --only=aviate-api,spectra-ui

# Hotfix prod (CI is preferred, but if you absolutely must)
FLIGHTDECK_ALLOW_PROD=1 ./scripts/flightdeck/deploy-aviate-api-direct.sh prod
```

## Rollback

Every Lambda direct script ends by printing the exact rollback command using
[`scripts/ci/rollback-lambda.sh`](../ci/rollback-lambda.sh) and the S3 key it
just uploaded. See the full procedure in
[`docs/runbooks/rollback.md`](../../docs/runbooks/rollback.md).

## Files

```
scripts/flightdeck/
├── README.md                          # this file
├── _lib/
│   └── flightdeck.sh                  # detect_spectra_env + AWS helpers
├── deploy-aviate-api-direct.sh        # active Node Lambda
├── deploy-admin-ui-api-direct.sh      # active Node Lambda
├── deploy-spectra-ui-direct.sh        # SPA
├── deploy-sandbox-ui-direct.sh        # SPA
├── deploy-admin-ui-direct.sh          # SPA
├── deploy-infra-direct.sh             # terraform init/plan/apply for the env
├── deploy-migrations-direct.sh        # drizzle-kit migrate via DATABASE_DIRECT_URL
└── deploy-all-direct.sh               # orchestrator: infra -> migrations -> lambdas -> spas -> verify
```
