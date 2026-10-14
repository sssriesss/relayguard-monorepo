locals {
  env_config = read_terragrunt_config(find_in_parent_folders("_env.hcl"))
}

dependency "localstack" {
  config_path = "${dirname(find_in_parent_folders("_env.hcl"))}/aws/localstack"

  mock_outputs = {
    endpoint = "http://127.0.0.1:4566"
  }
  mock_outputs_allowed_terraform_commands = ["init", "validate", "render"]
}

generate "provider" {
  path      = "provider.generated.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<-EOF
    provider "aws" {
      region     = ${jsonencode(local.env_config.locals.aws_region)}
      access_key = ${jsonencode(local.env_config.locals.localstack.access_key)}
      secret_key = ${jsonencode(local.env_config.locals.localstack.secret_key)}

      skip_credentials_validation = true
      skip_metadata_api_check     = true
      skip_region_validation      = true
      skip_requesting_account_id  = true
      s3_use_path_style           = true

      endpoints {
        apigateway     = ${jsonencode(local.env_config.locals.localstack.host_endpoint)}
        cloudformation = ${jsonencode(local.env_config.locals.localstack.host_endpoint)}
        cloudwatch     = ${jsonencode(local.env_config.locals.localstack.host_endpoint)}
        dynamodb       = ${jsonencode(local.env_config.locals.localstack.host_endpoint)}
        events         = ${jsonencode(local.env_config.locals.localstack.host_endpoint)}
        iam            = ${jsonencode(local.env_config.locals.localstack.host_endpoint)}
        lambda         = ${jsonencode(local.env_config.locals.localstack.host_endpoint)}
        logs           = ${jsonencode(local.env_config.locals.localstack.host_endpoint)}
        s3             = ${jsonencode(local.env_config.locals.localstack.host_endpoint)}
        scheduler      = ${jsonencode(local.env_config.locals.localstack.host_endpoint)}
        secretsmanager = ${jsonencode(local.env_config.locals.localstack.host_endpoint)}
        sns            = ${jsonencode(local.env_config.locals.localstack.host_endpoint)}
        sqs            = ${jsonencode(local.env_config.locals.localstack.host_endpoint)}
        ssm            = ${jsonencode(local.env_config.locals.localstack.host_endpoint)}
        stepfunctions  = ${jsonencode(local.env_config.locals.localstack.host_endpoint)}
        sts            = ${jsonencode(local.env_config.locals.localstack.host_endpoint)}
      }
    }
  EOF
}
