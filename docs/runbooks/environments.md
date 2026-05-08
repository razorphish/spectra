# Spectra environments

## Branch → stage map

| Branch pattern | Main env | Stage label | GitHub Environment | Reviewer required? |
| --- | --- | --- | --- | --- |
| `dev[0-9]{2}` | `dev` | `dev01`, `dev02`, ... | `dev01`, `dev02`, ... | No |
| `qa[0-9]{2}`  | `qa`  | `qa01`, ... | `qa01`, ... | Optional |
| `staging[0-9]{2}` | `staging` | `staging01`, ... | `staging01`, ... | Yes |
| `hotfix[0-9]{2}` | `hotfix` | `hotfix01`, ... | `hotfix01`, ... | Optional |
| `main` (manual dispatch only) | `prod` | `prod` | `prod` | **Yes** |

Branch names that don't match are rejected by `spectra-detect-environment.yml`.

## Variables (organisation or repo `vars`)

| Name | Example | Purpose |
| --- | --- | --- |
| `BASE_DOMAIN` | `spectra.com` | Used to build hostnames (`api.<env>.sandbox.spectra.com`, etc.) |
| `PROJECT_NAME` | `spectra` | Resource prefix |
| `ORGANIZATION_NAME` | `acme` | Optional, surfaced in tags |
| `AWS_REGION` | `us-west-2` | Default region for Lambdas / S3 / API GW |
| `AWS_CERT_REGION` | `us-east-1` | ACM certs for CloudFront must live here |
| `NODE_VERSION` | `20.19.5` | Matches `.nvmrc` |

## Secrets per GitHub Environment

| Secret | Required? | Notes |
| --- | --- | --- |
| `AWS_ROLE_TO_ASSUME` | Preferred | OIDC role ARN for `aws-actions/configure-aws-credentials@v4` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Fallback | Only if OIDC isn't set up yet |
| `TF_STATE_BUCKET` | **Yes** | S3 bucket holding remote Terraform state |
| `TF_STATE_LOCK_TABLE` | Optional | DynamoDB lock table (recommended) |
| `NEON_DATABASE_URL` | **Yes** | Pooled Neon connection string |
| `DATABASE_DIRECT_URL` | Optional | Direct (non-pooler) Neon URL — preferred by `drizzle-kit migrate` |
| `JWT_ISSUER` | Yes (step 3+) | OIDC issuer URL for the IdP |
| `JWT_AUDIENCE_PUBLIC` | Yes (step 3+) | Audience for `api.*` |
| `JWT_AUDIENCE_STAFF` | Yes (step 3+) | Audience for `admin.api.*` |
| `JWT_JWKS_URI` | Optional | Some IdPs publish a separate JWKS URI |

## Spinning up a new sub-env (`devNN`)

1. Create a branch following the naming pattern (e.g. `dev03`).
2. In GitHub → Settings → Environments, create a Spectra env with the same
   name and add the secrets above. For `dev*`, grant access to the dev IAM
   role (one role per `main_env`).
3. Provision the matching Neon branch (Neon UI, CLI, or MCP). Copy the
   pooled URL into `NEON_DATABASE_URL` and the direct URL into
   `DATABASE_DIRECT_URL`.
4. Push to the branch — `spectra-deploy.yml` will detect, plan & apply
   Terraform, run migrations, build and deploy Lambdas, sync SPAs and run
   `verify-deployment.sh`.

## Tearing a sub-env down

Trigger `Spectra - Cleanup Sub-environment` (`spectra-cleanup-subenv.yml`)
from the Actions tab. Type the environment name twice. The job refuses to
target `prod`. Neon branches are not deleted automatically — drop them in
Neon's UI/MCP after the AWS resources are gone.

## Branch protection (configure once on GitHub)

- `main`: required checks `Spectra - CI / lint-test-build` (matrix expands to
  three checks), `Spectra - Terraform / terraform (plan)`. Require PR review
  from CODEOWNERS. Require linear history.
- `dev*` / `qa*` / `staging*`: same required checks; PR review optional for
  dev, recommended for qa/staging.
- Tags `v*` push from automation only.

## Required IAM (OIDC) roles

One role per `main_env` family, trusted to:

```
repo:<org>/spectra:ref:refs/heads/<pattern>
repo:<org>/spectra:environment:<env>
```

| Role | Trust pattern |
| --- | --- |
| `spectra-cicd-dev` | `refs/heads/dev*` and any `dev[0-9]{2}` environment |
| `spectra-cicd-qa` | `refs/heads/qa*`, `refs/heads/hotfix*` |
| `spectra-cicd-staging` | `refs/heads/staging*` |
| `spectra-cicd-prod` | `refs/heads/main` and `environment:prod` (with reviewer required) |
