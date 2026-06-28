import { env } from "../../lib/env.js";

const API = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;

export interface TelegramUser {
  telegramId: string | null;
  displayName: string;
}

async function callApi(method: string, body: Record<string, unknown>): Promise<void> {
  try {
    const res = await fetch(`${API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[Telegram] ${method} failed: ${res.status} ${text}`);
    }
  } catch (err) {
    // Never throw — Telegram delivery is best-effort
    console.warn("[Telegram] network error:", err);
  }
}

export async function sendMessage(chatId: string | number, text: string): Promise<void> {
  await callApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

export async function notifyUser(user: TelegramUser, text: string): Promise<void> {
  if (!user.telegramId) return;
  await sendMessage(user.telegramId, text);
}

export async function setWebhook(webhookUrl: string, secret: string): Promise<void> {
  await callApi("setWebhook", {
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
  console.log(`[Telegram] Webhook registered: ${webhookUrl}`);
}

export async function deleteWebhook(): Promise<void> {
  await callApi("deleteWebhook", { drop_pending_updates: false });
}

export async function getWebhookInfo(): Promise<unknown> {
  const res = await fetch(`${API}/getWebhookInfo`);
  return res.json();
}
