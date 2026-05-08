# Spinning up a new sub-environment

Creates a new sandbox stage (`devNN`, `qaNN`, `staging0N`, `hotfix0N`).

## 1. Pick the label

Find the next free number for the family:

| Family   | Existing labels                | Next free |
| -------- | ------------------------------ | --------- |
| dev      | (check Settings → Environments) | `devNN`   |
| qa       | …                              | `qaNN`    |
| staging  | …                              | `stagingNN` |
| hotfix   | …                              | `hotfixNN` |

The label must match `^(dev|qa|staging|hotfix)[0-9]{2}$` or
`spectra-detect-environment.yml` will reject the branch.

## 2. Provision Neon

1. In the Neon project, create a branch from the family parent:
   - dev → from `dev-template` (or last good `devNN`)
   - qa  → from `qa-template`
   - …
2. Copy the **pooled** connection string → environment secret
   `NEON_DATABASE_URL`.
3. Copy the **direct** (non-pooler) string → `DATABASE_DIRECT_URL`.

## 3. Create the GitHub Environment

Settings → Environments → **New environment** → name it exactly as the label.

Required secrets (see also [docs/cicd/README.md](../cicd/README.md)):

- `AWS_ROLE_TO_ASSUME` (preferred) or `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
- `NEON_DATABASE_URL`
- `DATABASE_DIRECT_URL`
- `JWT_ISSUER`, `JWT_AUDIENCE_PUBLIC`, `JWT_AUDIENCE_STAFF`, `JWT_JWKS_URI` (step 3+)

For staging/prod families, enable **Required reviewers**.

## 4. Update OIDC trust policy (one-time per family)

Add the new environment to the role’s trust policy condition:

```json
{
  "StringLike": {
    "token.actions.githubusercontent.com:sub": [
      "repo:<org>/spectra:environment:devNN",
      "repo:<org>/spectra:ref:refs/heads/devNN"
    ]
  }
}
```

(Only required when adding a new label that isn’t covered by a glob.)

## 5. Cut the branch and push

```bash
git switch -c devNN
git push -u origin devNN
```

That triggers `spectra-deploy.yml`, which provisions the AWS resources via
Terraform (state key `spectra/dev/devNN/terraform.tfstate`), runs the
migrations, deploys the lambdas, syncs the SPAs, and verifies the URLs
listed by the detect workflow.

## 6. Smoke test

```bash
./scripts/ci/verify-deployment.sh \
  https://api.devNN.sandbox.<base-domain> \
  https://admin.api.devNN.sandbox.<base-domain>
```

If anything fails, fix on the branch and re-push (`spectra-deploy.yml` is
concurrency-grouped per branch, so old runs are cancelled automatically).

## 7. Tear down when done

Dispatch [`spectra-cleanup-subenv.yml`](../../.github/workflows/spectra-cleanup-subenv.yml)
with the label typed twice. Then delete the GitHub Environment and the Neon
branch.
