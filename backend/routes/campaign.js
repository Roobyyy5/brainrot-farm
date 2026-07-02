const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { CAMPAIGN_CHAPTERS, CAMPAIGN_MECHANICS } = require('../gameConfig');

const router = express.Router();

async function getProgress(client, telegramId) {
  const { rows } = await client.query('SELECT * FROM campaign_progress WHERE telegram_id=$1', [telegramId]);
  if (rows[0]) return rows[0];
  const { rows: [r] } = await client.query(
    `INSERT INTO campaign_progress (telegram_id, chapter, boss_hp, boss_max_hp, active, completed_chapters)
     VALUES ($1, 1, 0, 0, FALSE, '[]') RETURNING *`,
    [telegramId]
  );
  return r;
}

// GET /campaign
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const client = await pool.connect();
  try {
    const prog = await getProgress(client, telegramId);
    const completed = prog.completed_chapters || [];
    const currentChapter = CAMPAIGN_CHAPTERS.find(c => c.id === prog.chapter) || CAMPAIGN_CHAPTERS[0];
    const mechanic = CAMPAIGN_MECHANICS[currentChapter.mechanic] || {};

    res.json({
      chapter: prog.chapter,
      maxChapter: CAMPAIGN_CHAPTERS.length,
      bossHp: Number(prog.boss_hp),
      bossMaxHp: Number(prog.boss_max_hp),
      active: prog.active,
      completedChapters: completed,
      currentChapter: { ...currentChapter, mechanicDesc: mechanic.desc },
      allChapters: CAMPAIGN_CHAPTERS.map(c => ({
        ...c,
        mechanicDesc: CAMPAIGN_MECHANICS[c.mechanic]?.desc,
        completed: completed.includes(c.id),
        unlocked: c.id <= prog.chapter,
      })),
    });
  } finally { client.release(); }
}));

// POST /campaign/start
router.post('/start', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  return withTransaction(async (client) => {
    const prog = await getProgress(client, telegramId);
    if (prog.active) return res.status(400).json({ error: 'Already in a chapter' });
    const chapter = CAMPAIGN_CHAPTERS.find(c => c.id === prog.chapter);
    if (!chapter) return res.status(400).json({ error: 'Campaign complete' });

    await client.query(
      `UPDATE campaign_progress SET active=TRUE, boss_hp=$1, boss_max_hp=$1, started_at=$2 WHERE telegram_id=$3`,
      [chapter.bossHp, Date.now(), telegramId]
    );
    res.json({ ok: true, chapter: chapter.id, bossMaxHp: chapter.bossHp });
  });
}));

// POST /campaign/tap
router.post('/tap', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { count } = req.body;
  const taps = Math.min(Math.max(1, Number(count) || 1), 500);

  return withTransaction(async (client) => {
    const prog = await getProgress(client, telegramId);
    if (!prog.active) return res.status(400).json({ error: 'Not in a chapter' });
    const chapter = CAMPAIGN_CHAPTERS.find(c => c.id === prog.chapter);

    const { rows: [profile] } = await client.query('SELECT * FROM tapper_profiles WHERE telegram_id=$1', [telegramId]);
    const tapPower = (profile?.tap_power_level || 0) * 2 + 5;
    const damage = taps * tapPower;

    const newHp = Math.max(0, Number(prog.boss_hp) - damage);
    const defeated = newHp <= 0;

    if (defeated) {
      const completed = [...(prog.completed_chapters || [])];
      if (!completed.includes(chapter.id)) completed.push(chapter.id);
      const nextChapter = prog.chapter < CAMPAIGN_CHAPTERS.length ? prog.chapter + 1 : prog.chapter;

      await client.query(
        `UPDATE campaign_progress SET boss_hp=0, active=FALSE, chapter=$1, completed_chapters=$2 WHERE telegram_id=$3`,
        [nextChapter, JSON.stringify(completed), telegramId]
      );

      // Grant rewards
      if (chapter.reward.gems) {
        await client.query('UPDATE users SET gems=COALESCE(gems,0)+$1 WHERE telegram_id=$2', [chapter.reward.gems, telegramId]);
      }

      return res.json({ defeated: true, chapterId: chapter.id, reward: chapter.reward, nextChapter });
    }

    // Regen boss mechanic
    let regenHp = newHp;
    if (chapter.mechanic === 'regen_boss') {
      const elapsed = Date.now() - Number(prog.started_at || Date.now());
      const regenTicks = Math.floor(elapsed / 10000);
      const regenAmt = Math.floor(Number(prog.boss_max_hp) * 0.05 * regenTicks);
      regenHp = Math.min(Number(prog.boss_max_hp), newHp + regenAmt);
    }

    await client.query('UPDATE campaign_progress SET boss_hp=$1 WHERE telegram_id=$2', [regenHp, telegramId]);
    return res.json({ defeated: false, newHp: regenHp, damage });
  });
}));

// POST /campaign/abandon
router.post('/abandon', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  await pool.query('UPDATE campaign_progress SET active=FALSE, boss_hp=0 WHERE telegram_id=$1', [telegramId]);
  res.json({ ok: true });
}));

module.exports = router;
