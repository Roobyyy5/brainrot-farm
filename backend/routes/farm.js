const express = require('express');
const { pool } = require('../db');
const { FARM_COOLDOWN_MS, FARM_MIN_REWARD, FARM_MAX_REWARD, levelForCoins, REFERRAL_ACTIVE_BONUS } = require('../gameConfig');
const { logEvent } = require('../events');
const { notifyOwner } = require('../notifyOwner');
const { checkAndGrantAchievements } = require('../achievements');
const { asyncHandler } = require('../asyncHandler');

const router = express.Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
  const { id: telegramId } = req.tgUser;
  const now = Date.now();
  const reward = Math.floor(Math.random() * (FARM_MAX_REWARD - FARM_MIN_REWARD + 1)) + FARM_MIN_REWARD;

  // Single atomic UPDATE guarded by the cooldown condition. Postgres takes a
  // row lock for the duration of the UPDATE, so two concurrent farm requests
  // for the same user can't both pass the cooldown check and both apply —
  // the second one re-evaluates WHERE against the first one's committed
  // result and correctly fails. Using `coins = coins + $reward` (relative)
  // rather than a value computed from a separately-read snapshot avoids a
  // lost-update anomaly where the second writer overwrites the first.
  const updateResult = await pool.query(
    `UPDATE users
     SET coins = coins + $1, weekly_coins = weekly_coins + $1, last_farm_at = $2,
         has_farmed_once = TRUE, farm_reminder_sent = FALSE, farm_count = farm_count + 1
     WHERE telegram_id = $3 AND $2 - last_farm_at >= $4
     RETURNING *`,
    [reward, now, telegramId, FARM_COOLDOWN_MS]
  );

  if (!updateResult.rows[0]) {
    const existing = await pool.query('SELECT last_farm_at FROM users WHERE telegram_id = $1', [telegramId]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'User not found. Call /register first.' });
    const elapsed = now - existing.rows[0].last_farm_at;
    return res.status(429).json({
      error: 'Farming on cooldown',
      retryAfterMs: FARM_COOLDOWN_MS - elapsed,
    });
  }

  let user = updateResult.rows[0];

  const newLevel = levelForCoins(user.coins);
  if (newLevel !== user.level) {
    const leveled = await pool.query('UPDATE users SET level = $1 WHERE telegram_id = $2 RETURNING *', [
      newLevel,
      telegramId,
    ]);
    user = leveled.rows[0];
  }

  // farm_count having just become 1 is a race-safe signal that this is this
  // user's first-ever farm (the atomic increment above serializes concurrent
  // attempts, so only one request can ever observe this transition).
  let referralBonusPaidTo = null;
  if (user.farm_count === 1 && user.referred_by) {
    const refRow = await pool.query(
      `UPDATE referrals SET active_bonus_paid = TRUE
       WHERE referred_id = $1 AND active_bonus_paid = FALSE
       RETURNING referrer_id`,
      [telegramId]
    );
    if (refRow.rows[0]) {
      referralBonusPaidTo = refRow.rows[0].referrer_id;
      await pool.query('UPDATE users SET coins = coins + $1, weekly_coins = weekly_coins + $1 WHERE telegram_id = $2', [
        REFERRAL_ACTIVE_BONUS,
        referralBonusPaidTo,
      ]);
    }
  }

  logEvent(telegramId, 'farm');
  if (referralBonusPaidTo) {
    logEvent(referralBonusPaidTo, 'referral_active');
    notifyOwner(`✅ Referral active: @${user.username || telegramId}'s invite just farmed for the first time`);
  }

  const unlockedAchievements = await checkAndGrantAchievements(telegramId, user);
  if (unlockedAchievements.length) {
    const final = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
    user = final.rows[0];
    for (const a of unlockedAchievements) {
      notifyOwner(`🏅 @${user.username || telegramId} unlocked "${a.name}" (+${a.reward})`);
    }
  }

    res.json({ reward, user, unlockedAchievements });
  })
);

module.exports = router;
