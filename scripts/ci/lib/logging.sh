#!/usr/bin/env bash
# Optional structured logging wrapper. Falls back to plain logs when jq is missing.
# Usage: source "$(dirname "${BASH_SOURCE[0]}")/lib/logging.sh"

set -euo pipefail

LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$LIB_DIR/common.sh"

log_structured() {
  local level="$1"
  local message="$2"
  local context_json="${3:-null}"

  if command_exists jq; then
    local workflow="${GITHUB_WORKFLOW:-unknown}"
    local run_id="${GITHUB_RUN_ID:-unknown}"
    local environment="${ENVIRONMENT:-unknown}"
    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    jq -n \
      --arg level "$level" \
      --arg message "$message" \
      --arg timestamp "$timestamp" \
      --arg workflow "$workflow" \
      --arg run_id "$run_id" \
      --arg environment "$environment" \
      --argjson context "$context_json" \
      '{timestamp:$timestamp,level:$level,message:$message,workflow:$workflow,run_id:$run_id,environment:$environment,context:$context}' \
      2>/dev/null || true
  fi

  case "$level" in
    INFO)    log_info "$message" ;;
    WARN)    log_warn "$message" ;;
    ERROR)   log_error "$message" ;;
    SUCCESS) log_success "$message" ;;
    *)       echo "$message" ;;
  esac
}
