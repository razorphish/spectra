variable "main_env" {
  description = "Always 'prod' for the production root."
  type        = string
  default     = "prod"

  validation {
    condition     = var.main_env == "prod"
    error_message = "production root only accepts main_env = prod."
  }
}

variable "environment" {
  description = "Always 'prod' for the production root."
  type        = string
  default     = "prod"

  validation {
    condition     = var.environment == "prod"
    error_message = "production root only accepts environment = prod."
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
  description = "Pooled Neon connection string for prod (sensitive)."
  type        = string
  sensitive   = true
}

variable "jwt_issuer" {
  description = "JWT issuer URL."
  type        = string
  default     = null
}

variable "jwt_jwks_uri" {
  description = "JWKS URI."
  type        = string
  default     = null
}

variable "jwt_audience_public" {
  description = "Audience for the public API."
  type        = string
  default     = null
}

variable "jwt_audience_staff" {
  description = "Audience for the staff API."
  type        = string
  default     = null
}

variable "spa_origins" {
  description = "Additional origins permitted via CORS."
  type        = list(string)
  default     = []
}

variable "uploads_kms_key_arn" {
  description = "KMS key ARN for uploads bucket SSE-KMS. Highly recommended in prod."
  type        = string
  default     = null
}
