#!/usr/bin/env bash
# scripts/flightdeck/_lib/flightdeck.sh
#
# Shared helpers for "direct" deploy scripts under scripts/flightdeck/. Mirrors
# the branch->resource mapping from .github/workflows/spectra-detect-environment.yml
# so direct deploys land on the same resources Terraform created via CI.
#
# Source order (every flightdeck script):
#   source scripts/ci/lib/common.sh
#   source scripts/ci/lib/aws-helpers.sh
#   source scripts/flightdeck/_lib/flightdeck.sh

# Avoid `set -euo pipefail` here so callers stay in control; common.sh already
# enforces it for the calling script.

# Defaults — override via env or vars set before sourcing.
: "${BASE_DOMAIN:=spectra.com}"
: "${PROJECT_NAME:=spectra}"
: "${AWS_REGION:=us-west-2}"

# flightdeck_detect_env <env_label>
#
# Validates env_label against the same regex set as spectra-detect-environment.yml
# and exports the canonical naming variables every direct script consumes.
flightdeck_detect_env() {
  local env_label="${1:-}"
  if [ -z "$env_label" ]; then
    log_error "flightdeck_detect_env: missing <env_label>"
    log_error "Usage: <script> <environment> [main_env_override]"
    log_error "  e.g. dev01, qa02, staging01, hotfix01, prod"
    return 1
  fi

  local main_env=""
  if [ -n "${2:-}" ]; then
    main_env="$2"
  elif [[ "$env_label" == "prod" ]]; then
    main_env="prod"
  elif [[ "$env_label" =~ ^dev[0-9]{2}$ ]]; then
    main_env="dev"
  elif [[ "$env_label" =~ ^qa[0-9]{2}$ ]]; then
    main_env="qa"
  elif [[ "$env_label" =~ ^staging[0-9]{2}$ ]]; then
    main_env="staging"
  elif [[ "$env_label" =~ ^hotfix[0-9]{2}$ ]]; then
    main_env="hotfix"
  else
    log_error "Unknown env label: '$env_label'"
    log_error "Expected: prod | dev01..dev99 | qa01..qa99 | staging01..staging99 | hotfix01..hotfix99"
    return 1
  fi

  export ENVIRONMENT="$env_label"
  export MAIN_ENV="$main_env"
  export BASE_DOMAIN PROJECT_NAME AWS_REGION

  local host_suffix bucket_suffix
  if [[ "$MAIN_ENV" == "prod" ]]; then
    host_suffix="$BASE_DOMAIN"
    bucket_suffix="prod-prod-${PROJECT_NAME}"
    export RESOURCE_PREFIX="${PROJECT_NAME}-prod-prod"
  else
    host_suffix="${ENVIRONMENT}.sandbox.${BASE_DOMAIN}"
    bucket_suffix="${MAIN_ENV}-${ENVIRONMENT}-${PROJECT_NAME}"
    export RESOURCE_PREFIX="${PROJECT_NAME}-${MAIN_ENV}-${ENVIRONMENT}"
  fi
  export BUCKET_PREFIX="$bucket_suffix"

  export PUBLIC_API_HOST="api.${host_suffix}"
  export STAFF_API_HOST="admin.api.${host_suffix}"
  export SPECTRA_UI_HOST="developers.${host_suffix}"
  export SANDBOX_UI_HOST="sandbox.${host_suffix}"
  export ADMIN_UI_HOST="admin.${host_suffix}"

  export PUBLIC_API_URL="https://${PUBLIC_API_HOST}"
  export STAFF_API_URL="https://${STAFF_API_HOST}"

  export LAMBDA_DEPLOY_BUCKET="${bucket_suffix}-lambda-deployments"
  export SPA_BUCKET_SPECTRA_UI="${bucket_suffix}-spectra-ui"
  export SPA_BUCKET_SANDBOX_UI="${bucket_suffix}-sandbox-ui"
  export SPA_BUCKET_ADMIN_UI="${bucket_suffix}-admin-ui"
  export UPLOADS_BUCKET="${bucket_suffix}-uploads"

  export TF_STATE_KEY="${PROJECT_NAME}/${MAIN_ENV}/${ENVIRONMENT}/terraform.tfstate"
  export GH_ENVIRONMENT="$ENVIRONMENT"

  log_info "Resolved environment: ${ENVIRONMENT} (main=${MAIN_ENV})"
  log_info "  Public API : ${PUBLIC_API_URL}"
  log_info "  Staff API  : ${STAFF_API_URL}"
  log_info "  Lambda zip bucket : ${LAMBDA_DEPLOY_BUCKET}"
  log_info "  TF state key      : ${TF_STATE_KEY}"
}

# flightdeck_require_aws
#
# Confirms AWS credentials are usable and prints the resolved account/region.
flightdeck_require_aws() {
  require_command aws
  local account
  if ! account="$(aws sts get-caller-identity --query Account --output text 2>/dev/null)"; then
    log_error "Unable to resolve AWS credentials. Run 'aws configure' or export AWS_PROFILE / AWS_ACCESS_KEY_ID."
    return 1
  fi
  log_info "AWS account ${account} (region ${AWS_REGION})"
}

# flightdeck_lookup_distribution <host>
#
# Echoes the CloudFront distribution ID whose Aliases contain <host>, or empty
# string if none found. Caller decides whether missing is fatal.
flightdeck_lookup_distribution() {
  local host="${1:-}"
  if [ -z "$host" ]; then
    log_error "flightdeck_lookup_distribution: missing <host>"
    return 1
  fi
  require_command aws
  aws cloudfront list-distributions \
    --query "DistributionList.Items[?Aliases.Items!=null && contains(Aliases.Items, '${host}')].Id | [0]" \
    --output text 2>/dev/null \
    | tr -d '\r' \
    | sed 's/^None$//'
}

# flightdeck_refuse_prod
#
# Direct deploys to prod require an explicit opt-in env var. Saves you from
# typing `prod` instead of `qa01` and overwriting the live alias.
flightdeck_refuse_prod() {
  if [[ "${ENVIRONMENT:-}" == "prod" || "${MAIN_ENV:-}" == "prod" ]]; then
    if [[ "${FLIGHTDECK_ALLOW_PROD:-0}" != "1" ]]; then
      log_error "Refusing direct deploy to prod."
      log_error "Set FLIGHTDECK_ALLOW_PROD=1 to override (and please use CI instead)."
      return 1
    fi
    log_warn "FLIGHTDECK_ALLOW_PROD=1 set — proceeding with prod direct deploy. Be careful."
  fi
}
