#!/usr/bin/env bash
# scripts/flightdeck/_lib/spa-deploy.sh
#
# Shared inner loop for the SPA flightdeck scripts. Each per-app wrapper sets
# APP, BUCKET_VAR (env name holding the bucket), and HOST_VAR (env name
# holding the public hostname) then calls flightdeck_deploy_spa.

# flightdeck_deploy_spa <app> <bucket> <host>
#
# Steps:
#   1. nx build <app> --configuration=<env-or-production>
#      with PUBLIC_API_URL / STAFF_API_URL / SPECTRA_ENV exported (matches
#      spectra-build-frontends.yml).
#   2. flightdeck_lookup_distribution <host> -> CloudFront distribution ID.
#   3. FORCE_INVALIDATE=true scripts/ci/sync-spa.sh <app> <bucket> <dist-id>
#   4. curl -fsS https://<host>/index.html
flightdeck_deploy_spa() {
  local app="${1:-}"
  local bucket="${2:-}"
  local host="${3:-}"

  if [ -z "$app" ] || [ -z "$bucket" ] || [ -z "$host" ]; then
    log_error "flightdeck_deploy_spa: missing arg(s) app=${app} bucket=${bucket} host=${host}"
    return 1
  fi

  require_command npx
  require_command curl

  local repo_root
  repo_root="$(cd "${SCRIPT_DIR}/../.." && pwd)"

  log_info "═══ flightdeck: ${app} -> ${ENVIRONMENT} (s3://${bucket}) ═══"

  # Pick a per-env Angular configuration if the project defines one, else
  # fall back to production (matches spectra-build-frontends.yml logic).
  local cfg="production"
  if ( cd "$repo_root" && npx nx show project "$app" --json 2>/dev/null \
        | grep -q "\"${ENVIRONMENT}\""; ); then
    cfg="$ENVIRONMENT"
  fi

  log_info "[1/4] nx build ${app} --configuration=${cfg}"
  ( cd "$repo_root" \
      && PUBLIC_API_URL="$PUBLIC_API_URL" \
         STAFF_API_URL="$STAFF_API_URL" \
         SPECTRA_ENV="$ENVIRONMENT" \
         npx nx build "$app" --configuration="$cfg" )

  log_info "[2/4] looking up CloudFront distribution for ${host}"
  local distribution_id
  distribution_id="$(flightdeck_lookup_distribution "$host" || true)"
  if [ -n "$distribution_id" ]; then
    log_info "  -> ${distribution_id}"
  else
    log_warn "  -> none found (sync will skip invalidation; check Terraform created the distribution)"
  fi

  log_info "[3/4] sync-spa.sh ${app} ${bucket} ${distribution_id:-<none>}"
  ( cd "$repo_root" \
      && FORCE_INVALIDATE=true ./scripts/ci/sync-spa.sh "$app" "$bucket" "${distribution_id:-}" )

  log_info "[4/4] smoke test https://${host}/index.html"
  local code body_size
  code="$(curl -sS -o /tmp/spectra-flightdeck-${app}.html \
    -w '%{http_code}' --max-time 30 \
    "https://${host}/index.html" || echo '000')"
  body_size="$(stat -c '%s' "/tmp/spectra-flightdeck-${app}.html" 2>/dev/null || echo 0)"
  if [ "$code" = "200" ] && [ "$body_size" -gt 0 ]; then
    log_success "${app} OK (HTTP ${code}, ${body_size} bytes)"
  else
    log_warn "${app} smoke test returned HTTP ${code} (${body_size} bytes)."
    log_warn "  - DNS for ${host} may not be wired yet, or the distribution is still propagating."
  fi

  log_success "Deployed ${app} -> s3://${bucket} (configuration=${cfg})"
}
