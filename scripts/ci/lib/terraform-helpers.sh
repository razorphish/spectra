#!/usr/bin/env bash
# Terraform helpers for Spectra CI.
# Usage: source "$(dirname "${BASH_SOURCE[0]}")/lib/terraform-helpers.sh"

set -euo pipefail

LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$LIB_DIR/common.sh"

terraform_init_with_retry() {
  local backend_key="$1"
  local state_bucket="$2"
  local region="${3:-us-west-2}"
  local lock_table="${4:-}"
  local max_attempts="${5:-3}"

  log_info "terraform init s3://${state_bucket}/${backend_key} (region=${region})"

  local args=(
    -backend-config="bucket=${state_bucket}"
    -backend-config="key=${backend_key}"
    -backend-config="region=${region}"
    -backend-config="encrypt=true"
    -reconfigure
    -upgrade
    -input=false
    -no-color
  )
  if [ -n "$lock_table" ]; then
    args+=( -backend-config="dynamodb_table=${lock_table}" )
  fi

  local attempt=1
  while [ "$attempt" -le "$max_attempts" ]; do
    if terraform init "${args[@]}"; then
      log_success "terraform init succeeded"
      return 0
    fi
    if [ "$attempt" -lt "$max_attempts" ]; then
      log_warn "terraform init attempt $attempt failed; retrying in 10s"
      sleep 10
    fi
    attempt=$((attempt + 1))
  done

  log_error "terraform init failed after $max_attempts attempts"
  return 1
}

terraform_plan() {
  local out_file="${1:-tfplan}"
  shift || true
  log_info "terraform plan -> $out_file"
  terraform plan -input=false -no-color -out="$out_file" "$@"
}

terraform_apply() {
  local plan_file="${1:-tfplan}"
  log_info "terraform apply $plan_file"
  terraform apply -input=false -auto-approve -no-color "$plan_file"
}

terraform_state_has_resource() {
  local resource_path="$1"
  terraform state show "$resource_path" >/dev/null 2>&1
}
