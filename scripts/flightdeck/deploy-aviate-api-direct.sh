#!/usr/bin/env bash
# scripts/flightdeck/deploy-aviate-api-direct.sh
#
# Build aviate-api locally, zip + upload to S3, flip the Lambda alias `live`,
# and smoke-test /v1/platform/health on the public Edge.
#
# Usage:  ./scripts/flightdeck/deploy-aviate-api-direct.sh <env> [main_env]
# Examples:
#   ./scripts/flightdeck/deploy-aviate-api-direct.sh dev01
#   FLIGHTDECK_ALLOW_PROD=1 ./scripts/flightdeck/deploy-aviate-api-direct.sh prod

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

flightdeck_deploy_lambda "aviate-api" "/v1/platform/health"
