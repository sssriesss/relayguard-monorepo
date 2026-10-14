locals {
  environment  = "dev"
  project_name = "iac-demo"
  aws_region   = "eu-west-1"

  gcp_project_id        = "iac-demo-dev-example"
  gcp_region            = "europe-west1"
  azure_subscription_id = "00000000-0000-0000-0000-000000000000"
  azure_location        = "westeurope"
}

inputs = {
  project_name = local.project_name
  environment  = local.environment
  aws_region   = local.aws_region

  common_tags = {
    project     = local.project_name
    environment = local.environment
    managed_by  = "terragrunt"
  }
}
