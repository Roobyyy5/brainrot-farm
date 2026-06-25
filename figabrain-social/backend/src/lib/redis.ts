import { Redis } from "ioredis";
import { env } from "./env.js";

let _client: Redis | null = null;

function getClient(): Redis {
  if (_client) return _client;
  _client = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 200, 2000)),
  });
  _client.on("error", () => {
    // Suppress — we fail-open (fall back to DB) when Redis is unavailable.
  });
  return _client;
}

/**
 * Returns the raw ioredis client for adapters that need direct access
 * (e.g. rate-limit-redis). Do not use for general key operations — use the
 * exported helpers below so error handling is centralised.
 */
export function getRawClient(): Redis {
  return getClient();
}

/** Returns true if Redis responds within the connection timeout. */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    await getClient().ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Set a key with an expiry (seconds). Returns false and does nothing when
 * Redis is unavailable — callers must fall back to the DB path in that case.
 */
export async function setex(key: string, ttlSeconds: number, value: string): Promise<boolean> {
  try {
    await getClient().set(key, value, "EX", ttlSeconds);
    return true;
  } catch {
    return false;
  }
}

/** Returns the stored value, or null on miss or Redis unavailability. */
export async function get(key: string): Promise<string | null> {
  try {
    return await getClient().get(key);
  } catch {
    return null;
  }
}

/** Returns true if the key exists. Returns false on miss or Redis unavailability. */
export async function exists(key: string): Promise<boolean> {
  try {
    const n = await getClient().exists(key);
    return n > 0;
  } catch {
    return false;
  }
}

/** Delete one or more keys. Silently ignores Redis failures. */
export async function del(...keys: string[]): Promise<void> {
  try {
    await getClient().del(...keys);
  } catch {
    // ignore
  }
}
