// Real-time pings to the project owner's own Telegram chat for high-signal
// events (new player, referral conversion, achievement unlock) — independent
// of the bot's grammY instance, just a direct Bot API call, fire-and-forget.
function notifyOwner(text) {
  if (!process.env.BOT_TOKEN || !process.env.OWNER_TELEGRAM_ID) return;
  fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.OWNER_TELEGRAM_ID, text }),
  }).catch((err) => console.error('Failed to notify owner:', err.message));
}

module.exports = { notifyOwner };
