#!/usr/bin/env bash
# scripts/flightdeck/deploy-admin-ui-api-direct.sh
#
# Build admin-ui-api locally, zip + upload to S3, flip the Lambda alias `live`,
# and smoke-test /v1/admin/health on the staff Edge.
#
# Usage:  ./scripts/flightdeck/deploy-admin-ui-api-direct.sh <env> [main_env]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/../ci/lib/common.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/../ci/lib/aws-helpers.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/../ci/lib/lambda-helpers.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_lib/flightdeck.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_lib/lambda-deploy.sh"

flightdeck_detect_env "${1:-}" "${2:-}"
flightdeck_refuse_prod
flightdeck_require_aws

# admin-ui-api is reachable via the staff Edge; point the smoke test there.
PUBLIC_API_URL="$STAFF_API_URL"
flightdeck_deploy_lambda "admin-ui-api" "/v1/admin/health"
