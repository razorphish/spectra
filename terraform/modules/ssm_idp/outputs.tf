output "issuer_parameter_name" {
  value       = aws_ssm_parameter.issuer.name
  description = "SSM parameter name for the JWT issuer."
}

output "jwks_uri_parameter_name" {
  value       = aws_ssm_parameter.jwks_uri.name
  description = "SSM parameter name for the JWKS URI."
}

output "audience_public_parameter_name" {
  value       = aws_ssm_parameter.audience_public.name
  description = "SSM parameter name for the public audience."
}

output "audience_staff_parameter_name" {
  value       = aws_ssm_parameter.audience_staff.name
  description = "SSM parameter name for the staff audience."
}
