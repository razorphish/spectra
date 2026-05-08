variable "api_name" {
  description = "Name of the HTTP API (e.g. spectra-dev01-platform)."
  type        = string
}

variable "description" {
  description = "Description shown in the API Gateway console."
  type        = string
  default     = "Spectra HTTP API"
}

variable "path_segment" {
  description = "Path segment under /v1/* for this slice (platform or admin)."
  type        = string

  validation {
    condition     = contains(["platform", "admin"], var.path_segment)
    error_message = "path_segment must be either \"platform\" or \"admin\"."
  }
}

variable "authorizer_id" {
  description = "JWT authorizer ID to attach to the catch-all proxy route. null = open."
  type        = string
  default     = null
}

variable "cors_allowed_origins" {
  description = "Origins allowed by API Gateway CORS."
  type        = list(string)
  default     = ["*"]
}

variable "log_retention_days" {
  description = "CloudWatch retention for access logs."
  type        = number
  default     = 30
}

variable "throttling_burst_limit" {
  description = "Default route burst limit."
  type        = number
  default     = 200
}

variable "throttling_rate_limit" {
  description = "Default route steady-state rate limit (requests/sec)."
  type        = number
  default     = 100
}

variable "tags" {
  description = "Resource tags."
  type        = map(string)
  default     = {}
}
