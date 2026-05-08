#!/usr/bin/env bash
# Roll a Spectra Lambda alias `live` back to a known artifact.
# Usage: ./scripts/ci/rollback-lambda.sh <main_env> <environment> <service> <s3_key>
#   - <s3_key> must point at a previously-uploaded zip in the lambda deploy bucket.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/common.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/aws-helpers.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/lambda-helpers.sh"

MAIN_ENV="${1:-}"
ENVIRONMENT="${2:-}"
SERVICE="${3:-}"
S3_KEY="${4:-}"

if [ -z "$MAIN_ENV" ] || [ -z "$ENVIRONMENT" ] || [ -z "$SERVICE" ] || [ -z "$S3_KEY" ]; then
  log_error "Usage: $0 <main_env> <environment> <service> <s3_key>"
  exit 1
fi

REGION="${AWS_REGION:-us-west-2}"
FUNCTION_NAME="$(lambda_function_name "$MAIN_ENV" "$ENVIRONMENT" "$SERVICE")"
BUCKET="$(lambda_deploy_bucket "$MAIN_ENV" "$ENVIRONMENT")"

if ! lambda_exists "$FUNCTION_NAME"; then
  log_error "Lambda $FUNCTION_NAME does not exist in $REGION"
  exit 1
fi

log_warn "Rolling back $FUNCTION_NAME -> s3://$BUCKET/$S3_KEY"
update_lambda_code_from_s3 "$FUNCTION_NAME" "$BUCKET" "$S3_KEY"

aws lambda wait function-updated \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION"

NEW_VERSION="$(aws lambda publish-version \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION" \
  --query 'Version' --output text)"

log_info "Published version $NEW_VERSION"

aws lambda update-alias \
  --function-name "$FUNCTION_NAME" \
  --name live \
  --function-version "$NEW_VERSION" \
  --region "$REGION" >/dev/null

log_success "Alias live -> $NEW_VERSION ($FUNCTION_NAME)"
