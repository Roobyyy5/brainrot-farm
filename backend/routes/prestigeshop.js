const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { PRESTIGE_SHOP } = require('../gameConfig');

const router = express.Router();

// GET /prestigeshop — shop items + owned levels + prestige tokens
router.get('/', asyncHandler(async (req, res) => {
  const tid = req.tgUser.id.toString();
  const [profileRes, upgradesRes] = await Promise.all([
    pool.query('SELECT prestige, prestige_tokens FROM tapper_profiles WHERE telegram_id=$1', [tid]),
    pool.query('SELECT upgrade_key, level FROM prestige_upgrades WHERE telegram_id=$1', [tid]),
  ]);
  const profile = profileRes.rows[0] || { prestige: 0, prestige_tokens: 0 };
  const owned = {};
  for (const r of upgradesRes.rows) owned[r.upgrade_key] = r.level;

  const items = PRESTIGE_SHOP.map(item => ({
    ...item,
    currentLevel: owned[item.key] || 0,
    cost: item.costPerLevel,
    canUpgrade: (owned[item.key] || 0) < item.maxLevel && (profile.prestige_tokens || 0) >= item.costPerLevel,
    isMaxed: (owned[item.key] || 0) >= item.maxLevel,
  }));

  res.json({
    items,
    prestigeTokens: Number(profile.prestige_tokens) || 0,
    prestige: Number(profile.prestige) || 0,
  });
}));

// POST /prestigeshop/buy — buy one level of an upgrade
router.post('/buy', asyncHandler(async (req, res) => {
  const tid = req.tgUser.id.toString();
  const { upgradeKey } = req.body;
  const shopItem = PRESTIGE_SHOP.find(i => i.key === upgradeKey);
  if (!shopItem) return res.status(400).json({ error: 'Unknown upgrade' });

  const result = await withTransaction(async (client) => {
    const { rows: prof } = await client.query(
      'SELECT prestige_tokens FROM tapper_profiles WHERE telegram_id=$1 FOR UPDATE',
      [tid]
    );
    if (!prof[0]) return { error: 'No profile' };
    if (prof[0].prestige_tokens < shopItem.costPerLevel) return { error: `Need ${shopItem.costPerLevel} prestige tokens` };

    const { rows: existing } = await client.query(
      'SELECT level FROM prestige_upgrades WHERE telegram_id=$1 AND upgrade_key=$2',
      [tid, upgradeKey]
    );
    const currentLevel = existing[0]?.level || 0;
    if (currentLevel >= shopItem.maxLevel) return { error: 'Already maxed' };

    await client.query(
      'UPDATE tapper_profiles SET prestige_tokens=prestige_tokens-$1 WHERE telegram_id=$2',
      [shopItem.costPerLevel, tid]
    );
    await client.query(
      `INSERT INTO prestige_upgrades (telegram_id, upgrade_key, level) VALUES ($1, $2, $3)
       ON CONFLICT (telegram_id, upgrade_key) DO UPDATE SET level = prestige_upgrades.level + 1`,
      [tid, upgradeKey, 1]
    );
    return { success: true, newLevel: currentLevel + 1 };
  });

  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

module.exports = router;
