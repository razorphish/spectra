variable "bucket_name" {
  description = "Globally-unique S3 bucket name for uploads."
  type        = string
}

variable "kms_key_arn" {
  description = "Optional KMS CMK ARN; when null SSE-S3 (AES256) is used."
  type        = string
  default     = null
}

variable "enable_versioning" {
  description = "Whether to enable S3 versioning on the uploads bucket."
  type        = bool
  default     = true
}

variable "cors_allowed_origins" {
  description = "Origins permitted to issue presigned PUTs (e.g. SPA hosts)."
  type        = list(string)
  default     = []
}

variable "expire_incomplete_uploads_days" {
  description = "Days before incomplete multipart uploads are aborted (0 disables)."
  type        = number
  default     = 7
}

variable "tags" {
  description = "Tags applied to the bucket."
  type        = map(string)
  default     = {}
}
