# module: bff_lambda (SCAFFOLD)

Backend-For-Frontend token-handler Lambda for `sandbox-ui`. See
`docs/plans/sandbox-ui-bff.md` for the full design.

**Status: scaffold — not wired into any environment, not applied.** It matches the repo's
module conventions but depends on prerequisites that don't exist in this Terraform yet.

## Blocked-on prerequisites

1. **CloudFront same-origin distribution** (does not exist yet). The session cookie only works
   if the SPA, `/bff/*`, and `/v1/*` share one origin. Add a CloudFront distribution whose
   behaviors route `/bff/*` and `/v1/*` to the HTTP API (this module's routes) and `/*` to the
   SPA's S3 origin. Without it, this module is not usable end-to-end.
2. **Real API integrations.** `modules/api_http` still uses MOCK integrations. The BFF forwards
   a Bearer to the services, so those must be AWS_PROXY (real) first.
3. **Lambda package.** A build step must package the BFF (the `apps/local-edge` BFF handlers +
   a `serverless-http` adapter exporting `main.handler`) into the zip at `var.lambda_s3_key` in
   the env's `lambda_deploy` bucket.
4. **Secrets.** Create Secrets Manager entries for the Auth0 confidential client secret and the
   BFF session secret; pass their ARNs as `var.secret_arns`. The Lambda reads them at cold start.

## Example wiring (once prerequisites exist)

```hcl
module "sandbox_bff" {
  source               = "../../modules/bff_lambda"
  name                 = "${local.resource_prefix}-sandbox-bff"
  api_id               = module.public_api.api_id
  api_execution_arn    = module.public_api.execution_arn
  lambda_deploy_bucket = aws_s3_bucket.lambda_deploy.id
  lambda_s3_key        = "bff/sandbox-bff.zip"
  public_origin        = "https://${local.sandbox_ui_host}"
  auth0_domain         = var.auth0_domain
  auth0_audience       = var.auth0_audience
  secret_arns          = [aws_secretsmanager_secret.auth0_bff.arn, aws_secretsmanager_secret.bff_session.arn]
  tags                 = local.common_tags
}
```
