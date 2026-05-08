#!/usr/bin/env bash
# Pre-flight validation for Spectra CI/CD deployments.
# Validates AWS credentials, required tools, and environment vars before deploys.
# Usage: ENVIRONMENT=dev01 ./scripts/ci/pre-flight-validation.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/common.sh"

log_info "Running Spectra pre-flight validation..."

REQUIRED_TOOLS=("aws" "terraform" "node" "npm")
for tool in "${REQUIRED_TOOLS[@]}"; do
  require_command "$tool"
  log_info "  ✓ $tool ($(command -v "$tool"))"
done

if ! aws sts get-caller-identity >/dev/null 2>&1; then
  log_error "AWS credentials missing or invalid (configure OIDC role or static keys)"
  exit 1
fi
log_info "  ✓ aws sts get-caller-identity OK"

NODE_VERSION_REQUIRED="$(cat "$SCRIPT_DIR/../../.nvmrc" 2>/dev/null || echo "")"
if [ -n "$NODE_VERSION_REQUIRED" ]; then
  log_info "  ℹ️ .nvmrc requires node $NODE_VERSION_REQUIRED, current: $(node --version)"
fi

if [ -n "${ENVIRONMENT:-}" ]; then
  if [[ ! "$ENVIRONMENT" =~ ^(prod|dev[0-9]{2}|qa[0-9]{2}|staging[0-9]{2}|hotfix[0-9]{2})$ ]]; then
    log_warn "ENVIRONMENT '$ENVIRONMENT' does not match expected pattern"
  else
    log_info "  ✓ ENVIRONMENT=$ENVIRONMENT"
  fi
fi

log_success "Spectra pre-flight validation passed"
