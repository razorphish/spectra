terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.50"
    }
  }
}

# Identity provider configuration written to SSM so Lambdas (or future replacement
# authorizers) can read JWKS / issuer / audiences without redeploys.

resource "aws_ssm_parameter" "issuer" {
  name  = "${var.parameter_prefix}/issuer"
  type  = "String"
  value = coalesce(var.jwt_issuer, "PLACEHOLDER")
  tags  = var.tags
}

resource "aws_ssm_parameter" "jwks_uri" {
  name  = "${var.parameter_prefix}/jwks_uri"
  type  = "String"
  value = coalesce(var.jwt_jwks_uri, "PLACEHOLDER")
  tags  = var.tags
}

resource "aws_ssm_parameter" "audience_public" {
  name  = "${var.parameter_prefix}/audience_public"
  type  = "String"
  value = coalesce(var.jwt_audience_public, "PLACEHOLDER")
  tags  = var.tags
}

resource "aws_ssm_parameter" "audience_staff" {
  name  = "${var.parameter_prefix}/audience_staff"
  type  = "String"
  value = coalesce(var.jwt_audience_staff, "PLACEHOLDER")
  tags  = var.tags
}
