import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import * as Sentry from '@sentry/node';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { initializeSocketIO } from './sockets/socket.handler';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
}

const redisUrl = process.env.REDIS_URL;

async function setupRedisSocketAdapter(io: SocketIOServer): Promise<void> {
  if (!redisUrl) return;

  const pubClient = createClient({ url: redisUrl });
  const subClient = createClient({ url: redisUrl });

  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('📡 Socket.IO Redis adapter enabled');
  } catch (error) {
    console.warn('⚠️ Redis adapter unavailable; continuing with in-process Socket.IO.', error);
  }
}

const io = new SocketIOServer(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

initializeSocketIO(io);
setupRedisSocketAdapter(io).catch(() => undefined);

// Express Middleware
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', apiRoutes);

// Centralized Error Handling
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`🚀 Collaborative Workspace Backend running on port ${PORT}`);
  console.log(`📡 Socket.IO listening for client connections from ${CLIENT_ORIGIN}`);
});
