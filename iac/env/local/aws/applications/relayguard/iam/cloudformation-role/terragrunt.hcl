include "root" { path = find_in_parent_folders("root.hcl") }
include "env" { path = find_in_parent_folders("_env.hcl") }
include "provider" { path = "${dirname(find_in_parent_folders("root.hcl"))}/_providers/aws-local.hcl" }

terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../terraform-modules//aws/iam-role"
}

inputs = {
  role_name = "relayguard-local-cloudformation"
  assume_role_policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudformation.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  inline_policy_name = "relayguard-local-application-deploy"
  inline_policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "apigateway:*", "cloudformation:*", "events:*", "iam:*", "lambda:*",
        "logs:*", "scheduler:*", "sns:*", "sqs:*", "states:*"
      ]
      Resource = "*"
    }]
  })
}
