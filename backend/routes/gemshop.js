const express = require('express');
const { withTransaction, pool } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { GEMSHOP_ITEMS, BRAIN_SKINS, TAPPER_UPGRADES, TAPPER_MAX_OFFLINE_HOURS, pickLootBoxPrize } = require('../gameConfig');
const { applyLootPrize } = require('./dailyshop');
const { computeCardOfflineIncome } = require('./cards');

const router = express.Router();

// GET /gemshop
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const now = Date.now();

  const [userRow, profileRow, boostRow] = await Promise.all([
    pool.query('SELECT gems FROM users WHERE telegram_id = $1', [telegramId]),
    pool.query('SELECT selected_skin, skins_unlocked, prestige FROM tapper_profiles WHERE telegram_id = $1', [telegramId]),
    pool.query(
      "SELECT expires_at FROM user_boosts WHERE telegram_id=$1 AND boost_type='2x_tap' AND expires_at>$2 ORDER BY expires_at DESC LIMIT 1",
      [telegramId, now]
    ),
  ]);

  const gems = userRow.rows[0]?.gems || 0;
  const profile = profileRow.rows[0] || { selected_skin: 'default', skins_unlocked: [], prestige: 0 };
  const activeBoostExpiresAt = boostRow.rows[0]?.expires_at || null;

  // Auto-unlock prestige skins
  const autoUnlocked = Object.entries(BRAIN_SKINS)
    .filter(([, s]) => s.auto && profile.prestige >= s.minPrestige)
    .map(([k]) => k);

  const allUnlocked = [...new Set([...profile.skins_unlocked, ...autoUnlocked, 'default'])];

  const autoTapperBoost = await pool.query(
    "SELECT expires_at FROM user_boosts WHERE telegram_id=$1 AND boost_type='auto_tapper' AND expires_at>$2 ORDER BY expires_at DESC LIMIT 1",
    [telegramId, now]
  );
  const autoTapperExpiresAt = autoTapperBoost.rows[0]?.expires_at || null;

  const items = GEMSHOP_ITEMS.map((item) => ({
    ...item,
    owned: item.type === 'skin' ? allUnlocked.includes(item.key) : false,
    canAfford: gems >= item.cost,
  }));

  res.json({
    gems,
    items,
    skins: Object.entries(BRAIN_SKINS).map(([key, skin]) => ({
      key,
      ...skin,
      unlocked: allUnlocked.includes(key),
    })),
    selectedSkin: profile.selected_skin,
    activeBoostExpiresAt,
    autoTapperExpiresAt,
  });
}));

// POST /gemshop/buy
router.post('/buy', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { key } = req.body;

  const item = GEMSHOP_ITEMS.find((i) => i.key === key);
  if (!item) return res.status(400).json({ error: 'Unknown item' });

  const result = await withTransaction(async (client) => {
    const user = await client.query('SELECT gems FROM users WHERE telegram_id = $1', [telegramId]);
    if ((user.rows[0]?.gems || 0) < item.cost) return { error: 'Not enough gems' };

    await client.query('UPDATE users SET gems = gems - $1 WHERE telegram_id = $2', [item.cost, telegramId]);

    const now = Date.now();

    if (item.type === 'instant' && key === 'energy_refill') {
      await client.query(
        `UPDATE tapper_profiles SET
           energy = 1000 + energy_max_level * 1000,
           last_energy_at = $1
         WHERE telegram_id = $2`,
        [now, telegramId]
      );
    }

    if (item.type === 'boost') {
      await client.query(
        'INSERT INTO user_boosts (telegram_id, boost_type, expires_at, activated_at) VALUES ($1,$2,$3,$4)',
        [telegramId, key, now + item.durationMs, now]
      );
    }

    if (item.type === 'instant' && key === 'auto_income') {
      const profile = await client.query('SELECT * FROM tapper_profiles WHERE telegram_id = $1', [telegramId]);
      if (profile.rows[0]) {
        const p = profile.rows[0];
        const autoBrainPerMin = TAPPER_UPGRADES.AUTO_BRAIN.getEffect(p.auto_brain_level);
        const autoBrainBP = Math.floor(autoBrainPerMin * TAPPER_MAX_OFFLINE_HOURS * 60);
        const { income: cardBP } = await computeCardOfflineIncome(client, telegramId, now - TAPPER_MAX_OFFLINE_HOURS * 3_600_000);
        const total = autoBrainBP + cardBP;
        if (total > 0) {
          await client.query(
            'UPDATE users SET coins = coins + $1, weekly_coins = weekly_coins + $1 WHERE telegram_id = $2',
            [total, telegramId]
          );
          await client.query(
            'UPDATE tapper_profiles SET total_bp_earned = total_bp_earned + $1, last_seen_at = $2 WHERE telegram_id = $3',
            [total, now, telegramId]
          );
        }
        return { success: true, bonusCoins: total };
      }
    }

    if (key === 'loot_box') {
      const prize = pickLootBoxPrize();
      await applyLootPrize(client, telegramId, prize, now);
      return { success: true, lootResult: prize };
    }

    if (key === 'auto_tapper') {
      await client.query(
        'INSERT INTO user_boosts (telegram_id,boost_type,expires_at,activated_at) VALUES($1,$2,$3,$4)',
        [telegramId, 'auto_tapper', now + item.durationMs, now]
      );
      return { success: true };
    }

    if (item.type === 'skill_points') {
      await client.query('UPDATE tapper_profiles SET skill_points=skill_points+$1 WHERE telegram_id=$2', [item.amount, telegramId]);
      return { success: true };
    }

    if (item.type === 'skin') {
      await client.query(
        `UPDATE tapper_profiles
         SET skins_unlocked = array_append(
           CASE WHEN $1 = ANY(skins_unlocked) THEN skins_unlocked ELSE skins_unlocked END, $1
         )
         WHERE telegram_id = $2 AND NOT ($1 = ANY(skins_unlocked))`,
        [key, telegramId]
      );
    }

    return { success: true };
  });

  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

// POST /gemshop/skin — equip a skin
router.post('/skin', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { skin } = req.body;

  if (!BRAIN_SKINS[skin]) return res.status(400).json({ error: 'Unknown skin' });

  const profile = await pool.query('SELECT skins_unlocked, prestige FROM tapper_profiles WHERE telegram_id = $1', [telegramId]);
  const p = profile.rows[0];
  if (!p) return res.status(404).json({ error: 'Profile not found' });

  const skinCfg = BRAIN_SKINS[skin];
  const isUnlocked = skin === 'default'
    || p.skins_unlocked.includes(skin)
    || (skinCfg.auto && p.prestige >= (skinCfg.minPrestige || 0));

  if (!isUnlocked) return res.status(403).json({ error: 'Skin not unlocked' });

  await pool.query('UPDATE tapper_profiles SET selected_skin = $1 WHERE telegram_id = $2', [skin, telegramId]);
  res.json({ success: true, selectedSkin: skin });
}));

module.exports = router;
