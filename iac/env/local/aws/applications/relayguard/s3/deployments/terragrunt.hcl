include "root" { path = find_in_parent_folders("root.hcl") }
include "env" { path = find_in_parent_folders("_env.hcl") }
include "provider" { path = "${dirname(find_in_parent_folders("root.hcl"))}/_providers/aws-local.hcl" }

terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../terraform-modules//aws/s3"
}

inputs = {
  project_name                       = "relayguard"
  bucket_name                        = "deployments"
  is_public                          = false
  versioning_enabled                 = true
  force_destroy                      = true
  expiration_days                    = 30
  noncurrent_version_expiration_days = 7
}
