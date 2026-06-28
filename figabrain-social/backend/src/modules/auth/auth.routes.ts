import { Router } from "express";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { authRateLimiter } from "../../middleware/rateLimit.js";
import { asyncHandler, HttpError } from "../../middleware/errorHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { verifyTelegramLogin } from "./telegramVerify.js";
import { loginOrRegisterWithTelegram, loginByUsername } from "./auth.service.js";
import { verifyRefreshToken, signAccessToken } from "../../lib/jwt.js";
import { prisma } from "../../lib/prisma.js";
import { flagMultiAccountAbuse } from "../antibot/antibot.service.js";
import { env } from "../../lib/env.js";

export const authRouter = Router();

const telegramLoginSchema = z.object({
  id: z.number(),
  first_name: z.string().min(1),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().url().optional(),
  auth_date: z.number(),
  hash: z.string().min(1),
  referralCode: z.string().optional(),
  deviceFingerprint: z.string().optional(),
});

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

const devLoginSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/),
  displayName: z.string().min(1).max(60).optional(),
});

/**
 * Dev-only bypass for the Telegram signature check, so the app is
 * testable before a real Telegram bot/domain is wired up. 404s in
 * production so it can never be reached outside local/staging.
 */
authRouter.post(
  "/dev-login",
  authRateLimiter,
  validateBody(devLoginSchema),
  asyncHandler(async (req, res) => {
    if (isProd()) {
      throw new HttpError(404, "Not found", "NOT_FOUND");
    }

    const { username, displayName } = req.body;

    // If this username already exists (e.g. seeded demo data), log straight
    // into that account instead of minting a fake telegramId — otherwise
    // dev-login would create a shadow "username1" duplicate every time.
    const existingLogin = await loginByUsername(username);

    const fakeTelegramId = Math.abs(
      Array.from(`dev_${username}`).reduce((hash, ch) => (hash * 31 + ch.charCodeAt(0)) % 2_147_483_647, 7)
    );

    const result =
      existingLogin ??
      (await loginOrRegisterWithTelegram(
        {
          id: fakeTelegramId,
          first_name: displayName ?? username,
          username,
          auth_date: Math.floor(Date.now() / 1000),
          hash: "dev-bypass",
        },
        undefined,
        undefined,
        req.ip
      ));

    res.cookie("refresh_token", result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ data: { accessToken: result.accessToken, isNewUser: result.isNewUser } });
  })
);

authRouter.post(
  "/telegram",
  authRateLimiter,
  validateBody(telegramLoginSchema),
  asyncHandler(async (req, res) => {
    const { referralCode, deviceFingerprint, ...telegramPayload } = req.body;
    verifyTelegramLogin(telegramPayload);

    const result = await loginOrRegisterWithTelegram(
      telegramPayload,
      referralCode,
      deviceFingerprint,
      req.ip
    );

    if (deviceFingerprint) {
      await flagMultiAccountAbuse(result.userId, deviceFingerprint);
    }

    res.cookie("refresh_token", result.refreshToken, {
      httpOnly: true,
      secure: isProd(),
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      data: {
        accessToken: result.accessToken,
        isNewUser: result.isNewUser,
      },
    });
  })
);

authRouter.post(
  "/refresh",
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const token = req.cookies?.refresh_token;
    if (!token) {
      throw new HttpError(401, "Missing refresh token", "UNAUTHENTICATED");
    }

    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.isBanned) {
      throw new HttpError(401, "Account unavailable", "UNAUTHENTICATED");
    }

    const accessToken = signAccessToken({ sub: user.id, username: user.username, isAdmin: user.isAdmin });
    res.json({ data: { accessToken } });
  })
);

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("refresh_token");
  res.json({ data: { loggedOut: true } });
});

// Bot-based Telegram auth (works without Login Widget domain setup)
authRouter.post(
  "/telegram-bot/init",
  authRateLimiter,
  asyncHandler(async (_req, res) => {
    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await prisma.telegramAuthToken.create({ data: { token, telegramId: "", expiresAt } });
    const botUsername = env.TELEGRAM_BOT_USERNAME;
    res.json({ data: { token, url: `https://t.me/${botUsername}?start=login_${token}` } });
  })
);

authRouter.post(
  "/telegram-bot/verify",
  validateBody(z.object({ token: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const record = await prisma.telegramAuthToken.findUnique({ where: { token: req.body.token } });
    if (!record || record.expiresAt < new Date()) {
      throw new HttpError(401, "Token expired or not found", "UNAUTHENTICATED");
    }
    if (!record.telegramId) {
      // Bot hasn't confirmed yet
      res.json({ data: { pending: true } });
      return;
    }
    await prisma.telegramAuthToken.delete({ where: { token: req.body.token } });
    const result = await loginOrRegisterWithTelegram(
      { id: Number(record.telegramId), first_name: "User", auth_date: Math.floor(Date.now() / 1000), hash: "bot-auth" },
      undefined, undefined, req.ip
    );
    res.cookie("refresh_token", result.refreshToken, {
      httpOnly: true, secure: isProd(), sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ data: { accessToken: result.accessToken, isNewUser: result.isNewUser } });
  })
);
