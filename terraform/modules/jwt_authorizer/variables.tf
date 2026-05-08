variable "api_id" {
  description = "API Gateway v2 API ID."
  type        = string
}

variable "name" {
  description = "Authorizer name (e.g. spectra-dev01-public-jwt)."
  type        = string
}

variable "jwt_issuer" {
  description = "JWT issuer URL the authorizer trusts."
  type        = string
}

variable "jwt_audiences" {
  description = "List of acceptable audiences for this authorizer."
  type        = list(string)
}
