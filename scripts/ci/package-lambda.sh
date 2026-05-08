#!/usr/bin/env bash
# Package a single Spectra service into a Lambda zip.
# Usage: ./scripts/ci/package-lambda.sh <service> <out_dir>
# Example: ./scripts/ci/package-lambda.sh aviate-api dist/lambdas
#
# Looks for Nx output under dist/apps/services/<service> (or dist/apps/<service>
# for api-gateway). Emits <out_dir>/<service>.zip and writes <out_dir>/<service>.hash
# containing the deterministic backend_hash.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/common.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/lambda-helpers.sh"

SERVICE="${1:-}"
OUT_DIR="${2:-dist/lambdas}"

if [ -z "$SERVICE" ]; then
  log_error "Usage: $0 <service> [out_dir]"
  exit 1
fi

mkdir -p "$OUT_DIR"

CANDIDATES=(
  "dist/apps/services/${SERVICE}"
  "dist/apps/${SERVICE}"
  "dist/${SERVICE}"
)

DIST_DIR=""
for candidate in "${CANDIDATES[@]}"; do
  if [ -d "$candidate" ]; then
    DIST_DIR="$candidate"
    break
  fi
done

if [ -z "$DIST_DIR" ]; then
  log_error "No dist directory found for $SERVICE. Tried: ${CANDIDATES[*]}"
  exit 1
fi

OUT_ZIP="${OUT_DIR}/${SERVICE}.zip"
zip_service_dist "$SERVICE" "$DIST_DIR" "$OUT_ZIP"

HASH="$(compute_backend_hash "$DIST_DIR")"
echo "$HASH" > "${OUT_DIR}/${SERVICE}.hash"
log_success "$SERVICE backend_hash=$HASH"
