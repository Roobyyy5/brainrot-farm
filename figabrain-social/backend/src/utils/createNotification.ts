import { Prisma, NotificationType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { notifyUser } from "../modules/telegram/telegram.service.js";
import { sendPushToUser } from "../lib/webpush.js";

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

  const recipient = await prisma.user
    .findUnique({
      where: { id: notification.recipientId },
      select: { telegramId: true, displayName: true },
    })
    .catch(() => null);

  const emoji = TYPE_EMOJI[notification.type as NotificationType] ?? "•";

  // Telegram push
  if (recipient?.telegramId) {
    await notifyUser(
      { telegramId: recipient.telegramId, displayName: recipient.displayName },
      `${emoji} <b>FIGABRAIN</b>\n${notification.message}`
    ).catch(() => {});
  }

  // Web push
  sendPushToUser(notification.recipientId, {
    title: `FIGABRAIN ${emoji}`,
    body: notification.message,
    url: "/notifications",
  }).catch(() => {});
}
