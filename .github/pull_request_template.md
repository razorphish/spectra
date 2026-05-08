## Summary

<!-- What changed and why? Link the relevant section of DEVELOPER-API-PLATFORM-PLAN.md if applicable. -->

## Affected workspaces

- [ ] `apps/spectra-ui` / `sandbox-ui` / `admin-ui`
- [ ] `apps/api-gateway`
- [ ] `apps/services/*`
- [ ] `packages/*`
- [ ] `terraform/`
- [ ] `.github/workflows` / `scripts/ci`

## Verification

- [ ] `npm run build` (root) green
- [ ] `npx nx affected -t lint,test,build` green
- [ ] Database migrations: N/A or generated via `npm run db:generate`
- [ ] Terraform: `terraform fmt -check && terraform validate`
- [ ] Sandbox deploy verified via `spectra-deploy.yml` (link the run)

## Rollback plan

<!-- For prod-eligible PRs, describe the rollback. Reference docs/runbooks/rollback.md if relevant. -->
