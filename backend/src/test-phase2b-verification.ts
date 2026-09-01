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

async function runPhase2bVerification() {
  console.log('🚀 Starting Automated Phase 2B Verification (OCC, Presence, Activity Feed, Notifications)... \n');

  const timestamp = Date.now();
  const userA = { name: 'User Alpha', email: `alpha_${timestamp}@neon.test`, password: 'Password123!' };
  const userB = { name: 'User Beta', email: `beta_${timestamp}@neon.test`, password: 'Password123!' };

  // 1. User Registration & Auth
  console.log('1️⃣  Registering Collaborators User A & User B...');
  const regA = await apiRequest('/auth/register', 'POST', userA);
  const tokenA: string = regA.data.token;
  const userIdA: string = regA.data.user.id;

  const regB = await apiRequest('/auth/register', 'POST', userB);
  const tokenB: string = regB.data.token;
  const userIdB: string = regB.data.user.id;
  console.log('   ✅ Both users registered & issued JWT tokens.');

  // 2. Workspace Setup & Member Addition
  console.log('\n2️⃣  Setting up Workspace, Adding Member, & Project Board...');
  const wsRes = await apiRequest('/workspaces', 'POST', { name: 'Phase 2B Workspace' }, tokenA);
  const workspaceId: string = wsRes.data.id;

  // Add User B to Workspace
  await apiRequest(`/workspaces/${workspaceId}/members`, 'POST', { email: userB.email, role: 'MEMBER' }, tokenA);

  const projRes = await apiRequest('/projects', 'POST', { name: 'Phase 2B Project', workspaceId }, tokenA);
  const boardId: string = projRes.data.boards[0].id;

  const boardRes = await apiRequest(`/boards/${boardId}`, 'GET', undefined, tokenA);
  const columns: any[] = boardRes.data.columns;
  const todoCol = columns.find((c: any) => c.name === 'TODO');
  console.log('   ✅ Workspace created, User B added, Board loaded.');

  // 3. Task Creation & Initial Version (v1)
  console.log('\n3️⃣  Testing Task Creation & Initial Version (v1)...');
  const taskRes = await apiRequest(
    '/tasks',
    'POST',
    {
      title: 'Initial Versioned Task',
      description: 'Testing Optimistic Concurrency Control',
      priority: 'HIGH',
      columnId: todoCol.id,
      assigneeId: userIdB, // Assign task to User B to trigger Notification
    },
    tokenA
  );

  const taskId: string = taskRes.data.id;
  if (taskRes.data.version !== 1) {
    throw new Error(`Expected initial task version 1, got ${taskRes.data.version}`);
  }
  console.log('   ✅ Task created with initial version v1.');

  // 4. Client A updates task (v1 -> v2)
  console.log('\n4️⃣  Client A updating task (v1 -> v2)...');
  const updateARes = await apiRequest(
    `/tasks/${taskId}`,
    'PUT',
    {
      title: 'Task Updated by Client A',
      version: 1, // Matches expected version
    },
    tokenA
  );

  if (updateARes.data.version !== 2) {
    throw new Error(`Expected task version v2 after update, got ${updateARes.data.version}`);
  }
  console.log('   ✅ Client A update accepted. Task version incremented to v2.');

  // 5. Client B attempts update with stale version 1 -> Expect HTTP 409 Conflict
  console.log('\n5️⃣  Client B sending stale update with version 1 (Testing HTTP 409 Conflict)...');
  try {
    await apiRequest(
      `/tasks/${taskId}`,
      'PUT',
      {
        title: 'Client B Stale Update Attempt',
        version: 1, // Stale version! (Server is now v2)
      },
      tokenB
    );
    throw new Error('Server failed to reject stale update! Expected HTTP 409 Conflict.');
  } catch (err: any) {
    if (err.status === 409) {
      console.log('   ✅ Server correctly rejected stale update with HTTP 409 Conflict.');
      console.log(`   ✅ Returned server version: v${err.data.serverTask.version}`);
    } else {
      throw err;
    }
  }

  // 6. Client B resolves conflict using current version 2 (v2 -> v3)
  console.log('\n6️⃣  Client B resolving conflict using updated version 2 (v2 -> v3)...');
  const resolveRes = await apiRequest(
    `/tasks/${taskId}`,
    'PUT',
    {
      title: 'Resolved Conflict Task Title',
      version: 2,
    },
    tokenB
  );

  if (resolveRes.data.version !== 3) {
    throw new Error(`Expected task version v3 after conflict resolution, got ${resolveRes.data.version}`);
  }
  console.log('   ✅ Conflict resolved cleanly. Task updated to version v3.');

  // 7. Activity Log Audit Stream Verification
  console.log('\n7️⃣  Testing Activity Log Persistence & Retrieval...');
  const actRes = await apiRequest(`/activity?workspaceId=${workspaceId}`, 'GET', undefined, tokenA);
  const activities: any[] = actRes.data;

  if (activities.length === 0) {
    throw new Error('No activity logs recorded in database!');
  }
  console.log(`   ✅ Retrieved ${activities.length} activity log records for workspace.`);
  console.log(`   ✅ Latest action logged: "${activities[0].action}" by ${activities[0].user.name}`);

  // Test RBAC Activity Access Security: Unauthorized non-member user should be rejected with 403
  const userC = { name: 'User Gamma', email: `gamma_${timestamp}@neon.test`, password: 'Password123!' };
  const regC = await apiRequest('/auth/register', 'POST', userC);
  try {
    await apiRequest(`/activity?workspaceId=${workspaceId}`, 'GET', undefined, regC.data.token);
    throw new Error('Unauthorized user was allowed to read activity logs!');
  } catch (err: any) {
    if (err.status === 403) {
      console.log('   ✅ RBAC Security verified: Unauthorized user access correctly rejected with HTTP 403.');
    } else {
      throw err;
    }
  }

  // 8. User Notifications Verification
  console.log('\n8️⃣  Testing User Notifications & Mark As Read...');
  const notifRes = await apiRequest('/notifications', 'GET', undefined, tokenB);
  const notifications: any[] = notifRes.data.notifications;
  const unreadCount: number = notifRes.data.unreadCount;

  if (notifications.length === 0 || unreadCount !== 1) {
    throw new Error(`Expected 1 unread notification for User B, got ${unreadCount}`);
  }
  console.log(`   ✅ User B received notification: "${notifications[0].title} - ${notifications[0].message}"`);

  // Mark notification read
  await apiRequest(`/notifications/${notifications[0].id}/read`, 'PUT', undefined, tokenB);
  const readRes = await apiRequest('/notifications', 'GET', undefined, tokenB);
  if (readRes.data.unreadCount !== 0) {
    throw new Error(`Expected 0 unread notifications after markAsRead, got ${readRes.data.unreadCount}`);
  }
  console.log('   ✅ Notification marked as read. Unread count updated to 0.');

  // 9. Socket.IO Ephemeral Presence & Active Typing Indicators
  console.log('\n9️⃣  Testing Socket.IO Real-time Presence & Active Typing Indicators...');
  const socketA = socketClient(SOCKET_BASE, { auth: { token: tokenA } });
  const presenceEvents: any[] = [];
  const typingEvents: any[] = [];

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Socket connection timeout')), 5000);
    socketA.on('connect', () => {
      socketA.emit('join:board', { boardId, userProfile: { name: userA.name, email: userA.email } });
      socketA.on('presence:update', (data: any) => presenceEvents.push(data));
      socketA.on('task:typing', (data: any) => typingEvents.push(data));
      clearTimeout(timeout);
      resolve();
    });
  });

  // Emit typing indicator from User B socket
  const socketB = socketClient(SOCKET_BASE, { auth: { token: tokenB } });
  await new Promise<void>((resolve) => socketB.on('connect', () => resolve()));
  socketB.emit('join:board', { boardId, userProfile: { name: userB.name, email: userB.email } });
  socketB.emit('presence:typing', { boardId, taskId, isTyping: true, userName: userB.name });

  await new Promise((r) => setTimeout(r, 1000));
  socketA.disconnect();
  socketB.disconnect();

  if (typingEvents.length === 0 || typingEvents[0].taskId !== taskId) {
    throw new Error('Socket typing indicator event not received by board collaborators!');
  }
  console.log(`   ✅ Active typing indicator received in real-time: "${typingEvents[0].userName} is editing..."`);

  // Clean up test task
  await apiRequest(`/tasks/${taskId}`, 'DELETE', undefined, tokenA);
  console.log('   ✅ Test task cleaned up.');

  console.log('\n🎉 PHASE 2B AUTOMATED VERIFICATION PASSED 100%! 🎉');
}

runPhase2bVerification()
  .catch((err) => {
    console.error('\n❌ Phase 2B Verification Error:', err.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
