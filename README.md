# High-Throughput Collaborative Workspace Dashboard

A real-time collaborative workspace platform built with Next.js, Express.js, PostgreSQL, Prisma, Socket.IO, Redis, and Sentry. The repository preserves the Phase 1 baseline and continues the Phase 2 work for optimistic collaboration, conflict-safe updates, live activity, notifications, and the interactive canvas.

## Stack

- Frontend: Next.js App Router, React, Tailwind CSS, Zustand
- Backend: Node.js, Express.js, TypeScript
- Database: PostgreSQL via Prisma ORM
- Real-time: Socket.IO
- Caching: Redis with graceful fallback behavior
- Monitoring: Sentry via environment-based configuration
- Deployment target: Vercel frontend, Render backend, Neon PostgreSQL

## Phase Status

### Phase 1
- Authentication and RBAC
- Workspace, project, board, column, and task lifecycle
- Kanban board UI
- JWT-based protected APIs

### Phase 2A
- Optimistic UI updates
- Offline sync queue
- Background synchronization
- API idempotency support

### Phase 2B
- Optimistic concurrency control
- Conflict resolution handling
- Presence and typing indicators
- Activity feed
- Notifications

### Phase 2C
- Collaboration canvas persistence
- Canvas CRUD and board-scoped collaboration
- Real-time cursor events and shared board activity

## Architecture

The system keeps PostgreSQL as the authoritative database for all durable application state. Redis is used as an optional caching and scaling layer while Socket.IO handles board-room collaboration. Frontend state is managed with Zustand and updates are optimistic with safe fallback and conflict reconciliation.

## Collaboration Features

- Workspace-based collaboration with member management
- Task CRUD with drag-and-drop positioning
- Version-aware optimistic concurrency checks
- Activity feed and notifications
- Board live presence and typing indicators
- Canvas for collaborative visual planning
- Error-safe offline queue synchronization
- Background synchronization and retry handling
- Conflict-resolution modal flow for version mismatches

## Environment Setup

### Backend
1. Copy backend/.env.example to backend/.env.
2. Set DATABASE_URL, JWT_SECRET, CLIENT_ORIGIN, and optional REDIS_URL and SENTRY_DSN.
3. Run:
   npm install
   npx prisma db push
4. Start the server:
   npm run dev

### Frontend
1. Copy frontend/.env.example to frontend/.env.local.
2. Set NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SOCKET_URL, and optional NEXT_PUBLIC_SENTRY_DSN.
3. Run:
   npm install
   npm run dev

## Redis and Sentry

- Redis is implemented with environment-based connection config and graceful no-op behavior when unavailable.
- Sentry is initialized only when a DSN is supplied in the environment.
- No secrets are committed to the repository.

## Performance

The local throughput validation measured 20 concurrent task creation requests in 3170 ms, averaging 158.50 ms per request and 6.31 req/sec. See [PERFORMANCE_REPORT.md](PERFORMANCE_REPORT.md) for the complete measured result and limitations.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the deployment workflow and operations details.

## Production Deployment

The Phase 2 application is publicly deployed and verified on the phase-2-development branch.

Frontend:
https://high-throughput-collaborative-works.vercel.app

Backend:
https://high-throughput-collaborative-workspace.onrender.com

Health check:
https://high-throughput-collaborative-workspace.onrender.com/health

GitHub:
https://github.com/Sharath5426/high-throughput-collaborative-workspace/tree/phase-2-development

This Phase 2 deployment is running publicly and is actively connected to the current Neon PostgreSQL database and managed Upstash Redis configuration, with Socket.IO enabled in production.

## Security

- Secret values must remain in environment variables only.
- .env, .env.local, and deployment secrets are not committed to source control.
- JWT secrets and Sentry DSNs must remain out of source code.
- The repository does not include production credentials.
