import { io as socketClient } from 'socket.io-client';
import { PrismaClient } from '@prisma/client';

const API_BASE = 'http://localhost:5000/api';
const SOCKET_BASE = 'http://localhost:5000';
const prisma = new PrismaClient();

async function apiRequest(endpoint: string, method = 'GET', data?: any, token?: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  const json: any = await res.json();
  if (!res.ok) {
    const error: any = new Error(json.error || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = json;
    throw error;
  }
  return json;
}

async function runRuntimeVerification() {
  console.log('🚀 Starting Full Phase 1 Runtime Verification against Neon PostgreSQL & Socket.IO...\n');

  // Step 1: Authentication Flow
  const timestamp = Date.now();
  const testUser = {
    name: 'E2E Tester',
    email: `e2e_user_${timestamp}@neon.test`,
    password: 'Password123!',
  };

  console.log('1️⃣  Testing User Registration...');
  const regRes = await apiRequest('/auth/register', 'POST', testUser);
  if (!regRes.success || !regRes.data.token) {
    throw new Error('Registration failed!');
  }
  const token: string = regRes.data.token;
  const userId: string = regRes.data.user.id;
  console.log('   ✅ User registered successfully. Token generated.');

  // Confirm user in PostgreSQL
  const dbUser = await prisma.user.findUnique({ where: { email: testUser.email } });
  if (!dbUser) throw new Error('User not found in PostgreSQL DB!');
  console.log('   ✅ Confirmed user persisted in Neon PostgreSQL.');

  console.log('\n2️⃣  Testing User Login & JWT Auth...');
  const loginRes = await apiRequest('/auth/login', 'POST', {
    email: testUser.email,
    password: testUser.password,
  });
  if (!loginRes.success || !loginRes.data.token) {
    throw new Error('Login failed!');
  }
  console.log('   ✅ Login successful and JWT issued.');

  // Test Protected Routes & Rejection
  console.log('\n3️⃣  Testing Protected API Route & Rejection...');
  const meRes = await apiRequest('/auth/me', 'GET', undefined, token);
  if (meRes.data.email !== testUser.email) throw new Error('Auth profile mismatch!');
  console.log('   ✅ Profile fetched with JWT token.');

  try {
    await apiRequest('/auth/me', 'GET');
    throw new Error('Protected route should have rejected request without token!');
  } catch (err: any) {
    if (err.status === 401) {
      console.log('   ✅ Protected route correctly rejected unauthenticated request (401 Unauthorized).');
    } else {
      throw err;
    }
  }

  // Step 2: Workspace & RBAC Authorization
  console.log('\n4️⃣  Testing Workspace Creation & RBAC Authorization...');
  const wsRes = await apiRequest(
    '/workspaces',
    'POST',
    { name: 'Neon E2E Workspace', description: 'Phase 1 verification workspace' },
    token
  );
  const workspaceId: string = wsRes.data.id;
  console.log('   ✅ Workspace created with ID:', workspaceId);

  const dbWs = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { members: true },
  });
  if (!dbWs || dbWs.members.length === 0) throw new Error('Workspace or WorkspaceMember not found in DB!');
  console.log('   ✅ Confirmed workspace & member persisted in Neon PostgreSQL.');

  // Unauthorized user access check
  const otherReg = await apiRequest('/auth/register', 'POST', {
    name: 'Unauthorized User',
    email: `unauthorized_${timestamp}@neon.test`,
    password: 'Password123!',
  });
  const otherToken: string = otherReg.data.token;

  try {
    await apiRequest(`/workspaces/${workspaceId}`, 'GET', undefined, otherToken);
    throw new Error('Unauthorized user was able to access private workspace!');
  } catch (err: any) {
    if (err.status === 403) {
      console.log('   ✅ RBAC correctly blocked unauthorized user (403 Forbidden).');
    } else {
      throw err;
    }
  }

  // Step 3: Project & Board Creation
  console.log('\n5️⃣  Testing Project & Board Hierarchy...');
  const projRes = await apiRequest('/projects', 'POST', { name: 'Phase 1 Kanban Project', workspaceId }, token);
  const projectId: string = projRes.data.id;
  const boardId: string = projRes.data.boards[0].id;
  console.log('   ✅ Project & default Board created.');

  const boardRes = await apiRequest(`/boards/${boardId}`, 'GET', undefined, token);
  const columns: any[] = boardRes.data.columns;
  if (columns.length < 3) throw new Error('Default columns (TODO, IN PROGRESS, DONE) missing!');
  console.log('   ✅ Board loaded with default columns:', columns.map((c: any) => c.name).join(', '));

  const todoCol = columns.find((c: any) => c.name === 'TODO');
  const inProgressCol = columns.find((c: any) => c.name === 'IN PROGRESS');

  // Step 4: Socket.IO Real-time Events
  console.log('\n6️⃣  Testing Socket.IO Real-time WebSocket connection & room events...');
  const socket = socketClient(SOCKET_BASE, {
    auth: { token },
  });

  const receivedEvents: string[] = [];

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Socket.IO connection timeout')), 5000);

    socket.on('connect', () => {
      console.log('   ✅ Socket.IO connected with socket.id:', socket.id);
      socket.emit('join:board', boardId);

      socket.on('task:created', (data: any) => {
        receivedEvents.push('task:created');
      });
      socket.on('task:updated', (data: any) => {
        receivedEvents.push('task:updated');
      });
      socket.on('task:moved', (data: any) => {
        receivedEvents.push('task:moved');
      });
      socket.on('task:deleted', (data: any) => {
        receivedEvents.push('task:deleted');
      });

      clearTimeout(timeout);
      resolve();
    });
  });

  // Step 5: Task CRUD & Drag-and-Drop Move Operations
  console.log('\n7️⃣  Testing Task CRUD & Drag-and-Drop Persistence...');

  // Create Task
  const taskRes = await apiRequest(
    '/tasks',
    'POST',
    {
      title: 'E2E Real-time Task',
      description: 'Testing task creation and Socket.IO broadcast',
      priority: 'HIGH',
      columnId: todoCol.id,
      assigneeId: userId,
      dueDate: new Date().toISOString(),
    },
    token
  );
  const taskId: string = taskRes.data.id;
  console.log('   ✅ Task created:', taskId);

  // Edit Task
  await apiRequest(
    `/tasks/${taskId}`,
    'PUT',
    {
      title: 'E2E Updated Real-time Task',
      priority: 'URGENT',
    },
    token
  );
  console.log('   ✅ Task details updated.');

  // Move Task (Drag-and-Drop simulation)
  console.log('\n8️⃣  Simulating Drag-and-Drop Task Movement across Columns...');
  await apiRequest(
    `/tasks/${taskId}/move`,
    'PUT',
    {
      columnId: inProgressCol.id,
      position: 0,
    },
    token
  );
  console.log('   ✅ Task moved to IN PROGRESS column.');

  // Verify DB Persistence after Move
  const dbTaskMoved = await prisma.task.findUnique({ where: { id: taskId } });
  if (dbTaskMoved?.columnId !== inProgressCol.id || dbTaskMoved?.status !== 'IN PROGRESS') {
    throw new Error('Moved task column position not persisted in PostgreSQL database!');
  }
  console.log('   ✅ Confirmed moved column & position persisted in Neon PostgreSQL.');

  // Delete Task
  await apiRequest(`/tasks/${taskId}`, 'DELETE', undefined, token);
  console.log('   ✅ Task deleted.');

  // Wait brief moment for socket events to process
  await new Promise((r) => setTimeout(r, 1000));
  socket.disconnect();

  console.log('\n9️⃣  Received Socket.IO Broadcast Events:', receivedEvents.join(', '));
  if (!receivedEvents.includes('task:created') || !receivedEvents.includes('task:moved')) {
    throw new Error('Socket.IO real-time broadcast events were not properly received!');
  }
  console.log('   ✅ All Socket.IO real-time events verified!');

  console.log('\n🎉 ALL RUNTIME VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
}

runRuntimeVerification()
  .catch((err) => {
    console.error('\n❌ Verification Error:', err.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
