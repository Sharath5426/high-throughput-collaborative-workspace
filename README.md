# High-Throughput Collaborative Workspace Dashboard (Phase 1)

A real-time, high-performance collaborative project management platform built with Next.js, Express, PostgreSQL, Prisma ORM, and Socket.IO.

## Key Features

- **Authentication & Authorization**: Secure JWT-based registration and login with bcrypt password hashing and workspace RBAC.
- **Workspace & Project Management**: Multi-workspace support, team membership management, and project hierarchy (`Workspace -> Project -> Board -> Column -> Task`).
- **Real-Time Drag-and-Drop Kanban Board**: Real-time task status updates, position reordering, assignee management, priority levels (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), and due dates.
- **Socket.IO Live Synchronization**: Room-scoped WebSocket broadcasts (`board:{id}`) so team members see changes instantly without page refreshes.
- **SaaS Interface**: Responsive Next.js App Router dashboard with Tailwind CSS, Zustand global state management, loading skeletons, empty states, and toast notifications.

---

## Tech Stack

### Frontend
- **Framework**: Next.js 14/15 (App Router)
- **UI & Styling**: React 18/19, Tailwind CSS, Lucide Icons
- **State Management**: Zustand
- **Drag and Drop**: `@hello-pangea/dnd`
- **Real-Time Client**: `socket.io-client`
- **HTTP Client**: `axios`

### Backend
- **Runtime**: Node.js & Express.js (TypeScript)
- **Database ORM**: Prisma ORM with PostgreSQL
- **Authentication**: JSON Web Tokens (`jsonwebtoken`) & `bcryptjs`
- **Real-Time Server**: Socket.IO (`socket.io`)
- **Validation**: Zod schema validation

---

## Database Architecture (PostgreSQL)

The platform requires **PostgreSQL** configured via the `DATABASE_URL` environment variable.

```
User (1) ───< WorkspaceMember (N) >─── (1) Workspace
                                              │
                                              └───< Project (N)
                                                      │
                                                      └───< Board (N)
                                                              │
                                                              └───< Column (N)
                                                                      │
                                                                      └───< Task (N)
```

---

## Installation & Setup Instructions

### 1. Repository Setup

Clone the repository and inspect the two primary application directories:
- `backend/`: Node.js Express server & Prisma ORM
- `frontend/`: Next.js frontend application

---

### 2. Backend Configuration & Startup

```bash
cd backend
npm install
```

Create your local `.env` file from the provided `.env.example`:

```bash
cp .env.example .env
```

Edit `backend/.env` to configure your PostgreSQL connection string and JWT secret:

```env
PORT=5000
DATABASE_URL="postgresql://<user>:<password>@<host>:5432/<dbname>?sslmode=require"
JWT_SECRET="your-secure-jwt-secret-key"
CLIENT_ORIGIN="http://localhost:3000"
```

Push schema to PostgreSQL database and generate Prisma Client:

```bash
npx prisma db push
npx prisma db seed
```

Start the backend server in development mode:

```bash
npm run dev
```

The server will start on `http://localhost:5000`.

---

### 3. Frontend Configuration & Startup

Open a second terminal:

```bash
cd frontend
npm install
```

Create your `.env.local` file from `.env.example`:

```bash
cp .env.example .env.local
```

Ensure environment variables point to your running backend:

```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
NEXT_PUBLIC_SOCKET_URL="http://localhost:5000"
```

Start the frontend development server:

```bash
npm run dev
```

Access the application in your browser at `http://localhost:3000`.

---

## API & Socket.IO Specification

### Core API Endpoints

- **Auth**:
  - `POST /api/auth/register` - Create account
  - `POST /api/auth/login` - Authenticate & receive JWT
  - `GET /api/auth/me` - Fetch authenticated user profile
- **Workspaces**:
  - `POST /api/workspaces` - Create workspace
  - `GET /api/workspaces` - List user's workspaces
  - `GET /api/workspaces/:id` - Fetch workspace details
  - `POST /api/workspaces/:id/members` - Add member by email
- **Projects**:
  - `POST /api/projects` - Create project in workspace
  - `GET /api/projects?workspaceId=:id` - List workspace projects
- **Boards**:
  - `POST /api/boards` - Create board in project
  - `GET /api/boards/:id` - Fetch board with columns & tasks
- **Tasks**:
  - `POST /api/tasks` - Create task in column
  - `PUT /api/tasks/:id` - Edit task details
  - `PUT /api/tasks/:id/move` - Move task between columns or positions
  - `DELETE /api/tasks/:id` - Delete task

### Real-Time Socket.IO Events

- **Rooms**: Clients join `board:{boardId}` room upon viewing a board.
- **Broadcast Events**:
  - `task:created` - Emitted when a team member creates a task.
  - `task:updated` - Emitted on task edits (title, priority, assignee, due date).
  - `task:moved` - Emitted when a task is moved between columns or reordered.
  - `task:deleted` - Emitted when a task is removed.

---

## Security & Best Practices

- All passcodes are hashed with `bcryptjs` (salt rounds: 10).
- Passwords and secrets are never committed to version control. `.env` and `.env.local` files are ignored by default.
- REST endpoints are guarded by JWT middleware and workspace authorization checks.
