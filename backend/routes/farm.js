const express = require('express');
const db = require('../db');
const { FARM_COOLDOWN_MS, FARM_MIN_REWARD, FARM_MAX_REWARD, levelForCoins, REFERRAL_ACTIVE_BONUS } = require('../gameConfig');

const router = express.Router();

router.post('/', (req, res) => {
  const { id: telegramId } = req.tgUser;
  const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
  if (!user) return res.status(404).json({ error: 'User not found. Call /register first.' });

  const now = Date.now();
  const elapsed = now - user.last_farm_at;
  if (elapsed < FARM_COOLDOWN_MS) {
    return res.status(429).json({
      error: 'Farming on cooldown',
      retryAfterMs: FARM_COOLDOWN_MS - elapsed,
    });
  }

  const reward = Math.floor(Math.random() * (FARM_MAX_REWARD - FARM_MIN_REWARD + 1)) + FARM_MIN_REWARD;
  const newCoins = user.coins + reward;
  const newLevel = levelForCoins(newCoins);

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE users SET coins = ?, level = ?, last_farm_at = ?, has_farmed_once = 1
      WHERE telegram_id = ?
    `).run(newCoins, newLevel, now, telegramId);

    // Pay the referrer an "active friend" bonus the first time this user farms.
    if (!user.has_farmed_once && user.referred_by) {
      const refRow = db.prepare(`
        SELECT * FROM referrals WHERE referred_id = ? AND active_bonus_paid = 0
      `).get(telegramId);
      if (refRow) {
        db.prepare('UPDATE users SET coins = coins + ? WHERE telegram_id = ?')
          .run(REFERRAL_ACTIVE_BONUS, refRow.referrer_id);
        db.prepare('UPDATE referrals SET active_bonus_paid = 1 WHERE id = ?').run(refRow.id);
      }
    }
  });
  tx();

  const updated = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
  res.json({ reward, user: updated });
});

module.exports = router;
