locals {
  environment    = "local"
  project_name   = "iac-demo"
  aws_region     = "eu-west-1"
  aws_account_id = "000000000000"
  docker_host    = "unix:///var/run/docker.sock"

  localstack = {
    access_key      = "test"
    secret_key      = "test"
    host_endpoint   = "http://127.0.0.1:4566"
    lambda_endpoint = "http://localhost.localstack.cloud:4566"
  }

  relayguard_secrets = {
    webhook_signing = "relayguard-local-webhook-signing"
    operator_token  = "relayguard-local-operator-token"
    outbound_token  = "relayguard-local-outbound-token"
  }
}

inputs = {
  project_name   = local.project_name
  environment    = local.environment
  aws_region     = local.aws_region
  aws_account_id = local.aws_account_id

  common_tags = {
    project     = local.project_name
    environment = local.environment
    managed_by  = "terragrunt"
  }
}
