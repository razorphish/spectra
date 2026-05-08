#!/usr/bin/env bash
# Post-deploy verification: hits /v1/<segment>/health and /ready and fails on
# non-200. Optionally checks staff API too.
# Usage: ./scripts/ci/verify-deployment.sh <public_api_base> [staff_api_base]
#   public_api_base = https://api.dev01.sandbox.spectra.com

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/common.sh"

PUBLIC_API="${1:-}"
STAFF_API="${2:-}"

if [ -z "$PUBLIC_API" ]; then
  log_error "Usage: $0 <public_api_base> [staff_api_base]"
  exit 1
fi

check_endpoint() {
  local label="$1"
  local url="$2"
  local code
  code="$(curl -sS -o /tmp/spectra-verify.json -w '%{http_code}' --max-time 30 "$url" || echo '000')"
  if [ "$code" = "200" ]; then
    log_success "$label OK ($url)"
    return 0
  fi
  log_error "$label FAIL ($url) -> HTTP $code"
  cat /tmp/spectra-verify.json 2>/dev/null || true
  echo
  return 1
}

FAIL=0
check_endpoint "platform/health" "$PUBLIC_API/v1/platform/health" || FAIL=1
check_endpoint "platform/ready"  "$PUBLIC_API/v1/platform/ready"  || FAIL=1

if [ -n "$STAFF_API" ]; then
  check_endpoint "admin/health" "$STAFF_API/v1/admin/health" || FAIL=1
  check_endpoint "admin/ready"  "$STAFF_API/v1/admin/ready"  || FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then
  log_error "Verification failed"
  exit 1
fi

log_success "Deployment verification passed"
