const { pool } = require('./db');
const { FARM_COOLDOWN_MS, DAILY_COOLDOWN_MS } = require('./gameConfig');

const CHECK_INTERVAL_MS = 60 * 1000;

async function sendMsg(bot, telegramId, text) {
  try {
    await bot.api.sendMessage(telegramId, text, { parse_mode: 'HTML' });
  } catch {}
}

async function checkReminders(bot) {
  const now = Date.now();

  // Farm ready
  const farmDue = await pool.query(
    `SELECT telegram_id FROM users
     WHERE has_farmed_once = TRUE AND farm_reminder_sent = FALSE AND $1 - last_farm_at >= $2`,
    [now, FARM_COOLDOWN_MS]
  );
  for (const row of farmDue.rows) {
    await sendMsg(bot, row.telegram_id, '🧠 Your braincells are fully recharged — go farm some more!');
    await pool.query('UPDATE users SET farm_reminder_sent = TRUE WHERE telegram_id = $1', [row.telegram_id]);
  }

  // Daily reward ready
  const dailyDue = await pool.query(
    `SELECT telegram_id FROM users
     WHERE last_daily_at > 0 AND daily_reminder_sent = FALSE AND $1 - last_daily_at >= $2`,
    [now, DAILY_COOLDOWN_MS]
  );
  for (const row of dailyDue.rows) {
    await sendMsg(bot, row.telegram_id, "🎁 Your daily reward is ready — don't break your streak!");
    await pool.query('UPDATE users SET daily_reminder_sent = TRUE WHERE telegram_id = $1', [row.telegram_id]);
  }

  // Energy full notifications
  const energyDue = await pool.query(
    `SELECT telegram_id FROM tapper_profiles
     WHERE energy_notif_at > 0 AND energy_notif_at <= $1 AND energy_notif_sent = FALSE`,
    [now]
  );
  for (const row of energyDue.rows) {
    await sendMsg(bot, row.telegram_id, '⚡ <b>Energy full!</b> Your brain is charged and ready to tap. Come earn some BP!');
    await pool.query('UPDATE tapper_profiles SET energy_notif_sent = TRUE WHERE telegram_id = $1', [row.telegram_id]);
  }

  // Boss spawn notifications (once per new boss)
  const newBosses = await pool.query(
    `SELECT id, name FROM boss_fights
     WHERE notif_sent = FALSE AND ends_at > $1 AND completed = FALSE`,
    [now]
  );
  for (const boss of newBosses.rows) {
    await pool.query('UPDATE boss_fights SET notif_sent = TRUE WHERE id = $1', [boss.id]);
    const { rows: tappers } = await pool.query(
      'SELECT telegram_id FROM tapper_profiles WHERE last_seen_at >= $1',
      [now - 7 * 24 * 60 * 60 * 1000]
    );
    for (const t of tappers) {
      await sendMsg(bot, t.telegram_id,
        `👾 <b>Boss Alert!</b> <i>${boss.name}</i> has spawned!\nAttack now and earn rewards!`
      );
    }
  }

  // Duel pending notifications (sent once, ~1 min after creation)
  const pendingDuels = await pool.query(
    `SELECT d.opponent_id, u.username AS challenger_name, d.stake_gems
     FROM tap_duels d
     JOIN users u ON u.telegram_id = d.challenger_id
     WHERE d.status = 'pending' AND d.created_at BETWEEN $1 AND $2`,
    [now - 5 * 60 * 1000, now - 55 * 1000]
  );
  for (const duel of pendingDuels.rows) {
    await sendMsg(bot, duel.opponent_id,
      `⚔️ <b>${duel.challenger_name}</b> challenged you to a Tap Duel!\n💎 Stake: ${duel.stake_gems} gems — open the app to accept!`
    );
  }

  // Daily shop refresh notification (at midnight UTC ±1 min window)
  const utcHour = new Date(now).getUTCHours();
  const utcMin  = new Date(now).getUTCMinutes();
  if (utcHour === 0 && utcMin < 2) {
    const { rows: active } = await pool.query(
      'SELECT telegram_id FROM tapper_profiles WHERE last_seen_at >= $1',
      [now - 3 * 24 * 60 * 60 * 1000]
    );
    for (const t of active) {
      await sendMsg(bot, t.telegram_id,
        '🛒 <b>Daily Shop refreshed!</b> New items just dropped — grab them before midnight UTC!'
      );
    }
  }
}

function startReminders(bot) {
  setInterval(() => {
    checkReminders(bot).catch((err) => console.error('Reminder check failed:', err.message));
  }, CHECK_INTERVAL_MS);
  console.log('Reminder loop started.');
}

module.exports = { startReminders };
