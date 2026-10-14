include "root" { path = find_in_parent_folders("root.hcl") }
include "env" { path = find_in_parent_folders("_env.hcl") }
include "provider" { path = "${dirname(find_in_parent_folders("root.hcl"))}/_providers/aws-local.hcl" }

dependency "dlq" {
  config_path                             = "../work-dlq"
  mock_outputs                            = { queue_arn = "arn:aws:sqs:eu-west-1:000000000000:relayguard-local-work-dlq" }
  mock_outputs_allowed_terraform_commands = ["init", "validate", "render"]
}

terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../terraform-modules//aws/sqs"
}

inputs = {
  queue_name                 = "relayguard-local-work"
  visibility_timeout_seconds = 180
  message_retention_seconds  = 345600
  receive_wait_time_seconds  = 10
  dead_letter_target_arn     = dependency.dlq.outputs.queue_arn
  max_receive_count          = 5
}
