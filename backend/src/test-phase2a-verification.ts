import { io as socketClient } from 'socket.io-client';
import { PrismaClient } from '@prisma/client';

const API_BASE = 'http://localhost:5000/api';
const SOCKET_BASE = 'http://localhost:5000';
const prisma = new PrismaClient();

async function apiRequest(endpoint: string, method = 'GET', data?: any, token?: string, idempotencyKey?: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (idempotencyKey) headers['x-idempotency-key'] = idempotencyKey;

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

async function runPhase2aVerification() {
  console.log('🚀 Starting Automated Phase 2A Verification (Optimistic System & API Idempotency)...\n');

  const timestamp = Date.now();
  const testUser = {
    name: 'Phase 2A Tester',
    email: `phase2a_${timestamp}@neon.test`,
    password: 'Password123!',
  };

  // 1. User Registration & Auth
  console.log('1️⃣  Testing User Registration & JWT Auth...');
  const regRes = await apiRequest('/auth/register', 'POST', testUser);
  const token: string = regRes.data.token;
  const userId: string = regRes.data.user.id;
  console.log('   ✅ User registered & authenticated successfully.');

  // 2. Workspace & Project Creation
  console.log('\n2️⃣  Creating Workspace & Project Hierarchy...');
  const wsRes = await apiRequest('/workspaces', 'POST', { name: 'Phase 2A Workspace' }, token);
  const workspaceId: string = wsRes.data.id;

  const projRes = await apiRequest('/projects', 'POST', { name: 'Phase 2A Project', workspaceId }, token);
  const boardId: string = projRes.data.boards[0].id;

  const boardRes = await apiRequest(`/boards/${boardId}`, 'GET', undefined, token);
  const columns: any[] = boardRes.data.columns;
  const todoCol = columns.find((c: any) => c.name === 'TODO');
  const inProgressCol = columns.find((c: any) => c.name === 'IN PROGRESS');
  console.log('   ✅ Board loaded with columns:', columns.map((c: any) => c.name).join(', '));

  // 3. API Idempotency Verification
  console.log('\n3️⃣  Testing API Idempotency & Duplicate Request Prevention...');
  const idempKey = `test_idemp_${timestamp}`;
  const taskPayload = {
    title: 'Idempotent Task Creation',
    description: 'Ensures repeated requests with same idempotencyKey return cached response',
    priority: 'HIGH',
    columnId: todoCol.id,
  };

  // Request 1
  const firstReq = await apiRequest('/tasks', 'POST', taskPayload, token, idempKey);
  const createdTaskId = firstReq.data.id;
  console.log('   ✅ Request 1 succeeded. Task created with ID:', createdTaskId);

  // Request 2 (Duplicate with identical idempotencyKey)
  const secondReq = await apiRequest('/tasks', 'POST', taskPayload, token, idempKey);
  if (secondReq.data.id !== createdTaskId) {
    throw new Error('Idempotency failed: Duplicate request generated a new task instead of returning cached response!');
  }
  console.log('   ✅ Request 2 returned cached response identically without creating duplicate DB records.');

  // Verify in PostgreSQL that only 1 record exists
  const idempCount = await prisma.task.count({ where: { title: 'Idempotent Task Creation' } });
  if (idempCount !== 1) {
    throw new Error(`Expected exactly 1 task record in DB, found ${idempCount}!`);
  }
  console.log('   ✅ Confirmed in Neon PostgreSQL: Exactly 1 record created.');

  // 4. Socket.IO Real-time Events with Idempotency Key Metadata
  console.log('\n4️⃣  Testing Socket.IO Room Broadcast with Idempotency Metadata...');
  const socket = socketClient(SOCKET_BASE, { auth: { token } });
  const receivedEvents: any[] = [];

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Socket connection timeout')), 5000);
    socket.on('connect', () => {
      socket.emit('join:board', boardId);
      socket.on('task:moved', (data: any) => receivedEvents.push(data));
      clearTimeout(timeout);
      resolve();
    });
  });

  // 5. Optimistic Task Movement (Drag-and-Drop Simulation)
  console.log('\n5️⃣  Testing Task Movement across Columns...');
  const moveKey = `move_idemp_${timestamp}`;
  await apiRequest(`/tasks/${createdTaskId}/move`, 'PUT', { columnId: inProgressCol.id, position: 0 }, token, moveKey);
  console.log('   ✅ Task moved to IN PROGRESS column.');

  const dbTaskMoved = await prisma.task.findUnique({ where: { id: createdTaskId } });
  if (dbTaskMoved?.columnId !== inProgressCol.id) {
    throw new Error('Moved task column position not persisted in PostgreSQL database!');
  }
  console.log('   ✅ Confirmed moved position persisted in Neon PostgreSQL.');

  await new Promise((r) => setTimeout(r, 1000));
  socket.disconnect();

  if (receivedEvents.length === 0 || receivedEvents[0].idempotencyKey !== moveKey) {
    throw new Error('Socket broadcast missing expected idempotencyKey metadata!');
  }
  console.log('   ✅ Received Socket broadcast carrying idempotencyKey metadata:', moveKey);

  // 6. Optimistic Rollback Verification (4xx Rejection)
  console.log('\n6️⃣  Testing 4xx Rejection & Rollback Handling...');
  try {
    await apiRequest(`/tasks/invalid-non-existent-id`, 'PUT', { title: 'Should Fail' }, token);
    throw new Error('Request with invalid task ID should have failed!');
  } catch (err: any) {
    if (err.status === 404) {
      console.log('   ✅ Invalid mutation correctly rejected with 404 Not Found (Rollback triggered).');
    } else {
      throw err;
    }
  }

  // Clean up test task
  await apiRequest(`/tasks/${createdTaskId}`, 'DELETE', undefined, token);
  console.log('   ✅ Test task deleted.');

  console.log('\n🎉 PHASE 2A AUTOMATED VERIFICATION PASSED 100%! 🎉');
}

runPhase2aVerification()
  .catch((err) => {
    console.error('\n❌ Verification Error:', err.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
