const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const {
  DAILY_QUEST_POOL, WEEKLY_QUESTS, DAILY_QUEST_CHEST,
  questDayKey, questWeekKey,
} = require('../gameConfig');
const { grantRandomArtifact } = require('./artifacts');

const router = express.Router();

function pickDailyQuests(dayKey) {
  // Deterministic shuffle based on day — same quests for all players per day
  const seed = dayKey.split('-').reduce((a, b) => a + Number(b), 0);
  const pool = [...DAILY_QUEST_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = (seed * (i + 1) * 1337) % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 5);
}

// GET /questboard
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const dayKey  = questDayKey();
  const weekKey = questWeekKey();
  const client  = await pool.connect();
  try {
    const dailyDefs = pickDailyQuests(dayKey);

    const { rows: progRows } = await client.query(
      `SELECT quest_key, period_key, progress, completed, claimed
       FROM quest_progress WHERE telegram_id=$1 AND period_key IN ($2,$3)`,
      [telegramId, dayKey, weekKey]
    );
    const progMap = {};
    for (const r of progRows) progMap[`${r.quest_key}:${r.period_key}`] = r;

    const daily = dailyDefs.map(d => {
      const p = progMap[`${d.key}:${dayKey}`] || { progress: 0, completed: false, claimed: false };
      return { ...d, progress: p.progress, completed: p.completed, claimed: p.claimed, periodKey: dayKey };
    });

    const weekly = WEEKLY_QUESTS.map(d => {
      const p = progMap[`${d.key}:${weekKey}`] || { progress: 0, completed: false, claimed: false };
      return { ...d, progress: p.progress, completed: p.completed, claimed: p.claimed, periodKey: weekKey };
    });

    const { rows: [chest] } = await client.query(
      'SELECT opened FROM quest_chests WHERE telegram_id=$1 AND period_key=$2',
      [telegramId, dayKey]
    );

    const completedToday = daily.filter(d => d.completed).length;

    res.json({
      daily,
      weekly,
      dayKey,
      weekKey,
      chestReady: completedToday >= 5 && !chest?.opened,
      chestOpened: chest?.opened || false,
      completedToday,
    });
  } finally {
    client.release();
  }
}));

// POST /questboard/claim — claim a completed quest reward
router.post('/claim', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { questKey, periodKey } = req.body;

  const allQuests = [...DAILY_QUEST_POOL, ...WEEKLY_QUESTS];
  const def = allQuests.find(q => q.key === questKey);
  if (!def) return res.status(400).json({ error: 'Unknown quest' });

  const result = await withTransaction(async (client) => {
    const { rows: [prog] } = await client.query(
      'SELECT completed, claimed FROM quest_progress WHERE telegram_id=$1 AND quest_key=$2 AND period_key=$3',
      [telegramId, questKey, periodKey]
    );
    if (!prog?.completed) throw Object.assign(new Error('Quest not completed'), { status: 400 });
    if (prog.claimed)     throw Object.assign(new Error('Already claimed'), { status: 400 });

    await client.query(
      'UPDATE quest_progress SET claimed=TRUE WHERE telegram_id=$1 AND quest_key=$2 AND period_key=$3',
      [telegramId, questKey, periodKey]
    );
    const gems = def.reward?.gems || 0;
    if (gems > 0) await client.query('UPDATE users SET gems=COALESCE(gems,0)+$1 WHERE telegram_id=$2', [gems, telegramId]);
    if (def.reward?.artifactKey) await grantRandomArtifact(client, telegramId, def.reward.artifactKey);

    return { gemsEarned: gems };
  });

  res.json(result);
}));

// POST /questboard/chest — open daily quest chest (need 5 dailies done)
router.post('/chest', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const dayKey = questDayKey();

  const result = await withTransaction(async (client) => {
    const dailyDefs = pickDailyQuests(dayKey);
    const { rows: progRows } = await client.query(
      'SELECT quest_key, completed FROM quest_progress WHERE telegram_id=$1 AND period_key=$2',
      [telegramId, dayKey]
    );
    const completedKeys = new Set(progRows.filter(r => r.completed).map(r => r.quest_key));
    const completedCount = dailyDefs.filter(d => completedKeys.has(d.key)).length;

    if (completedCount < 5) throw Object.assign(new Error(`Need 5 daily quests done (${completedCount}/5)`), { status: 400 });

    const { rows: [existing] } = await client.query(
      'SELECT opened FROM quest_chests WHERE telegram_id=$1 AND period_key=$2',
      [telegramId, dayKey]
    );
    if (existing?.opened) throw Object.assign(new Error('Chest already opened'), { status: 400 });

    await client.query(
      `INSERT INTO quest_chests (telegram_id, period_key, opened, opened_at) VALUES ($1,$2,TRUE,$3)
       ON CONFLICT (telegram_id, period_key) DO UPDATE SET opened=TRUE, opened_at=$3`,
      [telegramId, dayKey, Date.now()]
    );

    const gems = DAILY_QUEST_CHEST.gems;
    await client.query('UPDATE users SET gems=COALESCE(gems,0)+$1 WHERE telegram_id=$2', [gems, telegramId]);

    let artifactGranted = null;
    if (Math.random() < DAILY_QUEST_CHEST.artifactChance) {
      const { ARTIFACT_DEFINITIONS } = require('../gameConfig');
      const keys = Object.keys(ARTIFACT_DEFINITIONS);
      const key = keys[Math.floor(Math.random() * keys.length)];
      await grantRandomArtifact(client, telegramId, key);
      artifactGranted = key;
    }

    return { gems, artifactGranted };
  });

  res.json(result);
}));

// Internal: increment quest progress for a player
async function incrementQuest(telegramId, type, amount = 1) {
  try {
    const dayKey  = questDayKey();
    const weekKey = questWeekKey();
    const dailyDefs  = pickDailyQuests(dayKey);
    const relevant   = [
      ...dailyDefs.filter(q => q.type === type).map(q => ({ ...q, periodKey: dayKey })),
      ...WEEKLY_QUESTS.filter(q => q.type === type).map(q => ({ ...q, periodKey: weekKey })),
    ];
    for (const q of relevant) {
      await pool.query(
        `INSERT INTO quest_progress (telegram_id, quest_key, period_key, progress, completed, claimed)
         VALUES ($1,$2,$3,$4, $4 >= $5, FALSE)
         ON CONFLICT (telegram_id, quest_key, period_key)
         DO UPDATE SET
           progress  = LEAST(quest_progress.progress + $4, $5),
           completed = (LEAST(quest_progress.progress + $4, $5) >= $5)
         WHERE NOT quest_progress.completed`,
        [telegramId, q.key, q.periodKey, amount, q.target]
      );
    }
  } catch { /* fire-and-forget */ }
}

module.exports = { router, incrementQuest };
