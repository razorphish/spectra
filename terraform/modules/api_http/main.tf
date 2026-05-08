terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.50"
    }
  }
}

# HTTP API (API Gateway v2) for one slice of Spectra: either the *public*
# control-plane (`/v1/platform/*`) or the *staff* admin plane (`/v1/admin/*`).
# Phase A uses MOCK integrations because the Lambdas don't exist yet — once
# they do, swap in the AWS_PROXY integrations.

resource "aws_apigatewayv2_api" "this" {
  name          = var.api_name
  protocol_type = "HTTP"
  description   = var.description
  tags          = var.tags

  cors_configuration {
    allow_origins  = var.cors_allowed_origins
    allow_headers  = ["authorization", "content-type", "x-spectra-trace-id"]
    allow_methods  = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
    expose_headers = ["x-spectra-trace-id"]
    max_age        = 3600
  }
}

# Mock integration that returns 501 Not Implemented for every authenticated
# route until real Lambda integrations are wired in.
resource "aws_apigatewayv2_integration" "placeholder" {
  api_id           = aws_apigatewayv2_api.this.id
  integration_type = "MOCK"
}

# Mock integration that returns 200 {ok:true} for the open routes
# (`/health`, `/ready`). Lets verify-deployment pass before the Lambdas exist.
resource "aws_apigatewayv2_integration" "health_mock" {
  api_id                 = aws_apigatewayv2_api.this.id
  integration_type       = "MOCK"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "health" {
  api_id             = aws_apigatewayv2_api.this.id
  route_key          = "GET /v1/${var.path_segment}/health"
  authorization_type = "NONE"
  target             = "integrations/${aws_apigatewayv2_integration.health_mock.id}"
}

resource "aws_apigatewayv2_route" "ready" {
  api_id             = aws_apigatewayv2_api.this.id
  route_key          = "GET /v1/${var.path_segment}/ready"
  authorization_type = "NONE"
  target             = "integrations/${aws_apigatewayv2_integration.health_mock.id}"
}

# Catch-all proxy route — JWT-protected by the caller-supplied authorizer.
resource "aws_apigatewayv2_route" "proxy" {
  api_id             = aws_apigatewayv2_api.this.id
  route_key          = "ANY /v1/${var.path_segment}/{proxy+}"
  authorization_type = var.authorizer_id == null ? "NONE" : "JWT"
  authorizer_id      = var.authorizer_id
  target             = "integrations/${aws_apigatewayv2_integration.placeholder.id}"
}

resource "aws_cloudwatch_log_group" "access" {
  name              = "/aws/apigateway/${var.api_name}"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = "$default"
  auto_deploy = true
  tags        = var.tags

  default_route_settings {
    detailed_metrics_enabled = true
    throttling_burst_limit   = var.throttling_burst_limit
    throttling_rate_limit    = var.throttling_rate_limit
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.access.arn
    format = jsonencode({
      requestId          = "$context.requestId"
      ip                 = "$context.identity.sourceIp"
      requestTime        = "$context.requestTime"
      httpMethod         = "$context.httpMethod"
      routeKey           = "$context.routeKey"
      status             = "$context.status"
      protocol           = "$context.protocol"
      responseLength     = "$context.responseLength"
      integrationStatus  = "$context.integrationStatus"
      integrationLatency = "$context.integrationLatency"
    })
  }
}
