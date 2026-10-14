locals {
  env_config = read_terragrunt_config(find_in_parent_folders("_env.hcl"))
}

generate "provider" {
  path      = "provider.generated.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<-EOF
    provider "azurerm" {
      features {}
      subscription_id = ${jsonencode(local.env_config.locals.azure_subscription_id)}
    }
  EOF
}

inputs = {
  location = local.env_config.locals.azure_location
}
