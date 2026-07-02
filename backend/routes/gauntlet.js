const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { GAUNTLET } = require('../gameConfig');

const router = express.Router();

// GET /gauntlet — leaderboard + my best
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const [lbRes, myRes, titlesRes] = await Promise.all([
    pool.query(
      `SELECT gr.telegram_id, u.username, gr.waves, gr.total_damage
       FROM gauntlet_runs gr JOIN users u ON u.telegram_id=gr.telegram_id
       WHERE gr.played_at=(SELECT MAX(g2.played_at) FROM gauntlet_runs g2 WHERE g2.telegram_id=gr.telegram_id)
       ORDER BY gr.waves DESC, gr.total_damage DESC LIMIT 20`
    ),
    pool.query(
      'SELECT waves, total_damage FROM gauntlet_runs WHERE telegram_id=$1 ORDER BY waves DESC LIMIT 1',
      [telegramId]
    ),
    pool.query('SELECT title FROM gauntlet_titles WHERE telegram_id=$1', [telegramId]),
  ]);
  res.json({
    config: { milestones: GAUNTLET.milestones, sessionDurationMs: GAUNTLET.sessionDurationMs },
    best: myRes.rows[0] ? { waves: myRes.rows[0].waves, totalDamage: Number(myRes.rows[0].total_damage) } : null,
    titles: titlesRes.rows.map(r => r.title),
    leaderboard: lbRes.rows.map((r, i) => ({
      rank: i + 1, username: r.username, waves: r.waves,
      totalDamage: Number(r.total_damage), isMe: r.telegram_id === telegramId,
    })),
  });
}));

// POST /gauntlet/submit
router.post('/submit', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { waves, totalDamage } = req.body;
  if (typeof waves !== 'number' || waves < 0) return res.status(400).json({ error: 'Invalid waves' });

  return withTransaction(async (client) => {
    await client.query(
      'INSERT INTO gauntlet_runs (telegram_id, waves, total_damage, played_at) VALUES ($1,$2,$3,$4)',
      [telegramId, waves, totalDamage || 0, Date.now()]
    );

    const earned = [];
    let gems = 0;
    for (const ms of GAUNTLET.milestones) {
      if (waves >= ms.wave) {
        if (ms.reward.title) {
          const existing = await client.query('SELECT 1 FROM gauntlet_titles WHERE telegram_id=$1 AND title=$2', [telegramId, ms.reward.title]);
          if (existing.rows.length === 0) {
            await client.query('INSERT INTO gauntlet_titles (telegram_id, title, earned_at) VALUES ($1,$2,$3)', [telegramId, ms.reward.title, Date.now()]);
            earned.push(ms.reward.title);
          }
        }
        gems = Math.max(gems, ms.reward.gems);
      }
    }
    if (gems > 0) {
      await client.query('UPDATE users SET gems=COALESCE(gems,0)+$1 WHERE telegram_id=$2', [gems, telegramId]);
    }
    return res.json({ ok: true, gems, newTitles: earned });
  });
}));

module.exports = router;
