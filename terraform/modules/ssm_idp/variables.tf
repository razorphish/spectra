variable "parameter_prefix" {
  description = "SSM parameter prefix (e.g. /spectra/dev01/idp)."
  type        = string
}

variable "jwt_issuer" {
  description = "JWT issuer URL."
  type        = string
  default     = null
}

variable "jwt_jwks_uri" {
  description = "JWKS URI exposed by the IdP."
  type        = string
  default     = null
}

variable "jwt_audience_public" {
  description = "JWT audience claim required for the public API."
  type        = string
  default     = null
}

variable "jwt_audience_staff" {
  description = "JWT audience claim required for the staff API."
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags applied to each SSM parameter."
  type        = map(string)
  default     = {}
}
