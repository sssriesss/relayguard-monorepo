locals {
  env_config = read_terragrunt_config(find_in_parent_folders("_env.hcl"))
}

generate "provider" {
  path      = "provider.generated.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<-EOF
    provider "aws" {
      region = ${jsonencode(local.env_config.locals.aws_region)}
    }
  EOF
}
