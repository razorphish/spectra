#!/usr/bin/env bash
# Run Drizzle migrations against the env Neon branch.
# Usage: ./scripts/ci/run-migrations.sh
# Env (provided by GitHub Environment secrets):
#   NEON_DATABASE_URL    - pooled connection (used by app runtime)
#   DATABASE_DIRECT_URL  - direct connection (preferred by drizzle-kit migrate)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/common.sh"

if [ -z "${NEON_DATABASE_URL:-}" ] && [ -z "${DATABASE_URL:-}" ]; then
  log_error "Set NEON_DATABASE_URL or DATABASE_URL for migrations"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="$NEON_DATABASE_URL"
fi

if [ -n "${DATABASE_DIRECT_URL:-}" ]; then
  log_info "Using DATABASE_DIRECT_URL for drizzle-kit migrate"
  export DATABASE_DIRECT_URL
fi

log_info "Running drizzle-kit migrate ($(npm pkg get version | tr -d '"'))"
npm run db:migrate

log_success "Migrations completed"
