const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { getDailyShopItems, pickLootBoxPrize, TAPPER_UPGRADES } = require('../gameConfig');
const { grantInventoryItem } = require('./inventory');

const router = express.Router();

async function applyLootPrize(client, telegramId, prize, now) {
  if (prize.type === 'gems') {
    await client.query('UPDATE users SET gems=gems+$1 WHERE telegram_id=$2', [prize.amount, telegramId]);
  } else if (prize.type === 'boost') {
    await client.query('INSERT INTO user_boosts (telegram_id,boost_type,expires_at,activated_at) VALUES($1,$2,$3,$4)',
      [telegramId, '2x_tap', now + prize.durationMs, now]);
  } else if (prize.type === 'skill_points') {
    await client.query('UPDATE tapper_profiles SET skill_points=skill_points+$1 WHERE telegram_id=$2', [prize.amount, telegramId]);
  } else if (prize.type === 'skin') {
    await client.query(
      `UPDATE tapper_profiles SET skins_unlocked=array_append(skins_unlocked,$1)
       WHERE telegram_id=$2 AND NOT ($1=ANY(skins_unlocked))`,
      [prize.skin, telegramId]
    );
  } else if (prize.type === 'pet') {
    await client.query(
      `INSERT INTO user_pets (telegram_id, pet_key, acquired_at)
       VALUES ($1, $2, $3) ON CONFLICT (telegram_id, pet_key) DO NOTHING`,
      [telegramId, prize.pet, now]
    );
  } else if (prize.type === 'item') {
    await grantInventoryItem(client, telegramId, prize.item);
  }
}

router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const items = getDailyShopItems();
  const today = new Date().toISOString().slice(0, 10);
  const [purchases, userRes] = await Promise.all([
    pool.query('SELECT item_key FROM daily_shop_purchases WHERE telegram_id=$1 AND date_key=$2', [telegramId, today]),
    pool.query('SELECT gems FROM users WHERE telegram_id=$1', [telegramId]),
  ]);
  const bought = new Set(purchases.rows.map((p) => p.item_key));
  const gems = userRes.rows[0]?.gems || 0;
  const refreshesAt = new Date(new Date().setUTCHours(24, 0, 0, 0)).getTime();
  res.json({
    items: items.map((item) => ({ ...item, purchased: bought.has(item.key), canAfford: gems >= item.cost })),
    gems,
    refreshesAt,
  });
}));

router.post('/buy', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { itemKey } = req.body;
  const items = getDailyShopItems();
  const item = items.find((i) => i.key === itemKey);
  if (!item) return res.status(400).json({ error: "Item not in today's shop" });
  const today = new Date().toISOString().slice(0, 10);

  const result = await withTransaction(async (client) => {
    const { rows: ex } = await client.query(
      'SELECT id FROM daily_shop_purchases WHERE telegram_id=$1 AND item_key=$2 AND date_key=$3',
      [telegramId, itemKey, today]
    );
    if (ex[0]) return { error: 'Already purchased today' };
    const { rows: u } = await client.query('SELECT gems FROM users WHERE telegram_id=$1 FOR UPDATE', [telegramId]);
    if (!u[0] || u[0].gems < item.cost) return { error: `Need ${item.cost} gems` };

    await client.query('UPDATE users SET gems=gems-$1 WHERE telegram_id=$2', [item.cost, telegramId]);
    await client.query('INSERT INTO daily_shop_purchases (telegram_id,item_key,date_key,bought_at) VALUES($1,$2,$3,$4)',
      [telegramId, itemKey, today, Date.now()]);

    const now = Date.now();
    let lootResult = null;

    if (item.type === 'boost') {
      await client.query('INSERT INTO user_boosts (telegram_id,boost_type,expires_at,activated_at) VALUES($1,$2,$3,$4)',
        [telegramId, '2x_tap', now + item.durationMs, now]);
    } else if (item.type === 'energy_x2') {
      const { rows: tp } = await client.query('SELECT energy_max_level FROM tapper_profiles WHERE telegram_id=$1', [telegramId]);
      const max = TAPPER_UPGRADES.ENERGY_MAX.getEffect(tp[0]?.energy_max_level || 0);
      await client.query('UPDATE tapper_profiles SET energy=$1, last_energy_at=$2 WHERE telegram_id=$3', [max, now, telegramId]);
    } else if (item.type === 'loot_box') {
      lootResult = pickLootBoxPrize();
      await applyLootPrize(client, telegramId, lootResult, now);
    } else if (item.type === 'skill_points') {
      await client.query('UPDATE tapper_profiles SET skill_points=skill_points+$1 WHERE telegram_id=$2', [item.amount, telegramId]);
    } else if (item.type === 'auto_tapper') {
      await client.query('INSERT INTO user_boosts (telegram_id,boost_type,expires_at,activated_at) VALUES($1,$2,$3,$4)',
        [telegramId, 'auto_tapper', now + item.durationMs, now]);
    }
    return { success: true, lootResult };
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

module.exports = { router, applyLootPrize };
