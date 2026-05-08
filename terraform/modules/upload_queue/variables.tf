variable "queue_name" {
  description = "SQS queue name (e.g. spectra-dev01-uploads-events)."
  type        = string
}

variable "bucket_id" {
  description = "S3 bucket ID (name) that emits the notifications."
  type        = string
}

variable "bucket_arn" {
  description = "S3 bucket ARN, used to scope the SQS policy."
  type        = string
}

variable "kms_master_key_id" {
  description = "Optional KMS key for SSE on the queue (use 'alias/aws/sqs' for the AWS-managed key)."
  type        = string
  default     = "alias/aws/sqs"
}

variable "visibility_timeout_seconds" {
  description = "SQS visibility timeout."
  type        = number
  default     = 300
}

variable "retention_seconds" {
  description = "SQS message retention."
  type        = number
  default     = 345600 # 4 days
}

variable "enable_dlq" {
  description = "Provision a DLQ and redrive policy."
  type        = bool
  default     = true
}

variable "dlq_retention_seconds" {
  description = "DLQ message retention."
  type        = number
  default     = 1209600 # 14 days
}

variable "max_receive_count" {
  description = "Max receives before a message moves to the DLQ."
  type        = number
  default     = 5
}

variable "tags" {
  description = "Resource tags."
  type        = map(string)
  default     = {}
}
