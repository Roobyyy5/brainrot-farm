import { prisma } from "../../lib/prisma.js";
import { sha256Hex } from "../../lib/encryption.js";
import { writeAuditLog } from "../../utils/logger.js";

const MULTI_ACCOUNT_DEVICE_THRESHOLD = 3;
const DUPLICATE_CONTENT_WINDOW_MS = 10 * 60_000;

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
