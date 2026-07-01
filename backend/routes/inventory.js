const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { INVENTORY_ITEMS, TAPPER_UPGRADES } = require('../gameConfig');

const router = express.Router();

// GET /inventory
router.get('/', asyncHandler(async (req, res) => {
  const tid = req.tgUser.id.toString();
  const { rows } = await pool.query('SELECT item_key, quantity FROM user_inventory WHERE telegram_id=$1', [tid]);
  const ownedMap = {};
  for (const r of rows) ownedMap[r.item_key] = r.quantity;

  const items = INVENTORY_ITEMS.map(i => ({
    ...i,
    quantity: ownedMap[i.key] || 0,
  }));
  res.json({ items });
}));

// POST /inventory/use
router.post('/use', asyncHandler(async (req, res) => {
  const tid = req.tgUser.id.toString();
  const { itemKey } = req.body;
  const item = INVENTORY_ITEMS.find(i => i.key === itemKey);
  if (!item) return res.status(400).json({ error: 'Unknown item' });

  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT quantity FROM user_inventory WHERE telegram_id=$1 AND item_key=$2 FOR UPDATE',
      [tid, itemKey]
    );
    if (!rows[0] || rows[0].quantity < 1) return { error: 'You do not have this item' };

    await client.query(
      'UPDATE user_inventory SET quantity=quantity-1 WHERE telegram_id=$1 AND item_key=$2',
      [tid, itemKey]
    );
    await client.query(
      'DELETE FROM user_inventory WHERE telegram_id=$1 AND item_key=$2 AND quantity <= 0',
      [tid, itemKey]
    );

    const now = Date.now();
    const effect = {};

    if (itemKey === 'energy_potion') {
      const { rows: p } = await client.query('SELECT energy_max_level FROM tapper_profiles WHERE telegram_id=$1', [tid]);
      const max = TAPPER_UPGRADES.ENERGY_MAX.getEffect(p[0]?.energy_max_level || 0);
      await client.query('UPDATE tapper_profiles SET energy=$1, last_energy_at=$2 WHERE telegram_id=$3', [max, now, tid]);
      effect.type = 'energy_refill';
    } else if (itemKey === 'xp_scroll') {
      await client.query('UPDATE tapper_profiles SET bp_xp=bp_xp+500 WHERE telegram_id=$1', [tid]);
      effect.type = 'xp'; effect.amount = 500;
    } else if (itemKey === 'crit_shield') {
      await client.query(
        "INSERT INTO user_boosts (telegram_id,boost_type,expires_at,activated_at) VALUES($1,'crit_shield',$2,$3)",
        [tid, now + 60 * 1000, now]
      );
      effect.type = 'crit_shield'; effect.expiresAt = now + 60 * 1000;
    } else if (itemKey === 'gem_bomb') {
      await client.query('UPDATE users SET gems=gems+5 WHERE telegram_id=$1', [tid]);
      effect.type = 'gems'; effect.amount = 5;
    }

    return { success: true, effect };
  });

  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

// Add item to inventory (called internally)
async function grantInventoryItem(client, telegramId, itemKey, quantity = 1) {
  await client.query(
    `INSERT INTO user_inventory (telegram_id, item_key, quantity) VALUES ($1, $2, $3)
     ON CONFLICT (telegram_id, item_key) DO UPDATE SET quantity = user_inventory.quantity + EXCLUDED.quantity`,
    [telegramId, itemKey, quantity]
  );
}

module.exports = { router, grantInventoryItem };
