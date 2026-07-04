const { pool } = require('./db');
const { FARM_COOLDOWN_MS, DAILY_COOLDOWN_MS } = require('./gameConfig');

const CHECK_INTERVAL_MS = 60 * 1000;

const MSGS = {
  farm: {
    en: '🧠 Your braincells are fully recharged — go farm some more!',
    uk: '🧠 Твій мозок повністю відновлено — час фармити ще!',
    ru: '🧠 Твой мозг полностью восстановлен — время фармить ещё!',
  },
  daily: {
    en: "🎁 Your daily reward is ready — don't break your streak!",
    uk: '🎁 Твоя щоденна нагорода готова — не переривай стрік!',
    ru: '🎁 Твоя ежедневная награда готова — не прерывай стрик!',
  },
  energy: {
    en: '⚡ <b>Energy full!</b> Your brain is charged and ready to tap. Come earn some BP!',
    uk: '⚡ <b>Енергія повна!</b> Твій мозок заряджений і готовий до тапу. Заходь заробляти BP!',
    ru: '⚡ <b>Энергия полна!</b> Твой мозг заряжен и готов к тапу. Заходи зарабатывать BP!',
  },
  boss: {
    en: (name) => `👾 <b>Boss Alert!</b> <i>${name}</i> has spawned!\nAttack now and earn rewards!`,
    uk: (name) => `👾 <b>Босс з'явився!</b> <i>${name}</i> вийшов на поле!\nАтакуй зараз і отримай нагороди!`,
    ru: (name) => `👾 <b>Босс появился!</b> <i>${name}</i> вышел на поле!\nАтакуй сейчас и получи награды!`,
  },
  duel: {
    en: (challenger, gems) => `⚔️ <b>${challenger}</b> challenged you to a Tap Duel!\n💎 Stake: ${gems} gems — open the app to accept!`,
    uk: (challenger, gems) => `⚔️ <b>${challenger}</b> кинув тобі виклик на Тап-Дуель!\n💎 Ставка: ${gems} кристалів — відкрий застосунок, щоб прийняти!`,
    ru: (challenger, gems) => `⚔️ <b>${challenger}</b> бросил тебе вызов на Тап-Дуэль!\n💎 Ставка: ${gems} кристаллов — открой приложение, чтобы принять!`,
  },
  shop: {
    en: '🛒 <b>Daily Shop refreshed!</b> New items just dropped — grab them before midnight UTC!',
    uk: '🛒 <b>Щоденний магазин оновлено!</b> Нові товари вже в продажу — встигни до опівночі UTC!',
    ru: '🛒 <b>Ежедневный магазин обновлён!</b> Новые товары уже в продаже — успей до полуночи UTC!',
  },
};

function resolveLang(code) {
  if (!code) return 'en';
  if (code.startsWith('uk')) return 'uk';
  if (code.startsWith('ru')) return 'ru';
  return 'en';
}

async function sendMsg(bot, telegramId, text) {
  try {
    await bot.api.sendMessage(telegramId, text, { parse_mode: 'HTML' });
  } catch {}
}

async function checkReminders(bot) {
  const now = Date.now();

  // Farm ready
  const farmDue = await pool.query(
    `SELECT telegram_id, language_code FROM users
     WHERE has_farmed_once = TRUE AND farm_reminder_sent = FALSE AND $1 - last_farm_at >= $2`,
    [now, FARM_COOLDOWN_MS]
  );
  for (const row of farmDue.rows) {
    const lang = resolveLang(row.language_code);
    await sendMsg(bot, row.telegram_id, MSGS.farm[lang]);
    await pool.query('UPDATE users SET farm_reminder_sent = TRUE WHERE telegram_id = $1', [row.telegram_id]);
  }

  // Daily reward ready
  const dailyDue = await pool.query(
    `SELECT telegram_id, language_code FROM users
     WHERE last_daily_at > 0 AND daily_reminder_sent = FALSE AND $1 - last_daily_at >= $2`,
    [now, DAILY_COOLDOWN_MS]
  );
  for (const row of dailyDue.rows) {
    const lang = resolveLang(row.language_code);
    await sendMsg(bot, row.telegram_id, MSGS.daily[lang]);
    await pool.query('UPDATE users SET daily_reminder_sent = TRUE WHERE telegram_id = $1', [row.telegram_id]);
  }

  // Energy full notifications
  const energyDue = await pool.query(
    `SELECT tp.telegram_id, u.language_code
     FROM tapper_profiles tp
     JOIN users u ON u.telegram_id = tp.telegram_id
     WHERE tp.energy_notif_at > 0 AND tp.energy_notif_at <= $1 AND tp.energy_notif_sent = FALSE`,
    [now]
  );
  for (const row of energyDue.rows) {
    const lang = resolveLang(row.language_code);
    await sendMsg(bot, row.telegram_id, MSGS.energy[lang]);
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
      `SELECT tp.telegram_id, u.language_code
       FROM tapper_profiles tp
       JOIN users u ON u.telegram_id = tp.telegram_id
       WHERE tp.last_seen_at >= $1`,
      [now - 7 * 24 * 60 * 60 * 1000]
    );
    for (const t of tappers) {
      const lang = resolveLang(t.language_code);
      await sendMsg(bot, t.telegram_id, MSGS.boss[lang](boss.name));
    }
  }

  // Duel pending notifications (sent once, ~1 min after creation)
  const pendingDuels = await pool.query(
    `SELECT d.opponent_id, u.username AS challenger_name, d.stake_gems, ou.language_code
     FROM tap_duels d
     JOIN users u ON u.telegram_id = d.challenger_id
     JOIN users ou ON ou.telegram_id = d.opponent_id
     WHERE d.status = 'pending' AND d.created_at BETWEEN $1 AND $2`,
    [now - 5 * 60 * 1000, now - 55 * 1000]
  );
  for (const duel of pendingDuels.rows) {
    const lang = resolveLang(duel.language_code);
    await sendMsg(bot, duel.opponent_id, MSGS.duel[lang](duel.challenger_name, duel.stake_gems));
  }

  // Daily shop refresh notification (at midnight UTC ±1 min window)
  const utcHour = new Date(now).getUTCHours();
  const utcMin  = new Date(now).getUTCMinutes();
  if (utcHour === 0 && utcMin < 2) {
    const { rows: active } = await pool.query(
      `SELECT tp.telegram_id, u.language_code
       FROM tapper_profiles tp
       JOIN users u ON u.telegram_id = tp.telegram_id
       WHERE tp.last_seen_at >= $1`,
      [now - 3 * 24 * 60 * 60 * 1000]
    );
    for (const t of active) {
      const lang = resolveLang(t.language_code);
      await sendMsg(bot, t.telegram_id, MSGS.shop[lang]);
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
