import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt.js";
import { HttpError } from "./errorHandler.js";

export interface AuthenticatedUser {
  id: string;
  username: string;
  isAdmin: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);
  // Allow token via query param for SSE connections (EventSource can't set headers)
  if (typeof req.query.token === "string" && req.query.token) return req.query.token;
  return null;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) throw new HttpError(401, "Missing bearer token", "UNAUTHENTICATED");

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, username: payload.username, isAdmin: payload.isAdmin };
    next();
  } catch {
    throw new HttpError(401, "Invalid or expired token", "UNAUTHENTICATED");
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.isAdmin) {
    throw new HttpError(403, "Admin access required", "FORBIDDEN");
  }
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.sub, username: payload.username, isAdmin: payload.isAdmin };
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}
