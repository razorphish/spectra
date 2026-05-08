#!/usr/bin/env bash
# Destroy a sandbox sub-environment (dev*/qa*/hotfix*).
# Usage: ./scripts/ci/cleanup-subenv.sh <main_env> <environment>
# Refuses to touch production. Caller is responsible for confirmation.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/common.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/terraform-helpers.sh"

MAIN_ENV="${1:-}"
ENVIRONMENT="${2:-}"

validate_env_vars MAIN_ENV ENVIRONMENT TF_STATE_BUCKET

if [ "$MAIN_ENV" = "prod" ]; then
  log_error "cleanup-subenv refuses to run against prod"
  exit 1
fi
if [[ ! "$ENVIRONMENT" =~ ^(dev[0-9]{2}|qa[0-9]{2}|hotfix[0-9]{2}|staging[0-9]{2})$ ]]; then
  log_error "Refusing to destroy unknown environment label: $ENVIRONMENT"
  exit 1
fi

REGION="${AWS_REGION:-us-west-2}"
LOCK_TABLE="${TF_STATE_LOCK_TABLE:-}"
ROOT_DIR="terraform/environments/sandbox"
BACKEND_KEY="spectra/${MAIN_ENV}/${ENVIRONMENT}/terraform.tfstate"

pushd "$ROOT_DIR" >/dev/null
terraform_init_with_retry "$BACKEND_KEY" "$TF_STATE_BUCKET" "$REGION" "$LOCK_TABLE"

log_warn "Destroying $ENVIRONMENT (state key: $BACKEND_KEY)"
terraform destroy -auto-approve -no-color \
  -var="environment=${ENVIRONMENT}" \
  -var="main_env=${MAIN_ENV}" \
  -var="aws_region=${REGION}"

popd >/dev/null
log_success "Sub-environment $ENVIRONMENT destroyed"
