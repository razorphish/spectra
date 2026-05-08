locals {
  # Hostnames per DEVELOPER-API-PLATFORM-PLAN.md §8.
  host_suffix = "${var.environment}.sandbox.${var.base_domain}"

  public_api_host = "api.${local.host_suffix}"
  staff_api_host  = "admin.api.${local.host_suffix}"

  spectra_ui_host = "developers.${local.host_suffix}"
  sandbox_ui_host = "sandbox.${local.host_suffix}"
  admin_ui_host   = "admin.${local.host_suffix}"

  # Resource naming.
  resource_prefix = "${var.project_name}-${var.main_env}-${var.environment}"
  bucket_prefix   = "${var.main_env}-${var.environment}-${var.project_name}"

  uploads_bucket_name = "${local.bucket_prefix}-uploads"
  upload_queue_name   = "${local.resource_prefix}-uploads-events"

  ssm_idp_prefix = "/${var.project_name}/${var.environment}/idp"

  # SPA origins permitted to PUT to the uploads bucket / call the APIs.
  default_origins = [
    "https://${local.spectra_ui_host}",
    "https://${local.sandbox_ui_host}",
    "https://${local.admin_ui_host}",
  ]
  cors_allowed_origins = distinct(concat(local.default_origins, var.spa_origins))

  common_tags = {
    Project     = var.project_name
    MainEnv     = var.main_env
    Environment = var.environment
  }
}
