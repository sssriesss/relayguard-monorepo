locals {
  env_config = read_terragrunt_config(find_in_parent_folders("_env.hcl"))
}

generate "provider" {
  path      = "provider.generated.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<-EOF
    provider "google" {
      project = ${jsonencode(local.env_config.locals.gcp_project_id)}
      region  = ${jsonencode(local.env_config.locals.gcp_region)}
    }
  EOF
}

inputs = {
  location = local.env_config.locals.gcp_region
}
