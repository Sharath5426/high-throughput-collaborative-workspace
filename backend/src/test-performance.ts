import { io as socketClient } from 'socket.io-client';

const API_BASE = 'http://localhost:5000/api';
const SOCKET_BASE = 'http://localhost:5000';

async function request(endpoint: string, method = 'GET', data?: any, token?: string, idempotencyKey?: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (idempotencyKey) headers['x-idempotency-key'] = idempotencyKey;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  const json: any = await response.json();
  if (!response.ok) {
    const error: any = new Error(json?.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = json;
    throw error;
  }

  return json;
}

async function runPerformanceCheck() {
  const started = Date.now();
  const user = {
    name: 'Perf Tester',
    email: `perf_${Date.now()}@neon.test`,
    password: 'Password123!',
  };

  const reg = await request('/auth/register', 'POST', user);
  const token = reg.data.token;
  const workspace = await request('/workspaces', 'POST', { name: `Perf Workspace ${Date.now()}` }, token);
  const workspaceId = workspace.data.id;
  const project = await request('/projects', 'POST', { name: 'Perf Project', workspaceId }, token);
  const boardId = project.data.boards[0].id;
  const board = await request(`/boards/${boardId}`, 'GET', undefined, token);
  const todoColumn = board.data.columns.find((column: any) => column.name === 'TODO');

  const concurrency = 20;
  const payloads = Array.from({ length: concurrency }, (_, index) => ({
    title: `Perf task ${index + 1}`,
    description: 'Measured background task creation throughput',
    priority: 'MEDIUM',
    columnId: todoColumn.id,
  }));

  const before = Date.now();
  const results = await Promise.all(
    payloads.map((payload) => {
      const key = `perf_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      return request('/tasks', 'POST', payload, token, key);
    })
  );
  const elapsed = Date.now() - before;

  const socket = socketClient(SOCKET_BASE, { auth: { token } });
  await new Promise<void>((resolve) => {
    socket.on('connect', () => {
      socket.emit('join:board', { boardId });
      resolve();
    });
  });
  await new Promise((resolve) => setTimeout(resolve, 250));
  socket.disconnect();

  console.log('Performance test summary');
  console.log(`- concurrency: ${concurrency}`);
  console.log(`- success count: ${results.length}`);
  console.log(`- total elapsed ms: ${elapsed}`);
  console.log(`- avg ms per request: ${(elapsed / concurrency).toFixed(2)}`);
  console.log(`- test run started at: ${new Date(started).toISOString()}`);
  console.log(`- measured local backend throughput: ${((concurrency / (elapsed / 1000)).toFixed(2))} req/sec`);
}

runPerformanceCheck().catch((error) => {
  console.error('Performance test failed', error);
  process.exit(1);
});
