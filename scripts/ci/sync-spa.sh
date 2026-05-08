#!/usr/bin/env bash
# Sync a Spectra SPA build to its environment S3 bucket and (optionally)
# invalidate CloudFront.
# Usage: ./scripts/ci/sync-spa.sh <app> <bucket> [distribution_id]
# Env: FORCE_INVALIDATE=true to always invalidate.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/common.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/aws-helpers.sh"

APP="${1:-}"
BUCKET="${2:-}"
DISTRIBUTION_ID="${3:-}"
FORCE_INVALIDATE="${FORCE_INVALIDATE:-false}"

if [ -z "$APP" ] || [ -z "$BUCKET" ]; then
  log_error "Usage: $0 <app> <bucket> [distribution_id]"
  exit 1
fi

CANDIDATES=(
  "dist/apps/${APP}/browser"
  "dist/apps/${APP}"
  "dist/${APP}/browser"
  "dist/${APP}"
)

SRC=""
for candidate in "${CANDIDATES[@]}"; do
  if [ -d "$candidate" ]; then
    SRC="$candidate"
    break
  fi
done

if [ -z "$SRC" ]; then
  log_error "Build output not found for $APP. Tried: ${CANDIDATES[*]}"
  exit 1
fi

log_info "Syncing $APP -> s3://$BUCKET (source: $SRC)"
aws s3 sync "$SRC" "s3://$BUCKET" \
  --delete \
  --cache-control "public, max-age=300" \
  --exclude "index.html" \
  --exclude "*.map"

aws s3 cp "$SRC/index.html" "s3://$BUCKET/index.html" \
  --cache-control "no-cache, no-store, must-revalidate" 2>/dev/null || \
  log_warn "No index.html to upload (verify SPA output structure)"

if [ -n "$DISTRIBUTION_ID" ] && [ "$FORCE_INVALIDATE" = "true" ]; then
  invalidate_cloudfront "$DISTRIBUTION_ID" "/*"
elif [ -n "$DISTRIBUTION_ID" ]; then
  invalidate_cloudfront "$DISTRIBUTION_ID" "/index.html"
fi

log_success "Sync complete: $APP"
