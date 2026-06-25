import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "./errorHandler.js";
import * as redis from "../lib/redis.js";

const BAN_CACHE_TTL = 30;
const banKey = (userId: string) => `banned:${userId}`;
const shadowBanKey = (userId: string) => `shadow-banned:${userId}`;

/** Call after admin ban/unban/shadow-ban/shadow-unban to evict cached status immediately. */
export async function invalidateBanCache(userId: string): Promise<void> {
  await Promise.all([redis.del(banKey(userId)), redis.del(shadowBanKey(userId))]).catch(() => {});
}

/**
 * Shadow-banned users get 200 OK on writes (so they can't tell they're banned)
 * but the action is silently dropped before it reaches the database.
 * Status is cached in Redis for 30 s to avoid a DB hit on every write.
 */
export async function shadowBanGate(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    next();
    return;
  }

  try {
    const cKey = shadowBanKey(req.user.id);
    const cached = await redis.get(cKey).catch(() => null);
    if (cached === "1") {
      res.status(200).json({ data: { accepted: true, shadowed: true } });
      return;
    }
    if (cached === "0") {
      next();
      return;
    }

    const ban = await prisma.shadowBan.findUnique({ where: { userId: req.user.id } });
    const isBanned = ban !== null && (!ban.expiresAt || ban.expiresAt > new Date());
    redis.setex(cKey, BAN_CACHE_TTL, isBanned ? "1" : "0").catch(() => {});

    if (isBanned) {
      res.status(200).json({ data: { accepted: true, shadowed: true } });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Hard-banned users receive 403 on every request.
 * Status is cached in Redis for 30 s.
 */
export async function requireNotBanned(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    next();
    return;
  }

  try {
    const cKey = banKey(req.user.id);
    const cached = await redis.get(cKey).catch(() => null);
    if (cached === "1") {
      next(new HttpError(403, "This account has been suspended", "ACCOUNT_BANNED"));
      return;
    }
    if (cached === "0") {
      next();
      return;
    }

    const u = await prisma.user.findUnique({ where: { id: req.user.id }, select: { isBanned: true } });
    redis.setex(cKey, BAN_CACHE_TTL, u?.isBanned ? "1" : "0").catch(() => {});

    if (u?.isBanned) {
      next(new HttpError(403, "This account has been suspended", "ACCOUNT_BANNED"));
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}
