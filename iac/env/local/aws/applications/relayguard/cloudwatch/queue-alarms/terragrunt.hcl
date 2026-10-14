include "root" { path = find_in_parent_folders("root.hcl") }
include "env" { path = find_in_parent_folders("_env.hcl") }
include "provider" { path = "${dirname(find_in_parent_folders("root.hcl"))}/_providers/aws-local.hcl" }

dependency "work" {
  config_path                             = "../../sqs/work"
  mock_outputs                            = { queue_name = "relayguard-local-work" }
  mock_outputs_allowed_terraform_commands = ["init", "validate", "render"]
}
dependency "work_dlq" {
  config_path                             = "../../sqs/work-dlq"
  mock_outputs                            = { queue_name = "relayguard-local-work-dlq" }
  mock_outputs_allowed_terraform_commands = ["init", "validate", "render"]
}
dependency "scheduler_dlq" {
  config_path                             = "../../sqs/scheduler-dlq"
  mock_outputs                            = { queue_name = "relayguard-local-scheduler-dlq" }
  mock_outputs_allowed_terraform_commands = ["init", "validate", "render"]
}
dependency "operations" {
  config_path                             = "../../sns/operations"
  mock_outputs                            = { topic_arn = "arn:aws:sns:eu-west-1:000000000000:relayguard-local-operations" }
  mock_outputs_allowed_terraform_commands = ["init", "validate", "render"]
}

terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../terraform-modules//aws/cloudwatch-sqs-alarms"
}

inputs = {
  alarm_topic_arn = dependency.operations.outputs.topic_arn
  queue_alarms = {
    work = {
      queue_name      = dependency.work.outputs.queue_name
      description     = "RelayGuard work is waiting for processing."
      max_age_seconds = 300
    }
    work_dlq = {
      queue_name  = dependency.work_dlq.outputs.queue_name
      description = "RelayGuard work reached its dead-letter queue."
    }
    scheduler_dlq = {
      queue_name  = dependency.scheduler_dlq.outputs.queue_name
      description = "RelayGuard reconciliation invocation reached its dead-letter queue."
    }
  }
}
