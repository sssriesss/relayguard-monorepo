include "root" {
  path = find_in_parent_folders("root.hcl")
}

include "env" {
  path = find_in_parent_folders("_env.hcl")
}

include "provider" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/_providers/docker.hcl"
}

terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../terraform-modules//aws/localstack"
}

inputs = {
  for name, value in {
    container_name = "iac-demo-localstack"
    image          = "localstack/localstack:2026.08.3@sha256:4abc29e923e5ed8a63d6c705a9dfa74b15d560e7055845299d87b22dabf9f6e2"
    gateway_port   = 4566
    services = [
      "apigateway",
      "cloudformation",
      "cloudwatch",
      "dynamodb",
      "dynamodbstreams",
      "events",
      "iam",
      "lambda",
      "logs",
      "s3",
      "scheduler",
      "secretsmanager",
      "sns",
      "sqs",
      "ssm",
      "stepfunctions",
      "sts",
    ]
    mount_docker_socket = true
    auth_token          = ""
  } : name => value if name != "auth_token" || trimspace(tostring(value)) != ""
}
