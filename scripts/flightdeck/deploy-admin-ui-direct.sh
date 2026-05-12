#!/usr/bin/env bash
# scripts/flightdeck/deploy-admin-ui-direct.sh
#
# Build admin-ui locally, sync to its env S3 bucket, invalidate CloudFront,
# and smoke-test the staff hostname.
#
# Usage:  ./scripts/flightdeck/deploy-admin-ui-direct.sh <env> [main_env]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/../ci/lib/common.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/../ci/lib/aws-helpers.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_lib/flightdeck.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_lib/spa-deploy.sh"

flightdeck_detect_env "${1:-}" "${2:-}"
flightdeck_refuse_prod
flightdeck_require_aws

flightdeck_deploy_spa "admin-ui" "$SPA_BUCKET_ADMIN_UI" "$ADMIN_UI_HOST"
