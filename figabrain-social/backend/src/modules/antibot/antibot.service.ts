import { prisma } from "../../lib/prisma.js";
import { sha256Hex } from "../../lib/encryption.js";
import { writeAuditLog } from "../../utils/logger.js";

const MULTI_ACCOUNT_DEVICE_THRESHOLD = 3;
const DUPLICATE_CONTENT_WINDOW_MS = 10 * 60_000;
const REWARD_VELOCITY_WINDOW_MS = 5 * 60_000;
const REWARD_VELOCITY_THRESHOLD = 60;
const POST_VELOCITY_WINDOW_MS = 60 * 60_000;
const POST_VELOCITY_THRESHOLD = 30;
const LOW_REPUTATION_THRESHOLD = -50;
const AUTO_SHADOW_BAN_SCORE_THRESHOLD = 50;

/**
 * Flags accounts sharing the same device fingerprint once the count of
 * distinct accounts on that device crosses the threshold. Flagged accounts
 * are shadow-banned rather than hard-banned so the abuser keeps farming
 * worthless rewards instead of immediately noticing and re-registering.
 */
export async function flagMultiAccountAbuse(userId: string, deviceFingerprint: string): Promise<void> {
  const accountsOnDevice = await prisma.user.count({ where: { deviceFingerprint } });

  if (accountsOnDevice >= MULTI_ACCOUNT_DEVICE_THRESHOLD) {
    await prisma.shadowBan.upsert({
      where: { userId },
      create: { userId, reason: `multi_account_device:${accountsOnDevice}` },
      update: {},
    });
    await writeAuditLog({
      userId,
      action: "SHADOW_BAN_APPLIED",
      entity: "User",
      entityId: userId,
      metadata: { reason: "multi_account_device", accountsOnDevice, deviceFingerprint },
    });
  }
}

/**
 * Duplicate-content detection for posts: hashes the normalized content and
 * rejects re-submission of the same text by the same user within a short
 * window, defeating copy-paste spam loops.
 */
export function hashPostContent(content: string): string {
  return sha256Hex(content.trim().toLowerCase());
}

export async function isDuplicatePost(authorId: string, content: string): Promise<boolean> {
  const contentHash = hashPostContent(content);
  const recentDuplicate = await prisma.post.findFirst({
    where: {
      authorId,
      contentHash,
      createdAt: { gte: new Date(Date.now() - DUPLICATE_CONTENT_WINDOW_MS) },
    },
  });
  return recentDuplicate !== null;
}

/**
 * Wallet-abuse heuristic: an address must be unique per user (DB constraint
 * enforces this) and a single user must not control more than one active
 * wallet record. Surfaced here so future on-chain top-up flows can call it
 * before crediting a wallet.
 */
export async function isWalletAbuseSuspected(userId: string): Promise<boolean> {
  const walletCount = await prisma.wallet.count({ where: { userId } });
  return walletCount > 1;
}

export interface SuspiciousScore {
  score: number;
  rewardVelocityFlag: boolean;
  postVelocityFlag: boolean;
  multiAccountFlag: boolean;
  lowReputationFlag: boolean;
}

/**
 * Combines independent abuse signals into a single 0-100 score: each flag
 * that trips contributes 25 points. Cheap, index-backed counts only — safe
 * to run on every rewarded action, not just on a moderation review pass.
 */
export async function computeSuspiciousScore(userId: string): Promise<SuspiciousScore> {
  const [rewardEventCount, postCount, user] = await Promise.all([
    prisma.rewardLedgerEntry.count({
      where: { userId, createdAt: { gte: new Date(Date.now() - REWARD_VELOCITY_WINDOW_MS) } },
    }),
    prisma.post.count({
      where: { authorId: userId, createdAt: { gte: new Date(Date.now() - POST_VELOCITY_WINDOW_MS) } },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { reputation: true, deviceFingerprint: true } }),
  ]);

  const accountsOnDevice = user.deviceFingerprint
    ? await prisma.user.count({ where: { deviceFingerprint: user.deviceFingerprint } })
    : 1;

  const flags: SuspiciousScore = {
    score: 0,
    rewardVelocityFlag: rewardEventCount > REWARD_VELOCITY_THRESHOLD,
    postVelocityFlag: postCount > POST_VELOCITY_THRESHOLD,
    multiAccountFlag: accountsOnDevice >= MULTI_ACCOUNT_DEVICE_THRESHOLD,
    lowReputationFlag: user.reputation < LOW_REPUTATION_THRESHOLD,
  };
  flags.score =
    (Number(flags.rewardVelocityFlag) +
      Number(flags.postVelocityFlag) +
      Number(flags.multiAccountFlag) +
      Number(flags.lowReputationFlag)) *
    25;

  return flags;
}

/**
 * Auto shadow-bans a user once their suspicious score crosses the threshold.
 * Idempotent: never re-bans or downgrades a manually-applied ban. Called
 * after every reward grant so farms get caught within their first abusive
 * burst instead of waiting for a manual review pass.
 */
export async function evaluateAndAutoShadowBan(userId: string): Promise<void> {
  const breakdown = await computeSuspiciousScore(userId);
  if (breakdown.score < AUTO_SHADOW_BAN_SCORE_THRESHOLD) return;

  const existing = await prisma.shadowBan.findUnique({ where: { userId } });
  if (existing) return;

  await prisma.shadowBan.create({ data: { userId, reason: `suspicious_score:${breakdown.score}` } });
  await prisma.user.update({ where: { id: userId }, data: { isShadowBanned: true } });
  await writeAuditLog({
    userId,
    action: "AUTO_SHADOW_BAN",
    entity: "User",
    entityId: userId,
    metadata: { ...breakdown },
  });
}
