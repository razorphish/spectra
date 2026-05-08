output "environment" {
  value       = var.environment
  description = "Always 'prod'."
}

output "public_api_id" {
  value       = module.public_api.api_id
  description = "API Gateway v2 ID for the public plane."
}

output "public_api_endpoint" {
  value       = module.public_api.api_endpoint
  description = "execute-api endpoint for the public plane."
}

output "staff_api_id" {
  value       = module.staff_api.api_id
  description = "API Gateway v2 ID for the staff plane."
}

output "staff_api_endpoint" {
  value       = module.staff_api.api_endpoint
  description = "execute-api endpoint for the staff plane."
}

output "public_authorizer_id" {
  value       = module.public_authorizer.authorizer_id
  description = "JWT authorizer ID protecting /v1/platform/*."
}

output "staff_authorizer_id" {
  value       = module.staff_authorizer.authorizer_id
  description = "JWT authorizer ID protecting /v1/admin/*."
}

output "uploads_bucket_name" {
  value       = module.uploads_bucket.bucket_name
  description = "Private uploads bucket name."
}

output "uploads_bucket_arn" {
  value       = module.uploads_bucket.bucket_arn
  description = "Private uploads bucket ARN."
}

output "upload_queue_url" {
  value       = module.upload_queue.queue_url
  description = "URL of the upload events SQS queue."
}

output "upload_queue_arn" {
  value       = module.upload_queue.queue_arn
  description = "ARN of the upload events SQS queue."
}

output "lambda_deploy_bucket" {
  value       = aws_s3_bucket.lambda_deploy.bucket
  description = "S3 bucket where CI uploads service zips."
}

output "ssm_parameter_prefix" {
  value       = local.ssm_idp_prefix
  description = "Root path of IdP SSM parameters."
}
