# Deployment and Operations Guide

## Overview

This repository is a real-time collaborative workspace for project management, built with the following stack:

- Frontend: Next.js App Router, React, Tailwind CSS, Zustand
- Backend: Node.js, Express.js, TypeScript
- Database: PostgreSQL via Prisma ORM
- Real-time: Socket.IO with board rooms and presence updates
- Caching: Redis via a safe optional integration
- Monitoring: Sentry via environment-based configuration
- Hosting target: Vercel frontend, Render or Railway backend, Neon PostgreSQL

## Current Status

The local application implementation is verified and production-ready from a code and runtime perspective. Actual public deployment remains blocked until the user authenticates to the provider dashboards and configures deployment secrets manually. No production URLs are claimed as complete.

## Architecture

- PostgreSQL remains the source of truth for all durable application data.
- Redis is used for cache and optional Socket.IO scaling when REDIS_URL is configured.
- Socket.IO events are broadcast to board rooms for real-time task, presence, activity, canvas, and notification updates.
- JWT protects API access and workspace-level authorization is enforced server-side.
- Sentry captures errors only when the DSN is provided through environment variables.

## Phase Coverage

### Phase 1
- User registration and login
- JWT authentication
- Workspace and project creation
- Kanban board creation
- Task CRUD and board composition
- Protected routes and RBAC

### Phase 2A
- Optimistic task updates
- Offline sync queue
- Background synchronization
- API idempotency keys

### Phase 2B
- Optimistic concurrency control (OCC)
- Conflict resolution flow
- Presence and typing indicators
- Activity feed persistence
- Real-time notifications

### Phase 2C
- Collaboration canvas persistence
- Board-scoped canvas element CRUD
- Multi-user cursor events and board collaboration

## Local Setup

### Backend
1. Copy backend/.env.example to backend/.env and set values.
2. Ensure PostgreSQL is reachable.
3. Run:
   npm install
   npx prisma db push
   npm run dev

### Frontend
1. Copy frontend/.env.example to frontend/.env.local and set values.
2. Run:
   npm install
   npm run dev

## Environment Variables

### Backend
- PORT
- DATABASE_URL
- JWT_SECRET
- CLIENT_ORIGIN
- REDIS_URL
- SENTRY_DSN

### Frontend
- NEXT_PUBLIC_API_URL
- NEXT_PUBLIC_SOCKET_URL
- NEXT_PUBLIC_SENTRY_DSN

## Production Deployment Workflow

### Frontend (Vercel)
1. Sign in to Vercel with the project owner account.
2. Import the existing GitHub repository.
3. Set the frontend environment variables:
   - NEXT_PUBLIC_API_URL
   - NEXT_PUBLIC_SOCKET_URL
   - NEXT_PUBLIC_SENTRY_DSN
4. Deploy the project.
5. Verify the public frontend loads without localhost values.

### Backend (Render or Railway)
1. Sign in to Render or Railway using the relevant account.
2. Create a new service from the existing repository or connect the same repo.
3. Configure the backend environment variables:
   - PORT
   - DATABASE_URL
   - JWT_SECRET
   - CLIENT_ORIGIN
   - REDIS_URL if using managed Redis
   - SENTRY_DSN if monitoring is enabled
4. Ensure the service uses the same Neon PostgreSQL database and does not create a second database.
5. Verify the public health route returns success.

### PostgreSQL
- Keep the existing Neon PostgreSQL database.
- Do not reset or recreate the production database.
- Use the Neon connection string in the deployment environment only.
- Prefer SSL mode in production.

### Redis
- Use a managed Redis provider such as Upstash Redis if required.
- Configure REDIS_URL in the deployment environment.
- If Redis is unavailable, the app must continue safely without failing critical paths.

### Sentry
- Add a real Sentry DSN only if the user has created a project and has the DSN available.
- Do not invent a DSN or claim telemetry was verified without a real project.

## Monitoring and Reliability

- Sentry captures backend and frontend runtime errors when DSNs are configured.
- Redis is optional and should fail safely; the app continues working without cache if unavailable.
- The API keeps PostgreSQL as the source of truth and avoids writing ephemeral cursor state to the database.
- Socket.IO events remain board-scoped and designed for real-time collaboration only.

## Security Notes

- Never commit actual env files.
- Do not hardcode production credentials.
- Keep JWT secrets and Sentry DSNs in deployment secrets management.
- Restrict workspace access through server-side RBAC checks.
- Ensure database and secret values are never stored in repository files.

## Manual Deployment Blocker

The repository and runtime are ready for deployment, but the actual public deployment remains blocked on a manual provider-side action:

1. Authenticate to Vercel and Render or Railway.
2. Configure the project secrets and environment variables in those dashboards.
3. Trigger the deployments.
4. Verify the live health and frontend pages after the provider run completes.

No production URLs are included here because they were not created in this environment without the user’s provider login and project setup.
