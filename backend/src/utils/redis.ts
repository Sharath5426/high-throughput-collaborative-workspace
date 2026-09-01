import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

async function ensureRedisClient(): Promise<RedisClientType | null> {
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    redisClient = createClient({ url });
    redisClient.on('error', () => {
      redisClient = null;
    });
    await redisClient.connect();
    return redisClient;
  } catch {
    redisClient = null;
    return null;
  }
}

export async function getRedisClient(): Promise<RedisClientType | null> {
  return ensureRedisClient();
}

export async function readThroughCache<T>(key: string, ttlSeconds: number, fallback: () => Promise<T>): Promise<T> {
  const client = await ensureRedisClient();
  if (!client) return fallback();

  try {
    const cached = await client.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch {
    // Fall through to database if Redis is temporarily unavailable.
  }

  try {
    const value = await fallback();
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return value;
  } catch {
    return fallback();
  }
}

export async function invalidateCachePrefix(prefix: string): Promise<void> {
  const client = await ensureRedisClient();
  if (!client) return;

  try {
    const keys = await client.keys(`${prefix}*`);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch {
    // Redis can be unavailable during scaling or rollout; never fail the request path.
  }
}

export async function invalidateBoardCache(boardId: string): Promise<void> {
  await invalidateCachePrefix(`board:${boardId}`);
  await invalidateCachePrefix(`project:boards`);
}

export async function invalidateWorkspaceCache(workspaceId: string): Promise<void> {
  await invalidateCachePrefix(`workspace:${workspaceId}`);
  await invalidateCachePrefix(`workspace:list`);
}

export async function invalidateProjectCache(projectId: string): Promise<void> {
  await invalidateCachePrefix(`project:${projectId}`);
  await invalidateCachePrefix(`project:boards`);
}
