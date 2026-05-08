# Spectra infrastructure (Terraform)

Greenfield Spectra IaC. Two roots, separate state per stage:

```
terraform/
├── environments/
│   ├── sandbox/        # dev*, qa*, staging*, hotfix* (var.environment, var.main_env)
│   └── production/     # prod
└── modules/
    ├── api_http/         # HTTP API (API Gateway v2) + routes + custom domain wiring
    ├── jwt_authorizer/   # Reusable JWT authorizer (public vs staff)
    ├── ssm_idp/          # SSM parameters (issuer, audiences, JWKS URI)
    ├── uploads_bucket/   # Private S3 bucket for object uploads
    └── upload_queue/     # SQS + S3 notification (s3:ObjectCreated:*)
```

**Backend key per stage:** `spectra/${main_env}/${environment}/terraform.tfstate`
(see [`docs/cicd/README.md`](../docs/cicd/README.md)).

Sensitive inputs flow in via `TF_VAR_*` from GitHub Environment secrets:

| Variable                 | Source                          |
| ------------------------ | ------------------------------- |
| `TF_VAR_neon_database_url` | env secret `NEON_DATABASE_URL`  |
| `TF_VAR_jwt_issuer`        | env secret `JWT_ISSUER`         |
| `TF_VAR_jwt_audience_public` | env secret `JWT_AUDIENCE_PUBLIC` |
| `TF_VAR_jwt_audience_staff`  | env secret `JWT_AUDIENCE_STAFF`  |
| `TF_VAR_jwt_jwks_uri`        | env secret `JWT_JWKS_URI`        |

The orchestrator (`spectra-deploy.yml`) pins the GitHub Environment to the
detected stage label, so prod secrets never leak into a `dev*` job.
