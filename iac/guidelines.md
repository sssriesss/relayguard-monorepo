# Infrastructure guidelines

This is the shared baseline for this repository and future infrastructure units.
The scaffold demonstrates private and public object storage on AWS, GCP, and Azure,
with independent dev/prod configuration. Inspecting and validating it requires no
cloud credentials. GCP project IDs and Azure subscription IDs are placeholders.
An AWS-only local environment runs LocalStack through Terraform's Docker provider
and composes application resources as independent Terragrunt units.

## Layout

```text
.
├── AGENTS.md
├── guidelines.md
├── .gitignore
├── env/
│   ├── root.hcl
│   ├── _providers/
│   │   ├── aws.hcl
│   │   ├── aws-local.hcl
│   │   ├── docker.hcl
│   │   ├── gcp.hcl
│   │   └── azure.hcl
│   ├── dev/
│   │   ├── _env.hcl
│   │   ├── aws/s3/
│   │   │   ├── private/terragrunt.hcl
│   │   │   └── public/terragrunt.hcl
│   │   ├── gcp/storage-bucket/
│   │   │   ├── private/terragrunt.hcl
│   │   │   └── public/terragrunt.hcl
│   │   └── azure/blob-storage/
│   │       ├── private/terragrunt.hcl
│   │       └── public/terragrunt.hcl
│   ├── local/
│   │   ├── _env.hcl
│   │   └── aws/
│   │       ├── localstack/terragrunt.hcl
│   │       ├── s3/{private,public}/terragrunt.hcl
│   │       └── applications/relayguard/
│   │           ├── dynamodb/jobs/terragrunt.hcl
│   │           ├── sqs/{work,work-dlq,scheduler-dlq}/terragrunt.hcl
│   │           ├── sns/operations/terragrunt.hcl
│   │           ├── eventbridge/events/terragrunt.hcl
│   │           ├── s3/deployments/terragrunt.hcl
│   │           ├── secrets-manager/*/terragrunt.hcl
│   │           ├── iam/*/terragrunt.hcl
│   │           ├── cloudwatch/queue-alarms/terragrunt.hcl
│   │           ├── ssm/contract/terragrunt.hcl
│   └── prod/
│       ├── _env.hcl
│       ├── aws/s3/{private,public}/terragrunt.hcl
│       ├── gcp/storage-bucket/{private,public}/terragrunt.hcl
│       └── azure/blob-storage/{private,public}/terragrunt.hcl
└── terraform-modules/
    ├── aws/{localstack,s3,dynamodb,sqs,sns,eventbridge}/
    ├── aws/{secrets-manager,iam-policy,iam-role}/
    ├── aws/{cloudwatch-sqs-alarms,ssm-parameters}/
    ├── gcp/storage-bucket/
    └── azure/blob-storage/
```

Each module contains `main.tf`, `variables.tf`, `outputs.tf`, and `versions.tf`.
Provider initialization creates a local `.terraform.lock.hcl` for each unit;
these files are ignored by Git.

## Responsibilities and DRY boundaries

- `env/root.hcl` owns cloud-independent state configuration. It generates no
  cloud provider and contains no resource-specific inputs.
- `env/_providers/<cloud>.hcl` generates only that cloud's provider. It reads
  provider settings from the nearest environment's `_env.hcl` and passes global
  location settings to modules when needed. `docker.hcl` configures the local
  Docker daemon; `aws-local.hcl` routes local AWS requests to LocalStack.
- `env/<environment>/_env.hcl` owns settings shared across that environment:
  project name, environment identity, tags/labels, cloud regions, and account or
  project IDs. It contains no bucket names, visibility, versioning, storage class,
  replication settings, or other resource-specific configuration.
- `env/<environment>/<cloud>/<service>/<resource>/terragrunt.hcl` includes
  `root.hcl`, `_env.hcl`, and its provider file, selects a module, and defines
  resource-specific `inputs`.
- `terraform-modules/<cloud>/<service>/` contains reusable Terraform resources,
  typed inputs, outputs, and provider version requirements. Modules contain no
  configured providers, backends, credentials, or hardcoded environment values.
- Reuse resource logic through modules. Keep thin units explicit so resources
  can be configured and operated independently.

Common tags use lowercase keys compatible with GCP labels: `project`,
`environment`, and `managed_by`. AWS/Azure modules apply them as tags; GCP
applies them as labels. Custom labels must also satisfy GCP's label constraints.

## Environment and state isolation

Units read only their nearest `_env.hcl`. State paths include the full environment,
cloud, service, and resource path:

```text
env/remote-state/dev/aws/s3/private/terraform.tfstate
env/remote-state/dev/gcp/storage-bucket/public/terraform.tfstate
env/remote-state/dev/azure/blob-storage/private/terraform.tfstate
env/remote-state/prod/aws/s3/private/terraform.tfstate
```

