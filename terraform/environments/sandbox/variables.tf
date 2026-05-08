variable "main_env" {
  description = "Spectra main env family (dev, qa, staging, hotfix)."
  type        = string

  validation {
    condition     = contains(["dev", "qa", "staging", "hotfix"], var.main_env)
    error_message = "main_env must be one of: dev, qa, staging, hotfix (sandbox root rejects prod)."
  }
}

variable "environment" {
  description = "Stage label (devNN, qaNN, stagingNN, hotfixNN)."
  type        = string

  validation {
    condition     = can(regex("^(dev|qa|staging|hotfix)[0-9]{2}$", var.environment))
    error_message = "environment must match (dev|qa|staging|hotfix)[0-9]{2}."
  }
}

variable "aws_region" {
  description = "Primary AWS region."
  type        = string
  default     = "us-west-2"
}

variable "project_name" {
  description = "Resource prefix."
  type        = string
  default     = "spectra"
}

variable "base_domain" {
  description = "Public DNS root (e.g. spectra.com)."
  type        = string
  default     = "spectra.com"
}

variable "neon_database_url" {
  description = "Pooled Neon connection string (sensitive)."
  type        = string
  sensitive   = true
}

variable "jwt_issuer" {
  description = "JWT issuer URL. Optional — placeholder is written when null."
  type        = string
  default     = null
}

variable "jwt_jwks_uri" {
  description = "JWKS URI exposed by the IdP. Optional."
  type        = string
  default     = null
}

variable "jwt_audience_public" {
  description = "Audience for the public API. Optional."
  type        = string
  default     = null
}

variable "jwt_audience_staff" {
  description = "Audience for the staff API. Optional."
  type        = string
  default     = null
}

variable "spa_origins" {
  description = "Additional CORS origins allowed by the uploads bucket / API."
  type        = list(string)
  default     = []
}

variable "uploads_kms_key_arn" {
  description = "Optional KMS key ARN for the uploads bucket."
  type        = string
  default     = null
}
