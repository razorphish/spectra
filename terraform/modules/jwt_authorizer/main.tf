terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.50"
    }
  }
}

# Single API Gateway v2 JWT authorizer. The caller picks public vs staff by
# passing a different audience list. JWT validation happens at the gateway,
# so the Express services only see verified callers.

resource "aws_apigatewayv2_authorizer" "this" {
  api_id           = var.api_id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = var.name

  jwt_configuration {
    issuer   = var.jwt_issuer
    audience = var.jwt_audiences
  }
}
