#!/usr/bin/env bash
# scripts/flightdeck/deploy-infra-direct.sh
#
# Run terraform init/plan/apply for an env via scripts/ci/apply-terraform.sh.
# Prod is refused unless FLIGHTDECK_ALLOW_PROD=1 (the wrapped script picks
# the production/ vs sandbox/ root automatically based on MAIN_ENV).
#
# Usage:  ./scripts/flightdeck/deploy-infra-direct.sh <env> [main_env] [plan|apply]
# Env:
#   TF_STATE_BUCKET           (required)
#   TF_VAR_neon_database_url  (required)
#   TF_STATE_LOCK_TABLE       (optional)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/../ci/lib/common.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/../ci/lib/aws-helpers.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_lib/flightdeck.sh"

ACTION="apply"
if [[ "${3:-}" == "plan" || "${3:-}" == "apply" ]]; then
  ACTION="$3"
fi

flightdeck_detect_env "${1:-}" "${2:-}"
flightdeck_refuse_prod
flightdeck_require_aws

require_command terraform
validate_env_vars TF_STATE_BUCKET TF_VAR_neon_database_url

REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && cd .. && pwd)"

log_info "═══ flightdeck: terraform ${ACTION} -> ${ENVIRONMENT} (root: ${MAIN_ENV}) ═══"
log_info "  state key : ${TF_STATE_KEY}"
log_info "  bucket    : ${TF_STATE_BUCKET}"

cd "$REPO_ROOT"
./scripts/ci/apply-terraform.sh "$MAIN_ENV" "$ENVIRONMENT" "$ACTION"

log_success "Terraform ${ACTION} complete for ${ENVIRONMENT}"
if [ "$ACTION" = "plan" ]; then
  if [[ "$MAIN_ENV" == "prod" ]]; then
    log_info "Plan rendered to terraform/environments/production/tfplan.txt"
  else
    log_info "Plan rendered to terraform/environments/sandbox/tfplan.txt"
  fi
fi
