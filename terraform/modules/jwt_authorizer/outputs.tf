output "authorizer_id" {
  value       = aws_apigatewayv2_authorizer.this.id
  description = "API Gateway v2 authorizer ID."
}

output "authorizer_name" {
  value       = aws_apigatewayv2_authorizer.this.name
  description = "API Gateway v2 authorizer name."
}
