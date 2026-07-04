output "lambda_arn" {
  description = "ARN of the BFF Lambda function."
  value       = aws_lambda_function.bff.arn
}

output "lambda_name" {
  description = "Name of the BFF Lambda function."
  value       = aws_lambda_function.bff.function_name
}

output "integration_id" {
  description = "API Gateway v2 integration id for the BFF."
  value       = aws_apigatewayv2_integration.bff.id
}
