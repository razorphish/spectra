output "bucket_name" {
  value       = aws_s3_bucket.this.bucket
  description = "Name of the uploads bucket."
}

output "bucket_arn" {
  value       = aws_s3_bucket.this.arn
  description = "ARN of the uploads bucket."
}

output "bucket_id" {
  value       = aws_s3_bucket.this.id
  description = "ID of the uploads bucket (same as name)."
}

output "bucket_regional_domain_name" {
  value       = aws_s3_bucket.this.bucket_regional_domain_name
  description = "Regional domain name (used for presigned URL hosts)."
}
