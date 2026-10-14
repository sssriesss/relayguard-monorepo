# RelayGuard infrastructure

This directory contains reusable Terraform modules and independently deployable
Terragrunt units for AWS, GCP, Azure, and LocalStack.

## Requirements

| Tool                  | Version                                          |
| --------------------- | ------------------------------------------------ |
| Terraform             | `>= 1.6, < 2.0`                                  |
| Terragrunt            | `1.x`                                            |
| Docker                | Current stable release for the local environment |
| LocalStack auth token | Required for the complete local environment      |

Cloud deployments also require credentials for the target provider:

- AWS: the standard AWS SDK credential chain;
- GCP: Application Default Credentials and an existing project;
- Azure: an authenticated Azure CLI session or service-principal environment.

Provider versions are pinned exactly in each module's `versions.tf`.

## Structure

```text
iac/
├── env/
│   ├── _providers/                 Generated provider configuration
│   ├── local/                      LocalStack and complete RelayGuard foundation
│   ├── dev/                        Multi-cloud storage examples
│   ├── prod/                       Multi-cloud storage examples
│   ├── remote-state/               Local state, ignored by Git
│   └── root.hcl                    Shared state configuration
└── terraform-modules/
    ├── aws/
    ├── azure/
    └── gcp/
```

Every resource unit has independent state. Run Terragrunt from the exact unit
or application directory you intend to operate.

## Validate without deploying

From `iac/`:

```sh
terraform fmt -check -recursive terraform-modules
terragrunt hcl fmt --check
terragrunt hcl validate
```

Inspect the fully resolved configuration of one unit:

```sh
cd env/dev/gcp/storage-bucket/public
terragrunt render --format json
```

Initialize and validate a module without creating a backend or cloud resources:

```sh
terragrunt run -- init -backend=false
terragrunt run -- validate
```

Initialization downloads providers and therefore requires internet access.

## Complete local AWS environment

The local environment uses Docker and LocalStack. It includes the complete
RelayGuard foundation plus independent public and private S3 examples.

### Configure the token

For interactive use, leave `auth_token = ""` in
`env/local/aws/localstack/terragrunt.hcl` and let Terraform prompt for it:

```sh
cd env/local/aws/localstack
terragrunt run -- apply
```

For non-interactive use, provide the sensitive input through the process
environment:

```sh
export TF_VAR_auth_token='<your-localstack-token>'
```

Never commit the token. Although Terraform marks it as sensitive, its value is
stored in local state.

### Provision RelayGuard

From `iac/`:

```sh
cd env/local/aws/applications/relayguard
terragrunt run --all --non-interactive -- apply -auto-approve
```

Terragrunt follows the dependency graph and creates:

- the LocalStack runtime;
- DynamoDB jobs and idempotency storage;
- work, dead-letter, and scheduler queues;
- an SNS operations topic and EventBridge bus;
- the Serverless deployment bucket;
- IAM deployment and runtime-boundary policies;
- Secrets Manager containers with local fixture versions;
- the SSM contract consumed by `backend/serverless.yml`;
- CloudWatch queue alarms.

After the foundation is ready, deploy the application from `backend/`:

```sh
export SERVERLESS_ACCESS_KEY='<your-serverless-access-key>'
npm run deploy:local
npm run test:e2e
```

LocalStack listens at `http://127.0.0.1:4566`. The managed container is named
`iac-demo-localstack`.

### Provision the S3 examples

```sh
cd env/local/aws/s3/private
terragrunt run -- apply

cd ../public
terragrunt run -- apply
```

The public/private distinction demonstrates configuration intent. LocalStack
license capabilities can affect IAM enforcement, so validate access control in
real AWS before relying on it.

### Remove local resources

First remove the Serverless stack from `backend/`:

```sh
npm run remove:local
```

Then destroy the RelayGuard dependency graph:

```sh
cd ../iac/env/local/aws/applications/relayguard
terragrunt run --all --non-interactive -- destroy -auto-approve
```

Destroy any independently created S3 example units before destroying their
LocalStack dependency. Destroying the LocalStack unit also deletes its managed
data volume.

## AWS, GCP, and Azure examples

The `dev` and `prod` folders contain public and private object-storage units.
Before using them:

1. Replace the example GCP project and Azure subscription IDs in the selected
   environment's `_env.hcl`.
2. Confirm the region and location values.
3. Configure provider credentials outside the repository.
4. Replace the local state backend with an approved shared remote backend for
   team or production use.
5. Run `plan` and review it before every `apply`.

Example AWS workflow:

```sh
cd env/dev/aws/s3/private
terragrunt run -- init
terragrunt run -- plan
terragrunt run -- apply
```

Equivalent unit paths exist under `gcp/storage-bucket/` and
`azure/blob-storage/`.

The full RelayGuard application foundation has not yet been duplicated into
`dev` or `prod`. A real AWS deployment must first create stage-specific copies
of its durable resources, secret containers, IAM roles, and SSM parameters.

## State and safety

- State is stored under `env/remote-state/<environment>/...` and ignored by Git.
- Never operate across the entire `env/` tree when a specific unit is enough.
- Never share state, credentials, or resource references between environments.
- Generated providers, `.terragrunt-cache`, plans, and lockfiles are ignored.
- The example local backend is suitable for individual use, not team locking or
  disaster recovery.

For module ownership, naming, versioning, and extension rules, read
[guidelines.md](guidelines.md).
