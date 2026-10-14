# RelayGuard backend

RelayGuard is a Python 3.12 webhook reliability service deployed with
Serverless Framework. It authenticates incoming events, acknowledges them only
after durable persistence, and processes delivery through an auditable AWS Step
Functions workflow.

## Runtime components

| Component | Responsibility |
| --- | --- |
| API Lambda | Health, webhook intake, job status, and replay endpoints |
| DynamoDB stream Lambda | Publishes transactional outbox records to SQS |
| Workflow starter Lambda | Claims queued attempts and starts Step Functions |
| Normalize Lambda | Validates and normalizes supported event types |
| Delivery Lambda | Sends idempotent HTTPS requests to the configured target |
| Reconciler Lambda | Recovers stale work and flags ambiguous executions |
| Step Functions | Coordinates delivery, retries, status, history, and events |

Terraform owns the durable foundation. `serverless.yml` owns Lambda functions,
API Gateway, event-source mappings, the state machine, application event rules,
and the reconciliation schedule. SSM Parameter Store is the contract between
the two stacks.

## Requirements

- Python 3.12 or newer;
- Node.js 20 LTS or newer and npm;
- a Serverless Framework access key or license key for packaging and deployment;
- the infrastructure requirements from [`iac/README.md`](../iac/README.md);
- Docker and a LocalStack auth token for local E2E tests;
- AWS credentials and a provisioned stage contract for real AWS deployments.

## Install dependencies

From `backend/`:

```sh
python3.12 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -e '.[dev]'
npm ci
```

## Development commands

```sh
npm run test
npm run lint
npm run format:check
npm run check
```

`npm run test` runs isolated unit and integration-style tests and excludes the
deployed E2E suite. It does not require LocalStack or cloud credentials.

## Deploy locally

Provision the local foundation first, from the repository root:

```sh
export TF_VAR_auth_token='<your-localstack-token>'
export SERVERLESS_ACCESS_KEY='<your-serverless-access-key>'
cd iac/env/local/aws/applications/relayguard
terragrunt run --all --non-interactive -- apply -auto-approve
cd ../../../../../../backend
```

Then package or deploy the Serverless application:

```sh
npm run package
npm run deploy:local
```

Serverless Framework v4 requires `SERVERLESS_ACCESS_KEY` or
`SERVERLESS_LICENSE_KEY`. The local commands route all AWS SDK requests to
LocalStack through `AWS_ENDPOINT_URL`; override the default endpoint with
`RELAYGUARD_AWS_ENDPOINT_URL` when necessary.

Run the deployed E2E suite:

```sh
npm run test:e2e
```

The suite verifies health, HMAC rejection, operator authorization,
idempotency conflicts, transient retries, permanent failure, replay, and
persisted history against the deployed application.

Remove the application stack before destroying its Terraform foundation:

```sh
npm run remove:local
```

## HTTP API

| Method | Route | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | None | Service health |
| `POST` | `/v1/webhooks/{source}` | HMAC signature and timestamp | Accept an event |
| `GET` | `/v1/jobs/{job_id}` | Operator token | Read status and history |
| `POST` | `/v1/jobs/{job_id}/replay` | Operator token | Replay a failed job |

Webhook requests use the headers `X-RelayGuard-Signature` and
`X-RelayGuard-Timestamp`. Operator endpoints use `Authorization: Bearer <token>`.
The local fixture values live in `iac/env/local/_env.hcl` and are intended only
for automated local testing.

## Configuration contract

Serverless Framework resolves infrastructure values from
`/relayguard/<stage>/`. A deployable stage must provide these parameters:

| Group | Required values |
| --- | --- |
| DynamoDB | `infra/dynamodb/table_name`, `table_arn`, `stream_arn` |
| SQS | `infra/sqs/work_queue_url`, `work_queue_arn`, `scheduler_dlq_arn` |
| EventBridge and SNS | `infra/eventbridge/bus_name`, `bus_arn`, `infra/sns/operations_topic_arn` |
| Deployment | `infra/deployment/bucket_name`, `cloudformation_role_arn` |
| IAM | `infra/iam/runtime_permissions_boundary_arn` |
| Secrets | `infra/secrets/webhook_signing_arn`, `operator_token_arn`, `outbound_token_arn` |
| Runtime | `config/allowed_event_types`, `external_target_url`, `job_retention_days`, `stuck_after_minutes`, `signature_tolerance_seconds` |

The optional `infra/aws/endpoint_url` parameter is used by LocalStack. It should
be empty for AWS.

Secret ARN parameters point to Secrets Manager resources. The secret values
themselves must be delivered through a secure process and must never be stored
in Git or ordinary SSM string parameters.

## Deploy to AWS

The repository includes the complete foundation only for the local stage. To
deploy a real stage, first reproduce that foundation in the target AWS account,
use a shared remote Terraform backend, populate the SSM contract, and deliver
the three secret values. Then verify the deployment role and runtime permissions
boundary before running:

```sh
npx serverless print --stage dev --region eu-west-1
npx serverless deploy --stage dev --region eu-west-1
```

For production, also configure account-level observability, alert subscribers,
backup and retention requirements, API throttling, and identity-based operator
authorization. The current bearer operator token is an MVP boundary.

## Source layout

```text
backend/
├── src/relayguard/                  Application and Lambda handlers
├── tests/                           Isolated test suite
├── tests/e2e/                       Deployed local environment tests
├── ARCHITECTURE.md                  Code organization and design principles
├── serverless.yml                   Application infrastructure
├── state-machine.asl.json           Workflow definition
├── pyproject.toml                   Python package and tooling
└── package.json                     Serverless dependencies and commands
```

## Delivery guarantees

RelayGuard provides durable acceptance, at-least-once processing, and a stable
outbound idempotency key. A destination must honor that key to achieve an
effectively-once business side effect. Network ambiguity makes universal
exactly-once HTTP delivery impossible.

The local E2E receiver is test support. It is conditionally excluded from
non-local stages and is not part of the production application contract.
