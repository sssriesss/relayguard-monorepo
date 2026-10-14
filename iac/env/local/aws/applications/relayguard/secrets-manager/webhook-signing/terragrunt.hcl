locals {
  env_config = read_terragrunt_config(find_in_parent_folders("_env.hcl"))
}

include "root" { path = find_in_parent_folders("root.hcl") }
include "env" { path = find_in_parent_folders("_env.hcl") }
include "provider" { path = "${dirname(find_in_parent_folders("root.hcl"))}/_providers/aws-local.hcl" }

terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/../terraform-modules//aws/secrets-manager"
}

inputs = {
  secret_name             = "relayguard-local/webhook-signing"
  description             = "HMAC signing secret for RelayGuard webhook intake."
  recovery_window_in_days = 0
  secret_string           = local.env_config.locals.relayguard_secrets.webhook_signing
}
