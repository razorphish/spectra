locals {
  # Production hostnames omit the `.<env>.sandbox.` middle (plan §8).
  public_api_host = "api.${var.base_domain}"
  staff_api_host  = "admin.api.${var.base_domain}"

  spectra_ui_host = "developers.${var.base_domain}"
  sandbox_ui_host = "sandbox.${var.base_domain}"
  admin_ui_host   = "admin.${var.base_domain}"

  resource_prefix = "${var.project_name}-prod-prod"
  bucket_prefix   = "prod-prod-${var.project_name}"

  uploads_bucket_name = "${local.bucket_prefix}-uploads"
  upload_queue_name   = "${local.resource_prefix}-uploads-events"

  ssm_idp_prefix = "/${var.project_name}/prod/idp"

  default_origins = [
    "https://${local.spectra_ui_host}",
    "https://${local.sandbox_ui_host}",
    "https://${local.admin_ui_host}",
  ]
  cors_allowed_origins = distinct(concat(local.default_origins, var.spa_origins))

  common_tags = {
    Project     = var.project_name
    MainEnv     = "prod"
    Environment = "prod"
  }
}
