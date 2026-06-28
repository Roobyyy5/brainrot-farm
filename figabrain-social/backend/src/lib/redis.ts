import { Redis } from "ioredis";
import { env } from "./env.js";

let _client: Redis | null = null;

function getClient(): Redis | null {
  if (!env.REDIS_URL) return null;
  if (_client) return _client;
  _client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 200, 2000)),
    lazyConnect: true,
  });
  _client.on("error", () => {
    // Suppress — fail-open when Redis is unavailable.
  });
  return _client;
}

export function getRawClient(): Redis | null {
  return getClient();
}

export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = getClient();
    if (!client) return false;
    await client.ping();
    return true;
  } catch {
    return false;
  }
}

export async function setex(key: string, ttlSeconds: number, value: string): Promise<boolean> {
  try {
    const client = getClient();
    if (!client) return false;
    await client.set(key, value, "EX", ttlSeconds);
    return true;
  } catch {
    return false;
  }
}

export async function get(key: string): Promise<string | null> {
  try {
    const client = getClient();
    if (!client) return null;
    return await client.get(key);
  } catch {
    return null;
  }
}

export async function exists(key: string): Promise<boolean> {
  try {
    const client = getClient();
    if (!client) return false;
    const n = await client.exists(key);
    return n > 0;
  } catch {
    return false;
  }
}

export async function del(...keys: string[]): Promise<void> {
  try {
    const client = getClient();
    if (!client) return;
    await client.del(...keys);
  } catch {
    // ignore
  }
}
