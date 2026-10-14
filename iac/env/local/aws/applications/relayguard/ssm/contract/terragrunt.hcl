locals {
  env_config = read_terragrunt_config(find_in_parent_folders("_env.hcl"))
}

include "root" { path = find_in_parent_folders("root.hcl") }
include "env" { path = find_in_parent_folders("_env.hcl") }
include "provider" { path = "${dirname(find_in_parent_folders("root.hcl"))}/_providers/aws-local.hcl" }

dependency "jobs" {
  config_path = "../../dynamodb/jobs"
  mock_outputs = {
    table_name = "relayguard-local-jobs"
    table_arn  = "arn:aws:dynamodb:eu-west-1:000000000000:table/relayguard-local-jobs"
    stream_arn = "arn:aws:dynamodb:eu-west-1:000000000000:table/relayguard-local-jobs/stream/mock"
  }
  mock_outputs_allowed_terraform_commands = ["init", "validate", "render"]
}
dependency "work" {
  config_path = "../../sqs/work"
  mock_outputs = {
    queue_url = "http://localhost:4566/000000000000/relayguard-local-work"
    queue_arn = "arn:aws:sqs:eu-west-1:000000000000:relayguard-local-work"
  }
  mock_outputs_allowed_terraform_commands = ["init", "validate", "render"]
}
dependency "work_dlq" {
  config_path                             = "../../sqs/work-dlq"
  mock_outputs                            = { queue_arn = "arn:aws:sqs:eu-west-1:000000000000:relayguard-local-work-dlq" }
  mock_outputs_allowed_terraform_commands = ["init", "validate", "render"]
}
dependency "scheduler_dlq" {
  config_path                             = "../../sqs/scheduler-dlq"
  mock_outputs                            = { queue_arn = "arn:aws:sqs:eu-west-1:000000000000:relayguard-local-scheduler-dlq" }
  mock_outputs_allowed_terraform_commands = ["init", "validate", "render"]
}
dependency "operations" {
  config_path                             = "../../sns/operations"
  mock_outputs                            = { topic_arn = "arn:aws:sns:eu-west-1:000000000000:relayguard-local-operations" }
  mock_outputs_allowed_terraform_commands = ["init", "validate", "render"]
}
dependency "events" {
  config_path = "../../eventbridge/events"
  mock_outputs = {
    bus_name = "relayguard-local"
    bus_arn  = "arn:aws:events:eu-west-1:000000000000:event-bus/relayguard-local"
  }
  mock_outputs_allowed_terraform_commands = ["init", "validate", "render"]
}
dependency "deployments" {
  config_path                             = "../../s3/deployments"
  mock_outputs                            = { bucket_name = "relayguard-local-deployments-mock" }
  mock_outputs_allowed_terraform_commands = ["init", "validate", "render"]
}
dependency "cloudformation_role" {
  config_path                             = "../../iam/cloudformation-role"
  mock_outputs                            = { role_arn = "arn:aws:iam::000000000000:role/relayguard-local-cloudformation" }
  mock_outputs_allowed_terraform_commands = ["init", "validate", "render"]
}
dependency "runtime_boundary" {
  config_path                             = "../../iam/runtime-boundary"
  mock_outputs                            = { policy_arn = "arn:aws:iam::000000000000:policy/relayguard-local-runtime-boundary" }
  mock_outputs_allowed_terraform_commands = ["init", "validate", "render"]
}
dependency "webhook_signing" {
  config_path                             = "../../secrets-manager/webhook-signing"
  mock_outputs                            = { secret_arn = "arn:aws:secretsmanager:eu-west-1:000000000000:secret:relayguard-local/webhook-signing-mock" }
  mock_outputs_allowed_terraform_commands = ["init", "validate", "render"]
}
dependency "operator_token" {
  config_path                             = "../../secrets-manager/operator-token"
  mock_outputs                            = { secret_arn = "arn:aws:secretsmanager:eu-west-1:000000000000:secret:relayguard-local/operator-token-mock" }
  mock_outputs_allowed_terraform_commands = ["init", "validate", "render"]
}
dependency "outbound_token" {
  config_path                             = "../../secrets-manager/outbound-token"
  mock_outputs                            = { secret_arn = "arn:aws:secretsmanager:eu-west-1:000000000000:secret:relayguard-local/outbound-token-mock" }
  mock_outputs_allowed_terraform_commands = ["init", "validate", "render"]
}

terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../terraform-modules//aws/ssm-parameters"
}

inputs = {
  path_prefix = "/relayguard/local"
  parameters = {
    "infra/contract_version"                     = "1"
    "infra/aws/account_id"                       = local.env_config.locals.aws_account_id
    "infra/aws/region"                           = local.env_config.locals.aws_region
    "infra/aws/endpoint_url"                     = local.env_config.locals.localstack.lambda_endpoint
    "infra/environment"                          = local.env_config.locals.environment
    "infra/dynamodb/table_name"                  = dependency.jobs.outputs.table_name
    "infra/dynamodb/table_arn"                   = dependency.jobs.outputs.table_arn
    "infra/dynamodb/stream_arn"                  = dependency.jobs.outputs.stream_arn
    "infra/sqs/work_queue_url"                   = dependency.work.outputs.queue_url
    "infra/sqs/work_queue_arn"                   = dependency.work.outputs.queue_arn
    "infra/sqs/work_dlq_arn"                     = dependency.work_dlq.outputs.queue_arn
    "infra/sqs/scheduler_dlq_arn"                = dependency.scheduler_dlq.outputs.queue_arn
    "infra/sns/operations_topic_arn"             = dependency.operations.outputs.topic_arn
    "infra/eventbridge/bus_name"                 = dependency.events.outputs.bus_name
    "infra/eventbridge/bus_arn"                  = dependency.events.outputs.bus_arn
    "infra/deployment/bucket_name"               = dependency.deployments.outputs.bucket_name
    "infra/deployment/cloudformation_role_arn"   = dependency.cloudformation_role.outputs.role_arn
    "infra/iam/runtime_permissions_boundary_arn" = dependency.runtime_boundary.outputs.policy_arn
    "infra/secrets/webhook_signing_arn"          = dependency.webhook_signing.outputs.secret_arn
    "infra/secrets/operator_token_arn"           = dependency.operator_token.outputs.secret_arn
    "infra/secrets/outbound_token_arn"           = dependency.outbound_token.outputs.secret_arn
    "config/external_target_url"                 = "https://unused.invalid"
    "config/job_retention_days"                  = "7"
    "config/stuck_after_minutes"                 = "10"
    "config/signature_tolerance_seconds"         = "300"
    "config/allowed_event_types"                 = "invoice.paid,customer.updated"
  }
}