The backend uses `path_relative_to_include("root")` so the cloud provider include
cannot change how the state path is resolved. State stays outside the disposable
`.terragrunt-cache` directory.

This is local isolation for a scaffold. Real account/project/subscription
boundaries and a shared remote backend must be configured separately before team
deployment. Replace the example identities in each `_env.hcl` with the intended
environment's actual identities. Credentials belong outside source files.

Operate from the intended unit directory. Avoid running changes across the entire
`env/` tree. Do not reference dev resources or state from prod. Never commit
credentials, state, caches, saved plans, provider lockfiles, or actual token values.

The earlier AWS-only paths were `env/<environment>/s3/<resource>` and
`terraform-modules/s3`; they now live under `aws/`. No state existed when this
scaffold was reorganized. If adapting this pattern to deployed infrastructure,
migrate existing state deliberately before using the new unit paths.

## Resource configuration

For example, `env/dev/gcp/storage-bucket/public/terragrunt.hcl` contains:

```hcl
inputs = {
  bucket_name        = "public"
  is_public          = true
  versioning_enabled = true
  storage_class      = "STANDARD"
}
```

The private unit sets `is_public = false`. AWS uses `bucket_name`; Azure uses
`container_name` and `account_replication_type`. All resource settings stay in
their resource's `terragrunt.hcl`. Change environment-wide locations or identities
in `_env.hcl`.

| Cloud | Module behavior | Public access |
| --- | --- | --- |
| AWS | One S3 bucket, ACLs disabled, AES256 encryption, versioning | Bucket policy grants anonymous `s3:GetObject` only |
| GCP | One Cloud Storage bucket, uniform bucket access, versioning | IAM grants `allUsers` the `roles/storage.legacyObjectReader` role for reads without listing |
| Azure | One resource group, StorageV2 account, and blob container per unit, with versioning | Account permits anonymous access and container uses `blob` access for reads without listing |

Private is the module default. Private AWS buckets block all public access;
private GCP buckets enforce public access prevention; private Azure accounts
disable anonymous access and their containers use `private` access.
Private here refers to anonymous access, not private networking.

AWS bucket names have provider-generated suffixes. GCP buckets and Azure storage
accounts use persisted random suffixes to avoid global name collisions. Azure
storage account prefixes are normalized and truncated to meet its naming rules.
Each Azure unit owns its account so versioning and anonymous-access settings do
not affect a separate unit. Sharing accounts later requires an explicit shared
account module and dependencies.

Public access also depends on the cloud's account/organization policies. These
examples configure the resource-side intent and do not override higher-level
restrictions.

## Pinned provider versions and upgrades

Each module's `versions.tf` uses an exact provider constraint:

| Provider | Pinned version |
| --- | --- |
| `hashicorp/aws` | `6.68.0` |
| `hashicorp/google` | `7.46.1` |
| `hashicorp/azurerm` | `4.81.0` |
| `hashicorp/random` | `3.9.1` |
| `kreuzwerker/docker` | `4.6.0` |

For example, `version = "= 6.68.0"` allows only that AWS provider version.
Provider lockfiles remain ignored; these constraints prevent initialization from
automatically selecting newer provider releases even without a lockfile.

Provider pins live only in module `versions.tf` files. Environment configuration
and Terragrunt module source paths remain unchanged. Local modules follow the
repository checkout.

To upgrade a provider, explicitly change its exact constraint in the relevant
`versions.tf`, initialize providers, and validate the module. Keep the Random
provider pin consistent across GCP and Azure. Review a plan when a cloud setup
is available before applying an upgrade.

## Local AWS with LocalStack

`terraform-modules/aws/localstack/` manages the LocalStack image, a named data
volume, and a Docker container. Its unit owns the container name, pinned image,
gateway port, enabled AWS services, persistence, and Docker socket integration
needed for Lambda execution. It waits for every configured service to become
available.

The image is pinned to LocalStack `2026.08.3` and its published digest. Changing
the image is an explicit resource input change. The Docker provider version is
pinned in the module's `versions.tf`.

Environment-wide identity, region, labels, and Docker host live in
`env/local/_env.hcl`. It is the single source for the emulator endpoints,
non-secret dummy identity, and local-only RelayGuard secret fixtures. The shared
`aws-local.hcl` provider reads those values and depends on the LocalStack unit.
Application modules contain no provider configuration or credentials. The SSM
contract passes the container-reachable endpoint to the Serverless backend.

### Token configuration

Configure the token directly in `env/local/aws/localstack/terragrunt.hcl`:

```hcl
auth_token = ""
```

An empty or whitespace-only value is omitted from the Terraform inputs, so the
required sensitive variable is prompted for during interactive plan/apply.
A nonempty value on that same line is passed directly. Keep the committed value
empty; do not commit a real token. There is no separate secret-config file.

