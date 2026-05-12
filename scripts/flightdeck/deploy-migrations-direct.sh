#!/usr/bin/env bash
# scripts/flightdeck/deploy-migrations-direct.sh
#
# Run drizzle-kit migrate against the env's Neon branch via
# scripts/ci/run-migrations.sh, then verify the connection still answers
# `select 1` via npm run db:verify.
#
# Usage:  ./scripts/flightdeck/deploy-migrations-direct.sh <env> [main_env]
# Env (preferred — set in your .env or shell):
#   DATABASE_DIRECT_URL    direct (non-pooler) Neon URL  (preferred for migrate)
#   NEON_DATABASE_URL      pooled Neon URL                (used for db:verify)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/../ci/lib/common.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_lib/flightdeck.sh"

flightdeck_detect_env "${1:-}" "${2:-}"
flightdeck_refuse_prod

REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && cd .. && pwd)"

# Pick up DATABASE_URL/NEON_DATABASE_URL from .env if present (run-migrations.sh
# reads from process env, not dotenv).
if [ -f "${REPO_ROOT}/.env" ]; then
  log_info "Loading ${REPO_ROOT}/.env"
  set -a
  # shellcheck disable=SC1091
  . "${REPO_ROOT}/.env"
  set +a
fi

if [ -z "${DATABASE_DIRECT_URL:-}" ] && [ -z "${NEON_DATABASE_URL:-}" ] && [ -z "${DATABASE_URL:-}" ]; then
  log_error "Set DATABASE_DIRECT_URL (preferred), NEON_DATABASE_URL, or DATABASE_URL before running."
  exit 1
fi

log_info "═══ flightdeck: drizzle-kit migrate -> ${ENVIRONMENT} ═══"
if [ -n "${DATABASE_DIRECT_URL:-}" ]; then
  log_info "  Using DATABASE_DIRECT_URL for drizzle-kit migrate"
else
  log_warn "  DATABASE_DIRECT_URL not set; drizzle-kit will use the pooled URL (slower but works)."
fi

cd "$REPO_ROOT"
./scripts/ci/run-migrations.sh

log_info "Post-migration: npm run db:verify"
npm run db:verify

log_success "Migrations applied + Neon connectivity verified for ${ENVIRONMENT}"
