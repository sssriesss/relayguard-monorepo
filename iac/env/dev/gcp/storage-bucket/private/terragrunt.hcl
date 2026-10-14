include "root" {
  path = find_in_parent_folders("root.hcl")
}

include "env" {
  path = find_in_parent_folders("_env.hcl")
}

include "provider" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/_providers/gcp.hcl"
}

terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../terraform-modules//gcp/storage-bucket"
}

inputs = {
  bucket_name        = "private"
  is_public          = false
  versioning_enabled = true
  storage_class      = "STANDARD"
}
