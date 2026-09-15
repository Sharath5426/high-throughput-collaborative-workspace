# Deployment and Operations Guide

## Overview

This repository is a real-time collaborative workspace for project management, built with the following stack:

- Frontend: Next.js App Router, React, Tailwind CSS, Zustand
- Backend: Node.js, Express.js, TypeScript
- Database: PostgreSQL via Prisma ORM
- Real-time: Socket.IO with board rooms and presence updates
- Caching: Redis via a safe optional integration
- Monitoring: Sentry via environment-based configuration
- Hosting target: Vercel frontend, Render backend, Neon PostgreSQL

## Current Status

The Phase 2 application is publicly deployed and verified in production on the phase-2-development branch. The frontend is running on Vercel, the backend is running on Render, and the live application has been checked for registration, login, task operations, collaboration, and real-time sync.

## Production URLs

Frontend:
https://high-throughput-collaborative-works.vercel.app

Backend:
https://high-throughput-collaborative-workspace.onrender.com

Health:
https://high-throughput-collaborative-workspace.onrender.com/health

GitHub Phase 2:
https://github.com/Sharath5426/high-throughput-collaborative-workspace/tree/phase-2-development

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
- Production frontend is deployed on Vercel.
- Public frontend URL:
  https://high-throughput-collaborative-works.vercel.app
- Frontend communicates successfully with the deployed backend.
- Frontend environment variables are configured through Vercel and secrets are not committed.

### Backend (Render)
- Production backend is deployed on Render.
- Public backend URL:
  https://high-throughput-collaborative-workspace.onrender.com
- Health endpoint:
  https://high-throughput-collaborative-workspace.onrender.com/health
- Backend is connected to the existing Neon PostgreSQL database.
- Redis/Upstash is configured.
- Socket.IO is enabled and the Redis adapter is enabled.
- Backend environment variables/secrets are configured through Render and are not committed.

### PostgreSQL
- The production application uses the existing Neon PostgreSQL database.
- The database remains the authoritative data store for durable workspace and task data.
- No reset or recreation of the production database is required for the current deployment.

### Redis
- Managed Redis is configured through Upstash for the deployed application.
- Redis supports cache and invalidation flows alongside the real-time collaboration backend.
- The application continues safely if Redis is unavailable, with graceful fallback behavior.

### Sentry
- Sentry monitoring is configured through environment variables in the deployment environment.
- The repo does not include any production secret values or DSNs.

## Monitoring and Reliability

- Sentry is configured via environment variables for runtime monitoring when the DSN is provided.
- Redis is managed by Upstash and used alongside the Socket.IO Redis adapter in production.
- The API keeps PostgreSQL as the source of truth and avoids persisting ephemeral collaboration state as durable database records.
- Socket.IO events remain board-scoped and designed for real-time collaboration only.

## Security Notes

- Never commit actual env files.
- Do not hardcode production credentials.
- Keep JWT secrets and Sentry DSNs in deployment secrets management.
- Restrict workspace access through server-side RBAC checks.
- Ensure database and secret values are never stored in repository files.

## Deployment Verification

The public deployment is verified as live and functional:

- Vercel frontend is live.
- Render backend is live.
- Backend health endpoint works.
- Registration and login were successfully tested in production.
- Dashboard and task operations were successfully tested.
- Real-time synchronization was successfully tested.
- Multi-user collaboration was successfully tested.
- Optimistic updates, conflict resolution, activity feed, notifications and canvas were successfully tested.
- Socket.IO Redis adapter is enabled in production.

No credentials, passwords, API keys, Redis tokens, database URLs, JWT secrets, or Sentry DSNs are included in this document.
