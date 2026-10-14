include "root" {
  path = find_in_parent_folders("root.hcl")
}

include "env" {
  path = find_in_parent_folders("_env.hcl")
}

include "provider" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/_providers/azure.hcl"
}

terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../terraform-modules//azure/blob-storage"
}

inputs = {
  container_name           = "public"
  is_public                = true
  versioning_enabled       = true
  account_replication_type = "LRS"
}
