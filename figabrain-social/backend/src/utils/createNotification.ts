import { Prisma, NotificationType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { notifyUser } from "../modules/telegram/telegram.service.js";

const TYPE_EMOJI: Record<NotificationType, string> = {
  LIKE: "♥",
  COMMENT: "💬",
  FOLLOW: "👤",
  REPOST: "⟲",
  REWARD: "🎁",
  MENTION: "@",
  SYSTEM: "📢",
};

export async function createNotification(
  data: Prisma.NotificationCreateInput
): Promise<void> {
  const notification = await prisma.notification.create({ data });

  // Fire-and-forget Telegram push — never blocks the main response
  const recipient = await prisma.user
    .findUnique({
      where: { id: notification.recipientId },
      select: { telegramId: true, displayName: true },
    })
    .catch(() => null);

  if (recipient?.telegramId) {
    const emoji = TYPE_EMOJI[notification.type as NotificationType] ?? "•";
    await notifyUser(
      { telegramId: recipient.telegramId, displayName: recipient.displayName },
      `${emoji} <b>FIGABRAIN</b>\n${notification.message}`
    );
  }
}
