variable "name" {
  description = "Base name for the BFF Lambda + related resources (e.g. spectra-prod-prod-sandbox-bff)."
  type        = string
}

variable "api_id" {
  description = "API Gateway v2 (HTTP API) ID to attach /bff/* and /v1/* proxy routes to."
  type        = string
}

variable "api_execution_arn" {
  description = "execution_arn of the HTTP API (for the lambda invoke permission source_arn)."
  type        = string
}

variable "lambda_deploy_bucket" {
  description = "S3 bucket holding the packaged Lambda zip (the env's lambda_deploy bucket)."
  type        = string
}

variable "lambda_s3_key" {
  description = "S3 key of the packaged BFF Lambda zip (built from apps/local-edge BFF + serverless-http adapter)."
  type        = string
}

variable "public_origin" {
  description = "Same-origin base URL the browser reaches (the CloudFront domain), e.g. https://sandbox.example.com."
  type        = string
}

variable "auth0_domain" {
  description = "Auth0 tenant host, e.g. dev-xxx.us.auth0.com."
  type        = string
}

variable "auth0_audience" {
  description = "Auth0 API audience — must match the services' AUTH0_AUDIENCE."
  type        = string
}

variable "secret_arns" {
  description = "Secrets Manager ARNs the Lambda may read (Auth0 client secret + BFF session secret)."
  type        = list(string)
}

variable "tags" {
  description = "Resource tags."
  type        = map(string)
  default     = {}
}