For interactive use, run `terragrunt run -- apply` without `-input=false`.
For automation, explicitly supply the sensitive Terraform input through
`TF_VAR_auth_token` in the process environment. `-input=false` fails with a
missing-variable error when no token is supplied. Initialization, HCL rendering,
and Terraform validation do not need the token.

The module marks the token input sensitive so Terraform hides it in normal CLI
output. Docker environment values are still stored in local Terraform state.
Keep `env/remote-state/`, caches, and saved plans private, and do not share the LocalStack
unit's rendered configuration when the token input is filled, as it includes its inputs. Token activation
contacts LocalStack's licensing service; local AWS API calls target localhost.

The supplied token activated a freemium license. Live tests verified signed
uploads/downloads, versioning, encryption, and the configured bucket access
settings, but anonymous reads from the private bucket still returned HTTP 200.
This local setup therefore does not validate private-access enforcement.
LocalStack documents IAM enforcement as a Base/Ultimate feature; an eligible
license and another live access test are needed before relying on it for
permission testing. See [IAM policy enforcement](https://docs.localstack.cloud/aws/developer-tools/security-testing/iam-policy-enforcement/).

### Running locally

Docker must be running and the token must be valid. From the repository root,
create LocalStack, then apply either individual units or the RelayGuard
dependency graph:

```sh
(cd env/local/aws/localstack && terragrunt run -- apply)
(cd env/local/aws/s3/private && terragrunt run -- apply)
(cd env/local/aws/s3/public && terragrunt run -- apply)
(cd env/local/aws/applications/relayguard && terragrunt run --all --non-interactive -- apply -auto-approve)
```

The container is `iac-demo-localstack`. Its health endpoint is
`http://127.0.0.1:4566/_localstack/health`. Local configuration comes from
`env/local/_env.hcl`; the backend E2E suite reads that file directly while the
test implementation remains owned by the backend application.

All environments keep their backend data under the single global
`env/remote-state/` root. Terragrunt namespaces every independently deployable
unit beneath its environment (`env/remote-state/local/...`,
`env/remote-state/dev/...`, `env/remote-state/prod/...`), and Terraform's local
backend locks the relevant state during operations. The state tree is ignored
by Git and must not contain Terraform source code.
Initialize/validate without starting containers using the normal commands
below. Dependency mocks are allowed for init, validate, and render only;
applying local AWS units requires actual LocalStack outputs.

State is independent for every unit. RelayGuard resources have separate state
files beneath their service paths, for example:

```text
env/remote-state/local/aws/localstack/terraform.tfstate
env/remote-state/local/aws/s3/private/terraform.tfstate
env/remote-state/local/aws/s3/public/terraform.tfstate
env/remote-state/local/aws/applications/relayguard/dynamodb/jobs/terraform.tfstate
env/remote-state/local/aws/applications/relayguard/sqs/work/terraform.tfstate
env/remote-state/local/aws/applications/relayguard/ssm/contract/terraform.tfstate
```

For teardown, remove the Serverless application stack, destroy the RelayGuard
Terragrunt graph, remove objects and versions from the example buckets, destroy
the bucket units, and finally destroy the LocalStack unit. Destroying LocalStack
also removes its Terraform-managed data volume. Dev/prod units continue to
target their real cloud providers; run local commands only under `env/local/`.

## Local checks without cloud access

Use Terraform 1.6+ (below 2.0) and Terragrunt 1.x. From the repository root:

```sh
terraform fmt -check -recursive terraform-modules
terragrunt hcl fmt --check
terragrunt hcl validate
```

Inspect a unit's resolved inputs, provider, module source, and backend:

```sh
(cd env/dev/gcp/storage-bucket/public && terragrunt render --format json)
```

Initialize providers and validate a unit without initializing its backend:

```sh
(
  cd env/dev/gcp/storage-bucket/public
  terragrunt run -- init -backend=false && terragrunt run -- validate
)
```

Repeat from any other unit directory. Initialization downloads providers from
their registries and needs internet access. These checks do not authenticate to
cloud accounts or create infrastructure. For dev/prod, `plan`, `apply`, and
`destroy` require an explicitly configured cloud setup and are outside the
structure-only workflow. The local environment uses the Docker/LocalStack
workflow above.

## Extending the example

For another environment, copy an environment folder and update its `_env.hcl`
identity and values. Keep its folder name and `environment` value aligned.
For another resource, add a thin unit under the appropriate environment/cloud/
service and define its inputs there. For another service, add a focused module
and units using it. For another cloud, add one shared provider file and a cloud
folder under both modules and environments. Document new conventions here.

References: [Terragrunt HCL blocks](https://docs.terragrunt.com/reference/hcl/blocks/),
[GCP public object access](https://docs.cloud.google.com/storage/docs/access-control/making-data-public),
[Azure anonymous blob access](https://learn.microsoft.com/en-us/azure/storage/blobs/anonymous-read-access-configure).
