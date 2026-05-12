#!/usr/bin/env bash
# scripts/flightdeck/_lib/lambda-deploy.sh
#
# Shared inner loop for the Lambda flightdeck scripts. Each per-service
# wrapper sets SERVICE + HEALTH_PATH and calls flightdeck_deploy_lambda.

# flightdeck_deploy_lambda <service> <health_path>
#
# Steps:
#   1. nx build <service> --configuration=production
#   2. scripts/ci/package-lambda.sh <service> dist/lambdas
#   3. aws s3 cp <service>.zip s3://${LAMBDA_DEPLOY_BUCKET}/<key>
#   4. update-function-code -> wait -> publish-version -> update-alias live
#   5. scripts/ci/verify-deployment.sh ${PUBLIC_API_URL} (or staff URL)
#   6. Print rollback command for the *previous* version.
flightdeck_deploy_lambda() {
  local service="${1:-}"
  local health_path="${2:-/v1/platform/health}"

  if [ -z "$service" ]; then
    log_error "flightdeck_deploy_lambda: missing <service>"
    return 1
  fi

  require_command npx
  require_command zip
  require_command sha256sum

  local repo_root
  repo_root="$(cd "${SCRIPT_DIR}/../.." && pwd)"

  log_info "═══ flightdeck: ${service} -> ${ENVIRONMENT} ═══"

  log_info "[1/6] nx build ${service} --configuration=production"
  ( cd "$repo_root" && npx nx build "$service" --configuration=production )

  log_info "[2/6] package-lambda.sh ${service}"
  ( cd "$repo_root" && ./scripts/ci/package-lambda.sh "$service" dist/lambdas )

  local zip_path hash key
  zip_path="${repo_root}/dist/lambdas/${service}.zip"
  hash="$(cat "${repo_root}/dist/lambdas/${service}.hash")"
  key="$(lambda_deploy_key "$service" "$ENVIRONMENT" "$hash")"

  log_info "[3/6] s3 cp -> s3://${LAMBDA_DEPLOY_BUCKET}/${key}"
  aws s3 cp "$zip_path" "s3://${LAMBDA_DEPLOY_BUCKET}/${key}" \
    --region "$AWS_REGION" >/dev/null

  local function_name
  function_name="$(lambda_function_name "$MAIN_ENV" "$ENVIRONMENT" "$service")"

  if ! lambda_exists "$function_name"; then
    log_error "Lambda ${function_name} does not exist yet."
    log_error "Run scripts/flightdeck/deploy-infra-direct.sh ${ENVIRONMENT} first so Terraform creates the function."
    return 1
  fi

  # Capture the *current* alias version so we can echo the rollback target.
  local previous_version=""
  previous_version="$(aws lambda get-alias \
    --function-name "$function_name" \
    --name live \
    --region "$AWS_REGION" \
    --query FunctionVersion --output text 2>/dev/null || echo '')"
  local previous_key=""
  if [ -n "$previous_version" ] && [ "$previous_version" != "None" ]; then
    previous_key="$(aws lambda get-function \
      --function-name "${function_name}:${previous_version}" \
      --region "$AWS_REGION" \
      --query 'Code.S3Key' --output text 2>/dev/null || echo '')"
  fi

  log_info "[4/6] update-function-code + alias flip"
  update_lambda_code_from_s3 "$function_name" "$LAMBDA_DEPLOY_BUCKET" "$key"
  aws lambda wait function-updated \
    --function-name "$function_name" \
    --region "$AWS_REGION"

  local new_version
  new_version="$(aws lambda publish-version \
    --function-name "$function_name" \
    --region "$AWS_REGION" \
    --query Version --output text)"

  if ! aws lambda update-alias \
        --function-name "$function_name" \
        --name live \
        --function-version "$new_version" \
        --region "$AWS_REGION" >/dev/null 2>&1; then
    aws lambda create-alias \
      --function-name "$function_name" \
      --name live \
      --function-version "$new_version" \
      --region "$AWS_REGION" >/dev/null
    log_info "Created alias 'live' -> v${new_version}"
  else
    log_info "Alias 'live' -> v${new_version} (was v${previous_version:-?})"
  fi

  log_info "[5/6] smoke test ${PUBLIC_API_URL}${health_path}"
  local code
  code="$(curl -sS -o /tmp/spectra-flightdeck-${service}.json \
    -w '%{http_code}' --max-time 30 \
    "${PUBLIC_API_URL}${health_path}" || echo '000')"
  if [ "$code" = "200" ]; then
    log_success "Health check OK (HTTP 200)"
  else
    log_warn "Health check returned HTTP ${code} (deployment shipped, but the endpoint may not be wired yet)."
    log_warn "Body (truncated): $(head -c 200 /tmp/spectra-flightdeck-${service}.json 2>/dev/null || true)"
  fi

  log_info "[6/6] Done."
  log_success "Deployed ${service} -> ${function_name} v${new_version} (hash ${hash})"
  log_info "  S3 key: s3://${LAMBDA_DEPLOY_BUCKET}/${key}"

  echo
  log_info "Rollback command:"
  if [ -n "$previous_key" ] && [ "$previous_key" != "None" ]; then
    echo "  ./scripts/ci/rollback-lambda.sh ${MAIN_ENV} ${ENVIRONMENT} ${service} '${previous_key}'"
  else
    echo "  # No previous S3 key recorded for v${previous_version:-?}."
    echo "  # List candidates: aws s3 ls s3://${LAMBDA_DEPLOY_BUCKET}/deployments/${service}/${ENVIRONMENT}/"
    echo "  # Then: ./scripts/ci/rollback-lambda.sh ${MAIN_ENV} ${ENVIRONMENT} ${service} <s3-key>"
  fi
}
