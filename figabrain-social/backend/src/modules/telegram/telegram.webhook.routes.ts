import { Router } from "express";
import { env } from "../../lib/env.js";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { sendMessage } from "./telegram.service.js";

export const telegramWebhookRouter = Router();

const COMMANDS: Record<string, (chatId: number, user: { username: string; displayName: string; brainPoints: number } | null) => string> = {
  start: (_, u) =>
    u
      ? `Привіт, ${u.displayName}! Твій баланс: <b>${u.brainPoints} BP</b>.`
      : "Привіт! Відкрий FIGABRAIN та авторизуйся через Telegram, щоб зв'язати акаунт.",
  balance: (_, u) =>
    u
      ? `Твій баланс Brain Points: <b>${u.brainPoints} BP</b>.`
      : "Акаунт не знайдено. Увійди через FIGABRAIN.",
  help: () =>
    "/balance — залишок Brain Points\n/help — список команд",
};

telegramWebhookRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const secret = req.headers["x-telegram-bot-api-secret-token"];
    if (!env.TELEGRAM_WEBHOOK_SECRET || secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const update = req.body as {
      message?: {
        chat: { id: number };
        from?: { id: number };
        text?: string;
      };
    };

    const msg = update.message;
    if (!msg?.text || !msg.from) {
      res.sendStatus(200);
      return;
    }

    const chatId = msg.chat.id;
    const telegramId = String(msg.from.id);
    const text = msg.text.trim();

    // Handle /start login_TOKEN (bot-based auth flow)
    const loginMatch = text.match(/^\/start login_([0-9a-f]{48})$/i);
    if (loginMatch) {
      const token = loginMatch[1]!;
      const record = await prisma.telegramAuthToken
        .findUnique({ where: { token } })
        .catch(() => null);

      if (record && !record.telegramId && record.expiresAt > new Date()) {
        await prisma.telegramAuthToken.update({ where: { token }, data: { telegramId } });
        const appUrl = env.APP_URL?.replace("backend", "frontend") ?? "https://figabrain-frontend.onrender.com";
        await sendMessage(
          chatId,
          `✅ <b>Авторизація підтверджена!</b>\n\nПовернись у FIGABRAIN і ти автоматично увійдеш в акаунт.\n\n<a href="${appUrl}">Відкрити FIGABRAIN</a>`
        );
      } else {
        await sendMessage(chatId, "❌ Посилання недійсне або прострочене. Спробуй увійти знову.");
      }
      res.sendStatus(200);
      return;
    }

    const commandMatch = text.match(/^\/(\w+)/);
    const commandKey = commandMatch?.[1]?.toLowerCase();

    if (commandKey && commandKey in COMMANDS) {
      const raw = await prisma.user
        .findFirst({
          where: { telegramId },
          select: { username: true, displayName: true, brainPoints: true },
        })
        .catch(() => null);
      const user = raw ? { ...raw, brainPoints: Number(raw.brainPoints) } : null;

      const reply = COMMANDS[commandKey]!(chatId, user);
      await sendMessage(chatId, reply);
    }

    res.sendStatus(200);
  })
);
