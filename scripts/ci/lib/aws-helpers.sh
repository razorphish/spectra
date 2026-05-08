#!/usr/bin/env bash
# AWS helpers for Spectra CI. Neon-first; no RDS/VPC helpers.
# Usage: source "$(dirname "${BASH_SOURCE[0]}")/lib/aws-helpers.sh"

set -euo pipefail

LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$LIB_DIR/common.sh"

_AWS_ACCOUNT_ID_CACHE=""

get_aws_account_id() {
  if [ -z "${_AWS_ACCOUNT_ID_CACHE:-}" ]; then
    _AWS_ACCOUNT_ID_CACHE="$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo '')"
    if [ -z "$_AWS_ACCOUNT_ID_CACHE" ]; then
      log_error "Failed to get AWS account ID"
      exit 1
    fi
  fi
  echo "$_AWS_ACCOUNT_ID_CACHE"
}

s3_bucket_exists() {
  local bucket="$1"
  aws s3api head-bucket --bucket "$bucket" >/dev/null 2>&1
}

ensure_s3_bucket() {
  local bucket="$1"
  local region="${AWS_REGION:-us-west-2}"
  if s3_bucket_exists "$bucket"; then
    log_info "S3 bucket already exists: $bucket"
    return 0
  fi
  log_info "Creating S3 bucket: $bucket ($region)"
  if [ "$region" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$bucket" --region "$region" >/dev/null
  else
    aws s3api create-bucket \
      --bucket "$bucket" \
      --region "$region" \
      --create-bucket-configuration "LocationConstraint=$region" >/dev/null
  fi
}

invalidate_cloudfront() {
  local distribution_id="$1"
  local paths="${2:-/*}"
  log_info "Invalidating CloudFront $distribution_id ($paths)"
  aws cloudfront create-invalidation \
    --distribution-id "$distribution_id" \
    --paths "$paths" >/dev/null
}

lambda_exists() {
  local function_name="$1"
  local region="${AWS_REGION:-us-west-2}"
  aws lambda get-function --function-name "$function_name" --region "$region" >/dev/null 2>&1
}

update_lambda_code_from_s3() {
  local function_name="$1"
  local bucket="$2"
  local key="$3"
  local region="${AWS_REGION:-us-west-2}"
  log_info "Updating Lambda $function_name from s3://$bucket/$key"
  aws lambda update-function-code \
    --function-name "$function_name" \
    --s3-bucket "$bucket" \
    --s3-key "$key" \
    --region "$region" >/dev/null
}
