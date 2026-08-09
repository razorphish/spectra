# SCAFFOLD (not yet applied). BFF token-handler Lambda for the sandbox-ui.
#
# PREREQUISITES that do not exist in this Terraform yet (see docs/plans/sandbox-ui-bff.md):
#   1. A CloudFront distribution fronting the SPA where behaviors route `/bff/*` and `/v1/*`
#      to THIS API and `/*` to the SPA S3 origin — required so the session cookie is same-origin.
#   2. The public/staff APIs are still MOCK integrations; the BFF forwards a Bearer to them,
#      so they must be real (AWS_PROXY) before end-to-end works.
#   3. A build step that packages apps/local-edge BFF logic (+ serverless-http adapter) to the
#      lambda zip referenced by var.lambda_s3_key.
# Auth0 client secret + BFF session secret are read from Secrets Manager (var.secret_arns).

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "bff" {
  name               = "${var.name}-role"
  assume_role_policy = data.aws_iam_policy_document.assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "logs" {
  role       = aws_iam_role.bff.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "secrets" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = var.secret_arns
  }
}

resource "aws_iam_role_policy" "secrets" {
  name   = "${var.name}-secrets"
  role   = aws_iam_role.bff.id
  policy = data.aws_iam_policy_document.secrets.json
}

resource "aws_lambda_function" "bff" {
  function_name = var.name
  role          = aws_iam_role.bff.arn
  runtime       = "nodejs20.x"
  handler       = "main.handler" # serverless-http adapter wrapping the Express BFF
  s3_bucket     = var.lambda_deploy_bucket
  s3_key        = var.lambda_s3_key
  timeout       = 15
  memory_size   = 256

  environment {
    variables = {
      BFF_ENABLED       = "true"
      BFF_PUBLIC_ORIGIN = var.public_origin
      AUTH0_DOMAIN      = var.auth0_domain
      AUTH0_AUDIENCE    = var.auth0_audience
      NODE_ENV          = "production"
      # Secrets are fetched at cold start from Secrets Manager (var.secret_arns) — NOT inlined here.
      # AUTH0_BFF_CLIENT_SECRET / BFF_SESSION_SECRET resolved in code via the AWS SDK.
    }
  }

  tags = var.tags
}

resource "aws_apigatewayv2_integration" "bff" {
  api_id                 = var.api_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.bff.invoke_arn
  payload_format_version = "2.0"
}

# /bff/* is handled entirely by the BFF (login/callback/me/logout). No JWT authorizer — the
# BFF establishes the session. /v1/* is also routed here so the BFF can inject the Bearer;
# authz is still enforced by the downstream services on the token the BFF forwards.
resource "aws_apigatewayv2_route" "bff" {
  api_id    = var.api_id
  route_key = "ANY /bff/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.bff.id}"
}

resource "aws_apigatewayv2_route" "api_proxy" {
  api_id    = var.api_id
  route_key = "ANY /v1/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.bff.id}"
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowApiGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.bff.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_execution_arn}/*/*"
}
