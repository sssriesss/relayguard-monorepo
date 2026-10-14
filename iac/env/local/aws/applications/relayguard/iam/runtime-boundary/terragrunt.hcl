include "root" { path = find_in_parent_folders("root.hcl") }
include "env" { path = find_in_parent_folders("_env.hcl") }
include "provider" { path = "${dirname(find_in_parent_folders("root.hcl"))}/_providers/aws-local.hcl" }

terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../terraform-modules//aws/iam-policy"
}

inputs = {
  policy_name = "relayguard-local-runtime-boundary"
  description = "Maximum permissions available to RelayGuard application roles."
  policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query", "dynamodb:UpdateItem", "dynamodb:TransactWriteItems",
        "events:PutEvents", "lambda:InvokeFunction", "logs:*", "secretsmanager:GetSecretValue",
        "sqs:ChangeMessageVisibility", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:ReceiveMessage", "sqs:SendMessage",
        "states:StartExecution"
      ]
      Resource = "*"
    }]
  })
}
