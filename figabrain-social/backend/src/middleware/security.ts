import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./errorHandler.js";

/**
 * Double-submit-cookie CSRF protection for state-changing requests.
 * The frontend reads the `csrf_token` cookie (non-HttpOnly) and echoes it
 * back in the `x-csrf-token` header; a forged cross-site request cannot
 * read the cookie value, so the header will be missing or wrong.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.csrf_token;
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new HttpError(403, "Invalid or missing CSRF token", "CSRF_REJECTED");
  }

  next();
}
