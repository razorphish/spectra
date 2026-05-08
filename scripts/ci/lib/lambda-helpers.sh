#!/usr/bin/env bash
# Lambda zip helpers for Spectra CI.
# Usage: source "$(dirname "${BASH_SOURCE[0]}")/lib/lambda-helpers.sh"

set -euo pipefail

LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$LIB_DIR/common.sh"

# Compute deterministic hash for a built artifact directory.
compute_backend_hash() {
  local dist_dir="$1"
  if ! command_exists sha256sum; then
    log_error "sha256sum not available"
    exit 1
  fi
  ( cd "$dist_dir" && find . -type f -print0 \
    | sort -z \
    | xargs -0 sha256sum \
    | sha256sum \
    | awk '{print substr($1,1,12)}' )
}

# Zip a Nx-built service directory into out_zip.
zip_service_dist() {
  local service="$1"
  local dist_dir="$2"
  local out_zip="$3"

  require_command zip
  if [ ! -d "$dist_dir" ]; then
    log_error "Dist directory not found for $service: $dist_dir"
    exit 1
  fi

  rm -f "$out_zip"
  ( cd "$dist_dir" && zip -qr "$out_zip" . )
  log_success "Packaged $service -> $out_zip"
}

lambda_function_name() {
  local main_env="$1"
  local environment="$2"
  local service="$3"
  echo "spectra-${main_env}-${environment}-${service}"
}

lambda_deploy_bucket() {
  local main_env="$1"
  local environment="$2"
  echo "${main_env}-${environment}-spectra-lambda-deployments"
}

lambda_deploy_key() {
  local service="$1"
  local environment="$2"
  local backend_hash="$3"
  local timestamp
  timestamp="$(date -u +%Y%m%d-%H%M%S)"
  echo "deployments/${service}/${environment}/${service}-${timestamp}-${backend_hash}.zip"
}
