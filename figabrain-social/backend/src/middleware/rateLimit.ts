import rateLimit from "express-rate-limit";
import type { Request } from "express";

function keyByUserOrIp(req: Request): string {
  return req.user?.id ?? req.ip ?? "unknown";
}

export const globalRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { error: { code: "RATE_LIMITED", message: "Too many requests, slow down" } },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? "unknown",
  message: { error: { code: "RATE_LIMITED", message: "Too many auth attempts, try again later" } },
});

export const writeActionRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { error: { code: "RATE_LIMITED", message: "Too many actions, slow down" } },
});
