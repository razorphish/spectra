#!/usr/bin/env bash
# Run terraform init/plan/apply for a Spectra environment workspace.
# Usage: ./scripts/ci/apply-terraform.sh <main_env> <environment> [action]
#   action = plan|apply (default apply)
#
# Required env:
#   TF_STATE_BUCKET           - S3 bucket holding Terraform state
#   TF_VAR_neon_database_url  - sensitive Neon URL passed straight through
# Optional:
#   TF_STATE_LOCK_TABLE       - DynamoDB lock table
#   AWS_REGION                - default us-west-2

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/common.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/terraform-helpers.sh"

MAIN_ENV="${1:-}"
ENVIRONMENT="${2:-}"
ACTION="${3:-apply}"

validate_env_vars MAIN_ENV ENVIRONMENT TF_STATE_BUCKET

REGION="${AWS_REGION:-us-west-2}"
LOCK_TABLE="${TF_STATE_LOCK_TABLE:-}"

# Pick the env-specific Terraform root (sandbox holds dev/qa/staging, prod is its own).
case "$MAIN_ENV" in
  prod) WORKSPACE="production" ;;
  *)    WORKSPACE="sandbox" ;;
esac

ROOT_DIR="terraform/environments/${WORKSPACE}"
if [ ! -d "$ROOT_DIR" ]; then
  log_error "Terraform root not found: $ROOT_DIR"
  exit 1
fi

BACKEND_KEY="spectra/${MAIN_ENV}/${ENVIRONMENT}/terraform.tfstate"

pushd "$ROOT_DIR" >/dev/null

terraform_init_with_retry "$BACKEND_KEY" "$TF_STATE_BUCKET" "$REGION" "$LOCK_TABLE"
terraform validate -no-color

terraform_plan tfplan \
  -var="environment=${ENVIRONMENT}" \
  -var="main_env=${MAIN_ENV}" \
  -var="aws_region=${REGION}"

# Render a human-readable plan for PR comments / step summaries.
terraform show -no-color tfplan > tfplan.txt 2>/dev/null || true

if [ "$ACTION" = "plan" ]; then
  log_info "Plan-only run; skipping apply"
  popd >/dev/null
  exit 0
fi

terraform_apply tfplan
popd >/dev/null
log_success "Terraform $ACTION complete: $WORKSPACE / $ENVIRONMENT"
