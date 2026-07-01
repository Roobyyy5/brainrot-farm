const express = require('express');
const router = express.Router();
const db = require('../db');
const { withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { CRAFTING_RECIPES, INVENTORY_ITEMS } = require('../gameConfig');

function itemMeta(key) {
  const item = INVENTORY_ITEMS.find(i => i.key === key);
  return item ? { name: item.name, icon: item.icon } : { name: key, icon: '?' };
}

// GET /crafting
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const inv = await db.query('SELECT item_key, quantity FROM user_inventory WHERE telegram_id = $1', [telegramId]);
  const qty = {};
  inv.rows.forEach(r => { qty[r.item_key] = Number(r.quantity); });

  const recipes = CRAFTING_RECIPES.map(recipe => ({
    key:        recipe.key,
    name:       recipe.name,
    canCraft:   recipe.inputs.every(inp => (qty[inp.key] || 0) >= inp.qty),
    inputs:     recipe.inputs.map(inp => ({ ...inp, have: qty[inp.key] || 0, ...itemMeta(inp.key) })),
    output:     { ...recipe.output, ...itemMeta(recipe.output.key) },
  }));

  res.json({ recipes });
}));

// POST /crafting/craft
router.post('/craft', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const { recipeKey } = req.body;
  const recipe = CRAFTING_RECIPES.find(r => r.key === recipeKey);
  if (!recipe) return res.status(400).json({ error: 'Unknown recipe' });

  // Pre-check
  const inv = await db.query('SELECT item_key, quantity FROM user_inventory WHERE telegram_id = $1', [telegramId]);
  const qty = {};
  inv.rows.forEach(r => { qty[r.item_key] = Number(r.quantity); });
  for (const inp of recipe.inputs) {
    if ((qty[inp.key] || 0) < inp.qty) return res.status(400).json({ error: `Not enough ${inp.key}` });
  }

  await withTransaction(async (client) => {
    for (const inp of recipe.inputs) {
      const r = await client.query('SELECT quantity FROM user_inventory WHERE telegram_id=$1 AND item_key=$2 FOR UPDATE', [telegramId, inp.key]);
      if (!r.rows[0] || Number(r.rows[0].quantity) < inp.qty) {
        throw Object.assign(new Error(`Not enough ${inp.key}`), { status: 400 });
      }
      const newQty = Number(r.rows[0].quantity) - inp.qty;
      if (newQty <= 0) {
        await client.query('DELETE FROM user_inventory WHERE telegram_id=$1 AND item_key=$2', [telegramId, inp.key]);
      } else {
        await client.query('UPDATE user_inventory SET quantity=$1 WHERE telegram_id=$2 AND item_key=$3', [newQty, telegramId, inp.key]);
      }
    }
    await client.query(`
      INSERT INTO user_inventory (telegram_id, item_key, quantity) VALUES ($1, $2, $3)
      ON CONFLICT (telegram_id, item_key) DO UPDATE SET quantity = user_inventory.quantity + EXCLUDED.quantity
    `, [telegramId, recipe.output.key, recipe.output.qty]);
  });

  res.json({ ok: true, crafted: { ...recipe.output, ...itemMeta(recipe.output.key) } });
}));

module.exports = router;
