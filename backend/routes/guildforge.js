const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { GUILD_FORGE_RECIPES, GUILD_FORGE_LEVEL_XP } = require('../gameConfig');

const router = express.Router();

// GET /guildforge
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { rows: [memberRow] } = await pool.query(
    'SELECT guild_id, role FROM guild_members WHERE telegram_id=$1', [telegramId]
  );
  if (!memberRow?.guild_id) return res.status(400).json({ error: 'Not in a guild' });

  const guildId = memberRow.guild_id;
  const [guildRes, boostsRes] = await Promise.all([
    pool.query('SELECT name, coins, forge_level, forge_xp FROM guilds WHERE id=$1', [guildId]),
    pool.query(
      'SELECT recipe_key, activated_at, expires_at FROM guild_forge_boosts WHERE guild_id=$1 AND expires_at>$2',
      [guildId, Date.now()]
    ),
  ]);

  const guild = guildRes.rows[0];
  const forgeLevel = guild.forge_level || 0;
  const forgeXp = guild.forge_xp || 0;
  const nextLevelXp = GUILD_FORGE_LEVEL_XP[forgeLevel + 1] || null;

  res.json({
    guildName: guild.name,
    guildCoins: Number(guild.coins),
    forgeLevel,
    forgeXp,
    nextLevelXp,
    role: memberRow.role,
    activeBoosts: boostsRes.rows.map(b => ({
      recipeKey: b.recipe_key,
      activatedAt: Number(b.activated_at),
      expiresAt: Number(b.expires_at),
    })),
    recipes: GUILD_FORGE_RECIPES.filter(r => r.tier <= forgeLevel + 1),
    allRecipes: GUILD_FORGE_RECIPES,
  });
}));

// POST /guildforge/forge — officers/owner only
router.post('/forge', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { recipeKey } = req.body;
  const recipe = GUILD_FORGE_RECIPES.find(r => r.key === recipeKey);
  if (!recipe) return res.status(400).json({ error: 'Unknown recipe' });

  return withTransaction(async (client) => {
    const { rows: [memberRow] } = await client.query(
      'SELECT guild_id, role FROM guild_members WHERE telegram_id=$1', [telegramId]
    );
    if (!memberRow) return res.status(400).json({ error: 'Not in a guild' });
    if (!['owner', 'officer'].includes(memberRow.role)) return res.status(403).json({ error: 'Officers only' });

    const guildId = memberRow.guild_id;
    const { rows: [guild] } = await client.query('SELECT coins, forge_level, forge_xp FROM guilds WHERE id=$1 FOR UPDATE', [guildId]);

    if (recipe.tier > (guild.forge_level || 0) + 1) return res.status(400).json({ error: 'Forge level too low' });
    if (Number(guild.coins) < recipe.cost.coins) return res.status(400).json({ error: 'Not enough guild coins' });

    // Deduct cost
    const newXp = (guild.forge_xp || 0) + (recipe.cost.guild_xp || 0);
    const maxLevel = GUILD_FORGE_LEVEL_XP.length - 1;
    let newLevel = guild.forge_level || 0;
    if (newLevel < maxLevel && newXp >= GUILD_FORGE_LEVEL_XP[newLevel + 1]) newLevel++;

    await client.query(
      'UPDATE guilds SET coins=coins-$1, forge_xp=$2, forge_level=$3 WHERE id=$4',
      [recipe.cost.coins, newXp, newLevel, guildId]
    );

    // Activate boost
    const now = Date.now();
    await client.query(
      `INSERT INTO guild_forge_boosts (guild_id, recipe_key, activated_at, expires_at)
       VALUES ($1,$2,$3,$4)`,
      [guildId, recipeKey, now, now + recipe.effect.durationMs]
    );

    return res.json({ ok: true, recipe: recipe.name, expiresAt: now + recipe.effect.durationMs, newForgeLevel: newLevel });
  });
}));

// POST /guildforge/contribute — any member donates coins
router.post('/contribute', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { amount } = req.body;
  const coins = Math.max(1, Math.min(Number(amount) || 0, 10000000));

  return withTransaction(async (client) => {
    const { rows: [memberRow] } = await client.query('SELECT guild_id FROM guild_members WHERE telegram_id=$1', [telegramId]);
    if (!memberRow?.guild_id) return res.status(400).json({ error: 'Not in a guild' });

    const { rows: [user] } = await client.query('SELECT coins FROM users WHERE telegram_id=$1 FOR UPDATE', [telegramId]);
    if (Number(user.coins) < coins) return res.status(400).json({ error: 'Not enough coins' });

    await client.query('UPDATE users SET coins=coins-$1 WHERE telegram_id=$2', [coins, telegramId]);
    await client.query('UPDATE guilds SET coins=COALESCE(coins,0)+$1 WHERE id=$2', [coins, memberRow.guild_id]);
    return res.json({ ok: true, contributed: coins });
  });
}));

module.exports = router;
