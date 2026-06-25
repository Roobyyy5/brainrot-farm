import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import type { Request } from "express";
import { getRawClient } from "../lib/redis.js";

function keyByUserOrIp(req: Request): string {
  return req.user?.id ?? req.ip ?? "unknown";
}

function makeRedisStore(prefix: string) {
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    // rate-limit-redis v4 uses sendCommand to stay client-agnostic.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendCommand: (...args: string[]) =>
      getRawClient().call(args[0] as string, ...args.slice(1)) as any,
  });
}

export const globalRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  store: makeRedisStore("global"),
  message: { error: { code: "RATE_LIMITED", message: "Too many requests, slow down" } },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? "unknown",
  store: makeRedisStore("auth"),
  message: { error: { code: "RATE_LIMITED", message: "Too many auth attempts, try again later" } },
});

export const writeActionRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  store: makeRedisStore("write"),
  message: { error: { code: "RATE_LIMITED", message: "Too many actions, slow down" } },
});
