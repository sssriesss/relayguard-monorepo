output "parameter_arns" {
  value = { for key, parameter in aws_ssm_parameter.this : key => parameter.arn }
}
