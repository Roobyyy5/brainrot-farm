const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { GUILD_SKILLS, GUILD_XP_PER_TAP, GUILD_LEVEL_XP, GUILD_MAX_LEVEL, getGuildBonuses } = require('../gameConfig');

const router = express.Router();

async function getMyGuildId(client, telegramId) {
  const { rows } = await client.query(
    'SELECT guild_id FROM guild_members WHERE telegram_id=$1',
    [telegramId]
  );
  return rows[0]?.guild_id || null;
}

async function getGuildSkillMap(client, guildId) {
  const { rows } = await client.query(
    'SELECT skill_key, level FROM guild_skill_tree WHERE guild_id=$1',
    [guildId]
  );
  const map = {};
  for (const r of rows) map[r.skill_key] = r.level;
  return map;
}

// GET /guildskilltree
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const client = await pool.connect();
  try {
    const guildId = await getMyGuildId(client, telegramId);
    if (!guildId) return res.json({ inGuild: false });

    const { rows: [guild] } = await client.query(
      'SELECT id, name, skill_xp, skill_level FROM guilds WHERE id=$1',
      [guildId]
    );
    const skillMap = await getGuildSkillMap(client, guildId);
    const bonuses = getGuildBonuses(skillMap);

    const xpForNextLevel = Number(guild.skill_level) * GUILD_LEVEL_XP;
    const skills = Object.entries(GUILD_SKILLS).map(([key, def]) => ({
      key,
      name: def.name,
      icon: def.icon,
      desc: def.desc,
      maxLevel: def.maxLevel,
      costPerLevel: def.costPerLevel,
      branch: def.branch,
      currentLevel: skillMap[key] || 0,
    }));

    res.json({
      inGuild: true,
      guild: {
        id: guild.id,
        name: guild.name,
        skillXp: Number(guild.skill_xp),
        skillLevel: Number(guild.skill_level),
        xpForNextLevel,
      },
      skills,
      bonuses,
    });
  } finally {
    client.release();
  }
}));

// POST /guildskilltree/contribute — contribute taps to earn guild XP
router.post('/contribute', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const count = Math.min(Math.max(1, parseInt(req.body.count) || 50), 200);

  const result = await withTransaction(async (client) => {
    const guildId = await getMyGuildId(client, telegramId);
    if (!guildId) throw Object.assign(new Error('Not in a guild'), { status: 400 });

    const xpGained = count * GUILD_XP_PER_TAP;
    const { rows: [guild] } = await client.query(
      `UPDATE guilds SET skill_xp = skill_xp + $1 WHERE id=$2 RETURNING skill_xp, skill_level`,
      [xpGained, guildId]
    );

    let newLevel = Number(guild.skill_level);
    let newXp = Number(guild.skill_xp);
    const xpNeeded = newLevel * GUILD_LEVEL_XP;
    if (newXp >= xpNeeded && newLevel < GUILD_MAX_LEVEL) {
      newLevel++;
      await client.query('UPDATE guilds SET skill_level=$1 WHERE id=$2', [newLevel, guildId]);
    }

    return { xpGained, skillXp: newXp, skillLevel: newLevel };
  });

  res.json(result);
}));

// POST /guildskilltree/upgrade — spend guild XP to upgrade a skill
router.post('/upgrade', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { skillKey } = req.body;
  const def = GUILD_SKILLS[skillKey];
  if (!def) return res.status(400).json({ error: 'Unknown skill' });

  const result = await withTransaction(async (client) => {
    const guildId = await getMyGuildId(client, telegramId);
    if (!guildId) throw Object.assign(new Error('Not in a guild'), { status: 400 });

    const member = await client.query(
      "SELECT role FROM guild_members WHERE telegram_id=$1 AND guild_id=$2",
      [telegramId, guildId]
    );
    if (!member.rows[0] || !['owner', 'officer'].includes(member.rows[0].role)) {
      throw Object.assign(new Error('Only officers/owner can upgrade skills'), { status: 403 });
    }

    const { rows: [guild] } = await client.query(
      'SELECT skill_xp, skill_level FROM guilds WHERE id=$1',
      [guildId]
    );
    const skillMap = await getGuildSkillMap(client, guildId);
    const currentLevel = skillMap[skillKey] || 0;

    if (currentLevel >= def.maxLevel) throw Object.assign(new Error('Skill already maxed'), { status: 400 });

    const cost = def.costPerLevel * (currentLevel + 1);
    if (Number(guild.skill_xp) < cost) throw Object.assign(new Error(`Need ${cost} guild XP`), { status: 400 });

    await client.query('UPDATE guilds SET skill_xp = skill_xp - $1 WHERE id=$2', [cost, guildId]);
    await client.query(
      `INSERT INTO guild_skill_tree (guild_id, skill_key, level) VALUES ($1, $2, 1)
       ON CONFLICT (guild_id, skill_key) DO UPDATE SET level = guild_skill_tree.level + 1`,
      [guildId, skillKey]
    );

    const newSkillMap = await getGuildSkillMap(client, guildId);
    return { skillKey, newLevel: newSkillMap[skillKey], bonuses: getGuildBonuses(newSkillMap) };
  });

  res.json(result);
}));

module.exports = router;
