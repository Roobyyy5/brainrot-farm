const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { ALCHEMY_RECIPES, ALCHEMY_INGREDIENTS } = require('../gameConfig');

const router = express.Router();

async function getIngredients(client, telegramId) {
  const { rows } = await client.query('SELECT * FROM alchemy_ingredients WHERE telegram_id=$1', [telegramId]);
  if (rows[0]) return rows[0];
  await client.query(
    'INSERT INTO alchemy_ingredients (telegram_id) VALUES ($1) ON CONFLICT DO NOTHING',
    [telegramId]
  );
  return { tap_shard: 0, energy_crystal: 0, combo_dust: 0, prestige_essence: 0 };
}

// GET /alchemy
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const client = await pool.connect();
  try {
    const ingredients = await getIngredients(client, telegramId);
    const { rows: active } = await client.query(
      `SELECT recipe_key, expires_at FROM alchemy_brews
       WHERE telegram_id=$1 AND used=FALSE AND (expires_at IS NULL OR expires_at > $2)`,
      [telegramId, Date.now()]
    );
    res.json({
      ingredients: {
        tap_shard:       Number(ingredients.tap_shard || 0),
        energy_crystal:  Number(ingredients.energy_crystal || 0),
        combo_dust:      Number(ingredients.combo_dust || 0),
        prestige_essence:Number(ingredients.prestige_essence || 0),
      },
      recipes: ALCHEMY_RECIPES,
      activeBrews: active.map(b => ({ recipeKey: b.recipe_key, expiresAt: Number(b.expires_at) })),
    });
  } finally { client.release(); }
}));

// POST /alchemy/brew
router.post('/brew', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { recipeKey } = req.body;
  const recipe = ALCHEMY_RECIPES.find(r => r.key === recipeKey);
  if (!recipe) return res.status(400).json({ error: 'Unknown recipe' });

  return withTransaction(async (client) => {
    const ing = await getIngredients(client, telegramId);
    for (const [mat, needed] of Object.entries(recipe.cost)) {
      if (Number(ing[mat] || 0) < needed) return res.status(400).json({ error: `Not enough ${mat}` });
    }

    const updates = Object.entries(recipe.cost).map(([mat, amt]) => `${mat} = ${mat} - ${amt}`).join(', ');
    await client.query(`UPDATE alchemy_ingredients SET ${updates} WHERE telegram_id=$1`, [telegramId]);

    const expiresAt = recipe.effect.durationMs ? Date.now() + recipe.effect.durationMs : null;
    await client.query(
      'INSERT INTO alchemy_brews (telegram_id, recipe_key, brewed_at, expires_at) VALUES ($1,$2,$3,$4)',
      [telegramId, recipeKey, Date.now(), expiresAt]
    );

    return res.json({ ok: true, recipe: recipe.name, expiresAt });
  });
}));

// POST /alchemy/collect — earn ingredients from tap activity
async function addIngredients(telegramId, type, amount) {
  try {
    await pool.query(
      `INSERT INTO alchemy_ingredients (telegram_id, ${type}) VALUES ($1, $2)
       ON CONFLICT (telegram_id) DO UPDATE SET ${type} = alchemy_ingredients.${type} + $2`,
      [telegramId, amount]
    );
  } catch (_) {}
}

router.post('/collect', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { taps, combos, prestige } = req.body;
  const earned = {};
  if (taps > 0) {
    const shards = Math.floor(taps / ALCHEMY_INGREDIENTS.tap_shard.earnedPer);
    if (shards > 0) { await addIngredients(telegramId, 'tap_shard', shards); earned.tap_shard = shards; }
  }
  if (combos > 0) {
    const dust = Math.floor(combos / ALCHEMY_INGREDIENTS.combo_dust.earnedPer);
    if (dust > 0) { await addIngredients(telegramId, 'combo_dust', dust); earned.combo_dust = dust; }
  }
  if (prestige > 0) {
    await addIngredients(telegramId, 'prestige_essence', prestige);
    earned.prestige_essence = prestige;
  }
  res.json({ earned });
}));

module.exports = { router, addIngredients };
