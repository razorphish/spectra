######################################################################
# IdP / SSM (Step 3)
######################################################################

module "idp" {
  source = "../../modules/ssm_idp"

  parameter_prefix    = local.ssm_idp_prefix
  jwt_issuer          = var.jwt_issuer
  jwt_jwks_uri        = var.jwt_jwks_uri
  jwt_audience_public = var.jwt_audience_public
  jwt_audience_staff  = var.jwt_audience_staff
  tags                = local.common_tags
}

######################################################################
# HTTP API + JWT authorizers (Step 3)
######################################################################

module "public_api" {
  source = "../../modules/api_http"

  api_name               = "${local.resource_prefix}-platform"
  description            = "Spectra public control plane (prod)"
  path_segment           = "platform"
  authorizer_id          = var.jwt_issuer != null ? module.public_authorizer.authorizer_id : null
  cors_allowed_origins   = local.cors_allowed_origins
  log_retention_days     = 90
  throttling_burst_limit = 5000
  throttling_rate_limit  = 2000
  tags                   = local.common_tags
}

module "public_authorizer" {
  source = "../../modules/jwt_authorizer"

  api_id        = module.public_api.api_id
  name          = "${local.resource_prefix}-public-jwt"
  jwt_issuer    = coalesce(var.jwt_issuer, "https://placeholder.invalid")
  jwt_audiences = compact([coalesce(var.jwt_audience_public, "spectra-public-placeholder")])
}

module "staff_api" {
  source = "../../modules/api_http"

  api_name               = "${local.resource_prefix}-admin"
  description            = "Spectra staff admin plane (prod)"
  path_segment           = "admin"
  authorizer_id          = var.jwt_issuer != null ? module.staff_authorizer.authorizer_id : null
  cors_allowed_origins   = local.cors_allowed_origins
  log_retention_days     = 90
  throttling_burst_limit = 1000
  throttling_rate_limit  = 200
  tags                   = local.common_tags
}

module "staff_authorizer" {
  source = "../../modules/jwt_authorizer"

  api_id        = module.staff_api.api_id
  name          = "${local.resource_prefix}-staff-jwt"
  jwt_issuer    = coalesce(var.jwt_issuer, "https://placeholder.invalid")
  jwt_audiences = compact([coalesce(var.jwt_audience_staff, "spectra-staff-placeholder")])
}

######################################################################
# Uploads (Step 4)
######################################################################

module "uploads_bucket" {
  source = "../../modules/uploads_bucket"

  bucket_name                    = local.uploads_bucket_name
  kms_key_arn                    = var.uploads_kms_key_arn
  enable_versioning              = true
  cors_allowed_origins           = local.cors_allowed_origins
  expire_incomplete_uploads_days = 7
  tags                           = local.common_tags
}

module "upload_queue" {
  source = "../../modules/upload_queue"

  queue_name                 = local.upload_queue_name
  bucket_id                  = module.uploads_bucket.bucket_id
  bucket_arn                 = module.uploads_bucket.bucket_arn
  visibility_timeout_seconds = 600
  tags                       = local.common_tags
}

resource "aws_ssm_parameter" "uploads_bucket_name" {
  name  = "/${var.project_name}/prod/uploads/bucket_name"
  type  = "String"
  value = module.uploads_bucket.bucket_name
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "uploads_queue_url" {
  name  = "/${var.project_name}/prod/uploads/queue_url"
  type  = "String"
  value = module.upload_queue.queue_url
  tags  = local.common_tags
}

######################################################################
# Lambda deploy bucket
######################################################################

resource "aws_s3_bucket" "lambda_deploy" {
  bucket = "${local.bucket_prefix}-lambda-deployments"
  tags   = local.common_tags
}

resource "aws_s3_bucket_public_access_block" "lambda_deploy" {
  bucket                  = aws_s3_bucket.lambda_deploy.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "lambda_deploy" {
  bucket = aws_s3_bucket.lambda_deploy.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "lambda_deploy" {
  bucket = aws_s3_bucket.lambda_deploy.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "lambda_deploy" {
  bucket = aws_s3_bucket.lambda_deploy.id

  rule {
    id     = "expire-noncurrent"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}
