#!/usr/bin/env bash
# Common utility functions for Spectra CI scripts.
# Usage: source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

set -euo pipefail

if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  NC=''
fi

log_info()    { echo -e "${BLUE}[spectra]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[spectra:warn]${NC} $*" >&2; }
log_error()   { echo -e "${RED}[spectra:error]${NC} $*" >&2; }
log_success() { echo -e "${GREEN}[spectra:ok]${NC} $*"; }

must_succeed() {
  local cmd="$*"
  if ! "$@"; then
    log_error "Critical command failed: $cmd"
    exit 1
  fi
}

try_or_warn() {
  local cmd="$*"
  if ! "$@"; then
    log_warn "Non-critical command failed: $cmd"
    return 0
  fi
}

validate_env_vars() {
  local missing=()
  for var in "$@"; do
    if [ -z "${!var:-}" ]; then
      missing+=("$var")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    log_error "Missing required environment variables: ${missing[*]}"
    exit 1
  fi
}

retry_with_backoff() {
  local max_attempts="${1:-3}"
  local delay="${2:-5}"
  shift 2
  local cmd=("$@")
  local attempt=1
  while [ "$attempt" -le "$max_attempts" ]; do
    if "${cmd[@]}"; then
      return 0
    fi
    if [ "$attempt" -lt "$max_attempts" ]; then
      log_warn "Attempt $attempt/$max_attempts failed; retrying in ${delay}s"
      sleep "$delay"
      delay=$((delay * 2))
    fi
    attempt=$((attempt + 1))
  done
  log_error "Command failed after $max_attempts attempts: ${cmd[*]}"
  return 1
}

command_exists() { command -v "$1" >/dev/null 2>&1; }

require_command() {
  if ! command_exists "$1"; then
    log_error "Required command not found: $1"
    exit 1
  fi
}
