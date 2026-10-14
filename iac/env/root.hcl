locals {
  state_dir = "${dirname(find_in_parent_folders("root.hcl"))}/remote-state"
}

remote_state {
  backend = "local"

  generate = {
    path      = "backend.generated.tf"
    if_exists = "overwrite_terragrunt"
  }

  config = {
    path = "${local.state_dir}/${path_relative_to_include("root")}/terraform.tfstate"
  }
}

