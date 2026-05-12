#!/usr/bin/env bash
# scripts/flightdeck/deploy-api-gateway-direct.sh
#
# Build api-gateway locally, zip + upload to S3, flip the Lambda alias `live`,
# and smoke-test /v1/platform/health on the public Edge.
#
# Usage:  ./scripts/flightdeck/deploy-api-gateway-direct.sh <env> [main_env]

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

flightdeck_deploy_lambda "api-gateway" "/v1/platform/health"
