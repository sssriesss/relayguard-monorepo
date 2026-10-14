# RelayGuard Console

The console is a Next.js operator UI for the RelayGuard API. It connects to a
local or AWS deployment, submits correctly signed webhook events, inspects job
history, replays recoverable jobs, and explains the serverless delivery path in
an interactive React Flow diagram.

The event lab generates unique contract-valid examples and sends the user
directly to the resulting job. Each job renders its own responsive React Flow
transaction graph from current status and persisted history. Selecting a graph
stage shows the backend evidence associated with that step.

## Requirements

- Node.js 20.9 or newer;
- pnpm 9.15 or newer, available through Corepack;
- a running RelayGuard API for live operations;
- the operator token for job lookup and replay;
- the webhook signing secret for the event lab.

The architecture view can be explored without connecting an API. The console
keeps connection details in browser session storage, so they disappear when the
tab session ends. Recent job IDs are stored locally. Credentials are not written
to the repository or server logs.

## Run locally

```sh
cd frontend
cp .env.example .env.local
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000` and enter the API base URL. For the LocalStack
deployment, use the endpoint printed by `npm run deploy:local` in `backend/`.

Development mode permits loopback API hosts automatically. For any other local
or cloud API, list its exact origin in `.env.local`:

```dotenv
RELAYGUARD_ALLOWED_API_ORIGINS=https://example.execute-api.eu-west-1.amazonaws.com
```

Multiple origins are comma-separated. The setting is an SSRF boundary for the
server-side API adapter and is required for every non-loopback host. Restart the
development server after changing it.

## Quality checks

```sh
pnpm format:check
pnpm lint
pnpm test
pnpm build
```

Run all three with `pnpm check`.

## Architecture

The source follows dependency inversion: domain entities have no framework
dependencies, application use cases depend on a repository contract,
infrastructure implements that contract, and components contain the React UI.

```text
src/
├── app/
│   ├── api/relayguard/route.ts
│   ├── architecture/page.tsx
│   ├── events/page.tsx
│   └── jobs/
│       ├── page.tsx
│       └── [id]/page.tsx
├── components/
│   ├── architecture/    System-level React Flow
│   ├── events/          Event generation and submission
│   ├── jobs/            Transaction graph, summary, and history
│   ├── layout/          Responsive navigation and shell
│   ├── providers/       Client composition and state
│   └── ui/              Reusable UI primitives
├── domain/
│   ├── entities/        RelayGuard entities and validation
│   └── repositories/    Repository contracts
├── application/
│   └── useCases/        Framework-independent application actions
├── infrastructure/
│   ├── errors/          Adapter error translation
│   └── repositories/    HTTP and browser repository implementations
└── test/                Shared test setup
```

The browser calls the local Next.js adapter at `/api/relayguard`. That adapter
validates the configured origin, adds bearer authentication, creates webhook
HMAC signatures, and forwards only the four operations supported by RelayGuard.
