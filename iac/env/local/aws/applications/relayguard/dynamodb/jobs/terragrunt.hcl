include "root" { path = find_in_parent_folders("root.hcl") }
include "env" { path = find_in_parent_folders("_env.hcl") }
include "provider" { path = "${dirname(find_in_parent_folders("root.hcl"))}/_providers/aws-local.hcl" }

terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../terraform-modules//aws/dynamodb"
}

inputs = {
  table_name = "relayguard-local-jobs"
  attributes = [
    { name = "PK", type = "S" },
    { name = "SK", type = "S" },
    { name = "GSI1PK", type = "S" },
    { name = "GSI1SK", type = "S" },
  ]
  hash_key  = "PK"
  range_key = "SK"
  global_secondary_indexes = [{
    name            = "status-updated-index"
    projection_type = "ALL"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
  }]
  stream_enabled                 = true
  stream_view_type               = "NEW_IMAGE"
  ttl_enabled                    = true
  ttl_attribute_name             = "expires_at"
  point_in_time_recovery_enabled = false
}
