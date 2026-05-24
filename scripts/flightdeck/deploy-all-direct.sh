#!/usr/bin/env bash
# scripts/flightdeck/deploy-all-direct.sh
#
# Run the full Spectra deployment pipeline directly from a developer laptop in
# the same order as .github/workflows/spectra-deploy.yml:
#
#     infra -> migrations -> lambdas (sequential) -> SPAs -> verify
#
# Usage:
#   ./scripts/flightdeck/deploy-all-direct.sh <env> [main_env] [flags]
#
# Flags (any order, after the env args):
#   --skip-infra              skip the terraform apply step
#   --skip-migrations         skip the drizzle-kit migrate step
#   --skip-verify             skip the final verify-deployment.sh step
#   --only=<csv>              run only the listed assets (subset of:
#                             aviate-api, admin-ui-api,
#                             spectra-ui, sandbox-ui, admin-ui)
#                             implies --skip-infra, --skip-migrations
#                             unless they're explicitly listed.
#
# Examples:
#   ./scripts/flightdeck/deploy-all-direct.sh dev01
#   ./scripts/flightdeck/deploy-all-direct.sh qa02 --skip-infra
#   ./scripts/flightdeck/deploy-all-direct.sh dev01 --only=aviate-api,spectra-ui

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/../ci/lib/common.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/../ci/lib/aws-helpers.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_lib/flightdeck.sh"

ALL_LAMBDAS=(aviate-api admin-ui-api)
ALL_SPAS=(spectra-ui sandbox-ui admin-ui)

# --- arg parsing ---------------------------------------------------------
ENV_ARG=""
MAIN_ENV_ARG=""
SKIP_INFRA=0
SKIP_MIGRATIONS=0
SKIP_VERIFY=0
ONLY_LIST=""
POSITIONAL_INDEX=0

for arg in "$@"; do
  case "$arg" in
    --skip-infra)        SKIP_INFRA=1 ;;
    --skip-migrations)   SKIP_MIGRATIONS=1 ;;
    --skip-verify)       SKIP_VERIFY=1 ;;
    --only=*)            ONLY_LIST="${arg#--only=}" ;;
    -h|--help)
      sed -n '2,28p' "$0"
      exit 0
      ;;
    --*)
      log_error "Unknown flag: $arg"
      exit 1
      ;;
    *)
      case "$POSITIONAL_INDEX" in
        0) ENV_ARG="$arg" ;;
        1) MAIN_ENV_ARG="$arg" ;;
        *) log_error "Unexpected positional arg: $arg"; exit 1 ;;
      esac
      POSITIONAL_INDEX=$((POSITIONAL_INDEX + 1))
      ;;
  esac
done

flightdeck_detect_env "$ENV_ARG" "$MAIN_ENV_ARG"
flightdeck_refuse_prod
flightdeck_require_aws

REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && cd .. && pwd)"

# --- compute the run plan ------------------------------------------------
declare -a LAMBDAS_TO_RUN=()
declare -a SPAS_TO_RUN=()
RUN_INFRA=1
RUN_MIGRATIONS=1
RUN_VERIFY=1

if [ -n "$ONLY_LIST" ]; then
  RUN_INFRA=0
  RUN_MIGRATIONS=0
  RUN_VERIFY=0
  IFS=',' read -ra ONLY_ARR <<< "$ONLY_LIST"
  for item in "${ONLY_ARR[@]}"; do
    case "$item" in
      infra)        RUN_INFRA=1 ;;
      migrations)   RUN_MIGRATIONS=1 ;;
      verify)       RUN_VERIFY=1 ;;
      aviate-api|admin-ui-api) LAMBDAS_TO_RUN+=("$item") ;;
      spectra-ui|sandbox-ui|admin-ui)      SPAS_TO_RUN+=("$item") ;;
      *)
        log_error "--only: unknown asset '$item'"
        log_error "Allowed: infra, migrations, verify, ${ALL_LAMBDAS[*]}, ${ALL_SPAS[*]}"
        exit 1
        ;;
    esac
  done
else
  LAMBDAS_TO_RUN=("${ALL_LAMBDAS[@]}")
  SPAS_TO_RUN=("${ALL_SPAS[@]}")
fi

[ "$SKIP_INFRA" = "1" ]      && RUN_INFRA=0
[ "$SKIP_MIGRATIONS" = "1" ] && RUN_MIGRATIONS=0
[ "$SKIP_VERIFY" = "1" ]     && RUN_VERIFY=0

# --- summary -------------------------------------------------------------
log_info "═══ flightdeck plan: ${ENVIRONMENT} ═══"
log_info "  infra        : $([ $RUN_INFRA -eq 1 ] && echo run || echo skip)"
log_info "  migrations   : $([ $RUN_MIGRATIONS -eq 1 ] && echo run || echo skip)"
log_info "  lambdas      : ${LAMBDAS_TO_RUN[*]:-(none)}"
log_info "  SPAs         : ${SPAS_TO_RUN[*]:-(none)}"
log_info "  verify       : $([ $RUN_VERIFY -eq 1 ] && echo run || echo skip)"
echo

cd "$REPO_ROOT"

step() {
  local label="$1"; shift
  echo
  log_info "──▶ ${label}"
  if "$@"; then
    log_success "✔ ${label}"
  else
    log_error "✘ ${label}"
    exit 1
  fi
}

# --- execute -------------------------------------------------------------
if [ $RUN_INFRA -eq 1 ]; then
  step "infra (terraform apply)" \
    ./scripts/flightdeck/deploy-infra-direct.sh "$ENVIRONMENT" "$MAIN_ENV"
fi

if [ $RUN_MIGRATIONS -eq 1 ]; then
  step "migrations (drizzle-kit migrate + db:verify)" \
    ./scripts/flightdeck/deploy-migrations-direct.sh "$ENVIRONMENT" "$MAIN_ENV"
fi

for svc in "${LAMBDAS_TO_RUN[@]}"; do
  step "lambda: ${svc}" \
    "./scripts/flightdeck/deploy-${svc}-direct.sh" "$ENVIRONMENT" "$MAIN_ENV"
done

for app in "${SPAS_TO_RUN[@]}"; do
  step "SPA: ${app}" \
    "./scripts/flightdeck/deploy-${app}-direct.sh" "$ENVIRONMENT" "$MAIN_ENV"
done

if [ $RUN_VERIFY -eq 1 ]; then
  step "verify (health + ready)" \
    ./scripts/ci/verify-deployment.sh "$PUBLIC_API_URL" "$STAFF_API_URL"
fi

echo
log_success "═══ flightdeck: all selected assets deployed to ${ENVIRONMENT} ═══"
