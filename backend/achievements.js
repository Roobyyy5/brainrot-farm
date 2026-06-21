const { pool } = require('./db');
const { ACHIEVEMENTS } = require('./gameConfig');
const { logEvent } = require('./events');

// Call after any action that could move the needle on an achievement
// (farm, daily, referral). Grants newly-met achievements' coin rewards and
// returns the list of achievements unlocked just now (for UI toasts).
async function checkAndGrantAchievements(telegramId, userRow) {
  const alreadyUnlocked = await pool.query('SELECT achievement_key FROM achievements WHERE telegram_id = $1', [
    telegramId,
  ]);
  const unlockedKeys = new Set(alreadyUnlocked.rows.map((r) => r.achievement_key));

  const candidates = ACHIEVEMENTS.filter((a) => !unlockedKeys.has(a.key));
  if (candidates.length === 0) return [];

  const referralsResult = await pool.query(
    'SELECT count(*) AS total, count(*) FILTER (WHERE active_bonus_paid) AS active FROM referrals WHERE referrer_id = $1',
    [telegramId]
  );
  const ctx = {
    totalReferrals: parseInt(referralsResult.rows[0].total, 10),
    activeReferrals: parseInt(referralsResult.rows[0].active, 10),
  };

  const newlyUnlocked = [];
  for (const achievement of candidates) {
    if (achievement.check(userRow, ctx)) {
      const inserted = await pool.query(
        `INSERT INTO achievements (telegram_id, achievement_key, created_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (telegram_id, achievement_key) DO NOTHING
         RETURNING id`,
        [telegramId, achievement.key, Date.now()]
      );
      if (inserted.rows[0]) {
        await pool.query('UPDATE users SET coins = coins + $1, weekly_coins = weekly_coins + $1 WHERE telegram_id = $2', [
          achievement.reward,
          telegramId,
        ]);
        logEvent(telegramId, `achievement_${achievement.key}`);
        newlyUnlocked.push(achievement);
      }
    }
  }
  return newlyUnlocked;
}

module.exports = { checkAndGrantAchievements };
