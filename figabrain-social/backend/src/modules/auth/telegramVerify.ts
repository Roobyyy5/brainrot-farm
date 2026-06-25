import crypto from "node:crypto";
import { env } from "../../lib/env.js";
import { HttpError } from "../../middleware/errorHandler.js";

export interface TelegramLoginPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

/**
 * Verifies the Telegram Login Widget payload per the official spec:
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramLogin(payload: TelegramLoginPayload): void {
  const { hash, ...fields } = payload;

  const dataCheckString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${(fields as Record<string, unknown>)[key]}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(env.TELEGRAM_BOT_TOKEN).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const computedBuf = Buffer.from(computedHash, "hex");
  const givenBuf = Buffer.from(hash, "hex");
  if (computedBuf.length !== givenBuf.length || !crypto.timingSafeEqual(computedBuf, givenBuf)) {
    throw new HttpError(401, "Invalid Telegram login signature", "TELEGRAM_AUTH_INVALID");
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - payload.auth_date;
  if (ageSeconds > MAX_AUTH_AGE_SECONDS) {
    throw new HttpError(401, "Telegram login payload expired", "TELEGRAM_AUTH_EXPIRED");
  }
}
