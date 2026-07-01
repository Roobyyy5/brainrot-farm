const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { SKILL_TREE } = require('../gameConfig');

const router = express.Router();

function allSkillsMap() {
  const map = {};
  for (const [tree, td] of Object.entries(SKILL_TREE)) {
    for (const skill of td.skills) map[skill.key] = { ...skill, tree };
  }
  return map;
}

router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const [skillRes, profRes] = await Promise.all([
    pool.query('SELECT skill_key, level FROM user_skills WHERE telegram_id = $1', [telegramId]),
    pool.query('SELECT skill_points FROM tapper_profiles WHERE telegram_id = $1', [telegramId]),
  ]);
  const skillMap = {};
  for (const s of skillRes.rows) skillMap[s.skill_key] = s.level;
  const skillPoints = profRes.rows[0]?.skill_points || 0;

  const trees = Object.entries(SKILL_TREE).map(([key, td]) => ({
    key,
    label: td.label,
    icon: td.icon,
    skills: td.skills.map((skill) => {
      const level = skillMap[skill.key] || 0;
      const isMaxed = level >= skill.maxLevel;
      return {
        ...skill,
        level,
        isMaxed,
        nextCost: isMaxed ? null : skill.costs[level],
        canAfford: !isMaxed && skillPoints >= skill.costs[level],
      };
    }),
  }));
  res.json({ skillPoints, trees });
}));

router.post('/upgrade', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { skillKey } = req.body;
  const skill = allSkillsMap()[skillKey];
  if (!skill) return res.status(400).json({ error: 'Unknown skill' });

  const result = await withTransaction(async (client) => {
    const { rows: prof } = await client.query(
      'SELECT skill_points FROM tapper_profiles WHERE telegram_id = $1', [telegramId]
    );
    if (!prof[0]) return { error: 'Profile not found' };

    const { rows: ex } = await client.query(
      'SELECT level FROM user_skills WHERE telegram_id = $1 AND skill_key = $2',
      [telegramId, skillKey]
    );
    const currentLevel = ex[0]?.level || 0;
    if (currentLevel >= skill.maxLevel) return { error: 'Skill maxed' };

    const cost = skill.costs[currentLevel];
    if (prof[0].skill_points < cost) return { error: `Need ${cost} skill points` };

    await client.query(
      'UPDATE tapper_profiles SET skill_points = skill_points - $1 WHERE telegram_id = $2',
      [cost, telegramId]
    );
    if (ex[0]) {
      await client.query(
        'UPDATE user_skills SET level = level + 1 WHERE telegram_id = $1 AND skill_key = $2',
        [telegramId, skillKey]
      );
    } else {
      await client.query(
        'INSERT INTO user_skills (telegram_id, skill_key, level) VALUES ($1, $2, 1)',
        [telegramId, skillKey]
      );
    }
    return { success: true, newLevel: currentLevel + 1, skillPoints: prof[0].skill_points - cost };
  });

  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

module.exports = router;
