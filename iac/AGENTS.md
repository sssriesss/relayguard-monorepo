# Project instructions

Read [guidelines.md](guidelines.md) before changing this project. It is the shared
baseline for the folder layout, environment isolation, and Terraform/Terragrunt conventions.

Pin providers to exact versions in each module's `versions.tf`.
Change provider versions explicitly and validate the modules before using an upgrade.

Configure the LocalStack token only through its unit's `auth_token` input. Keep
the committed value empty so Terraform prompts interactively; never print or
commit actual token values. Local AWS units use `_providers/aws-local.hcl` and depend
on the LocalStack Docker unit; they must not use the real AWS provider settings.
