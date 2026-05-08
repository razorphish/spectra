output "api_id" {
  value       = aws_apigatewayv2_api.this.id
  description = "API Gateway v2 API ID."
}

output "api_arn" {
  value       = aws_apigatewayv2_api.this.arn
  description = "API Gateway v2 API ARN."
}

output "api_endpoint" {
  value       = aws_apigatewayv2_api.this.api_endpoint
  description = "Default execute-api endpoint (e.g. https://abc123.execute-api.us-west-2.amazonaws.com)."
}

output "stage_name" {
  value       = aws_apigatewayv2_stage.default.name
  description = "Default stage name."
}

output "execution_arn" {
  value       = aws_apigatewayv2_api.this.execution_arn
  description = "Used to grant Lambda invoke permissions once integrations are wired in."
}
