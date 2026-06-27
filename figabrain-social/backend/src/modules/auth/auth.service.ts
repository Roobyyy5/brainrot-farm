import { prisma } from "../../lib/prisma.js";
import { generateWallet } from "../../lib/wallet.js";
import { signAccessToken, signRefreshToken } from "../../lib/jwt.js";
import { grantReward } from "../rewards/rewards.service.js";
import { applyStreakUpdate } from "../streaks/streaks.service.js";
import { writeAuditLog } from "../../utils/logger.js";
import type { TelegramLoginPayload } from "./telegramVerify.js";

function slugifyUsername(base: string, telegramId: string): string {
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
  return cleaned.length >= 3 ? cleaned : `brain_${telegramId}`;
}

async function ensureUniqueUsername(candidate: string): Promise<string> {
  let username = candidate;
  for (let suffix = 0; suffix <= 99; suffix++) {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (!existing) return username;
    username = `${candidate}${suffix + 1}`;
  }
  // Fallback: append telegramId-derived random segment (collision-safe)
  return `${candidate}_${Date.now().toString(36)}`;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
  userId: string;
}

type UserRow = Awaited<ReturnType<typeof prisma.user.findUniqueOrThrow>>;

/** Applies the daily-login streak/reward side effects and mints tokens for an already-resolved user row. */
async function loginExistingUser(user: UserRow, freshAvatarUrl?: string): Promise<LoginResult> {
  const today = new Date();
  const lastLogin = user.lastLoginAt;
  const isConsecutiveDay =
    lastLogin && today.getTime() - lastLogin.getTime() < 48 * 60 * 60 * 1000 && today.toDateString() !== lastLogin.toDateString();
  const isSameDay = lastLogin && today.toDateString() === lastLogin.toDateString();

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: today,
      ...(freshAvatarUrl && freshAvatarUrl !== user.avatarUrl ? { avatarUrl: freshAvatarUrl } : {}),
    },
  });

  if (!isSameDay) {
    const newStreak = isConsecutiveDay ? user.loginStreak + 1 : 1;
    await applyStreakUpdate(user.id, newStreak, !isConsecutiveDay);
    await grantReward(user.id, "DAILY_LOGIN", undefined, { streak: newStreak });
  }

  return {
    accessToken: signAccessToken({ sub: updated.id, username: updated.username, isAdmin: updated.isAdmin }),
    refreshToken: signRefreshToken({ sub: updated.id }),
    isNewUser: false,
    userId: updated.id,
  };
}

/** Logs into an existing account by username, bypassing telegramId entirely. Dev-only: see /auth/dev-login. */
export async function loginByUsername(username: string): Promise<LoginResult | null> {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return null;
  return loginExistingUser(user); // dev-login: no photo_url available
}


export async function loginOrRegisterWithTelegram(
  payload: TelegramLoginPayload,
  referralCode: string | undefined,
  deviceFingerprint: string | undefined,
  ip: string | undefined
): Promise<LoginResult> {
  const telegramId = String(payload.id);
  let user = await prisma.user.findUnique({ where: { telegramId } });
  let isNewUser = false;

  if (!user) {
    const usernameBase = slugifyUsername(payload.username ?? payload.first_name, telegramId);
    const username = await ensureUniqueUsername(usernameBase);
    const referredBy = referralCode
      ? await prisma.user.findUnique({ where: { username: referralCode } })
      : null;
    const generatedWallet = generateWallet();

    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          telegramId,
          username,
          displayName: payload.first_name,
          avatarUrl: payload.photo_url,
          referredById: referredBy?.id,
          deviceFingerprint,
          lastLoginAt: new Date(),
          loginStreak: 1,
          wallet: {
            create: {
              address: generatedWallet.address,
              publicKey: generatedWallet.publicKey,
              encryptedPrivateKey: generatedWallet.encrypted.ciphertext,
              encryptionIv: generatedWallet.encrypted.iv,
              encryptionAuthTag: generatedWallet.encrypted.authTag,
            },
          },
        },
      });
      return created;
    });

    isNewUser = true;

    if (referredBy) {
      await grantReward(referredBy.id, "REFERRAL", user.id, { newUserId: user.id });
    }

    await writeAuditLog({ userId: user.id, action: "USER_REGISTERED", entity: "User", entityId: user.id, ip });

    return {
      accessToken: signAccessToken({ sub: user.id, username: user.username, isAdmin: user.isAdmin }),
      refreshToken: signRefreshToken({ sub: user.id }),
      isNewUser,
      userId: user.id,
    };
  }

  return loginExistingUser(user, payload.photo_url);
}
