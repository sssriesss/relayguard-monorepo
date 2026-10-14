include "root" { path = find_in_parent_folders("root.hcl") }
include "env" { path = find_in_parent_folders("_env.hcl") }
include "provider" { path = "${dirname(find_in_parent_folders("root.hcl"))}/_providers/aws-local.hcl" }

terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../terraform-modules//aws/sqs"
}

inputs = {
  queue_name                = "relayguard-local-scheduler-dlq"
  message_retention_seconds = 1209600
}
