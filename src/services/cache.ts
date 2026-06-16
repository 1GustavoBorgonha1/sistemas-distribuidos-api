import { createClient } from 'redis';
import { config } from '../config';
import pino from 'pino';

const logger = pino({ name: 'cache' });

let client: ReturnType<typeof createClient> | null = null;

export async function connectRedis(): Promise<void> {
  try {
    client = createClient({ url: config.redisUrl });
    client.on('error', (err) => logger.error({ err }, 'Redis client error'));
    await client.connect();
    logger.info('Redis connected');
  } catch (err) {
    logger.warn({ err }, 'Redis unavailable — cache disabled');
    client = null;
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  if (!client) return null;
  try {
    return await client.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds = 60): Promise<void> {
  if (!client) return;
  try {
    await client.set(key, value, { EX: ttlSeconds });
  } catch {
    // cache failure is non-fatal
  }
}

export async function cacheDel(key: string): Promise<void> {
  if (!client) return;
  try {
    await client.del(key);
  } catch {
    // cache failure is non-fatal
  }
}
