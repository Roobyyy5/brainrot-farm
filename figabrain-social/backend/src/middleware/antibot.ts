import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "./errorHandler.js";

/**
 * Shadow-banned users get 200 OK on writes (so they can't tell they're banned)
 * but the action is silently dropped before it reaches the database.
 */
export async function shadowBanGate(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    next();
    return;
  }

  const ban = await prisma.shadowBan.findUnique({ where: { userId: req.user.id } });
  if (ban && (!ban.expiresAt || ban.expiresAt > new Date())) {
    res.status(200).json({ data: { accepted: true, shadowed: true } });
    return;
  }

  next();
}

export function requireNotBanned(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next();
    return;
  }
  prisma.user
    .findUnique({ where: { id: req.user.id }, select: { isBanned: true } })
    .then((u) => {
      if (u?.isBanned) {
        throw new HttpError(403, "This account has been suspended", "ACCOUNT_BANNED");
      }
      next();
    })
    .catch(next);
}
