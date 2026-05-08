output "queue_arn" {
  value       = aws_sqs_queue.this.arn
  description = "ARN of the upload events queue."
}

output "queue_url" {
  value       = aws_sqs_queue.this.url
  description = "URL of the upload events queue."
}

output "queue_name" {
  value       = aws_sqs_queue.this.name
  description = "Name of the upload events queue."
}

output "dlq_arn" {
  value       = try(aws_sqs_queue.dlq[0].arn, null)
  description = "DLQ ARN (null when DLQ is disabled)."
}
