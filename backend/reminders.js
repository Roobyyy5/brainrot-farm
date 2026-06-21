const { pool } = require('./db');
const { FARM_COOLDOWN_MS, DAILY_COOLDOWN_MS } = require('./gameConfig');

const CHECK_INTERVAL_MS = 60 * 1000;

async function sendReminder(bot, telegramId, text, column) {
  try {
    await bot.api.sendMessage(telegramId, text);
  } catch (err) {
    console.error(`Failed to send reminder to ${telegramId}:`, err.message);
  }
  // Mark as sent even on failure (e.g. user blocked the bot) to avoid retrying forever.
  await pool.query(`UPDATE users SET ${column} = TRUE WHERE telegram_id = $1`, [telegramId]);
}

async function checkReminders(bot) {
  const now = Date.now();

  const farmDue = await pool.query(
    `SELECT telegram_id FROM users
     WHERE has_farmed_once = TRUE AND farm_reminder_sent = FALSE AND $1 - last_farm_at >= $2`,
    [now, FARM_COOLDOWN_MS]
  );
  for (const row of farmDue.rows) {
    await sendReminder(bot, row.telegram_id, '🧠 Your braincells are fully recharged — go farm some more!', 'farm_reminder_sent');
  }

  const dailyDue = await pool.query(
    `SELECT telegram_id FROM users
     WHERE last_daily_at > 0 AND daily_reminder_sent = FALSE AND $1 - last_daily_at >= $2`,
    [now, DAILY_COOLDOWN_MS]
  );
  for (const row of dailyDue.rows) {
    await sendReminder(bot, row.telegram_id, "🎁 Your daily reward is ready — don't break your streak!", 'daily_reminder_sent');
  }
}

function startReminders(bot) {
  setInterval(() => {
    checkReminders(bot).catch((err) => console.error('Reminder check failed:', err.message));
  }, CHECK_INTERVAL_MS);
  console.log('Reminder loop started.');
}

module.exports = { startReminders };
