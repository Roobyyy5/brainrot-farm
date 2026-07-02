const express = require('express');
const { pool } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { RHYTHM_TAP } = require('../gameConfig');

const router = express.Router();

// GET /rhythmtap — leaderboard + my best
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;

  const [lbRes, myRes] = await Promise.all([
    pool.query(
      `SELECT rt.telegram_id, u.username, rt.score, rt.accuracy, rt.perfect
       FROM rhythm_tap_scores rt
       JOIN users u ON u.telegram_id = rt.telegram_id
       WHERE rt.played_at = (SELECT MAX(r2.played_at) FROM rhythm_tap_scores r2 WHERE r2.telegram_id = rt.telegram_id)
       ORDER BY rt.score DESC LIMIT 20`
    ),
    pool.query(
      `SELECT score, accuracy, perfect, good, miss FROM rhythm_tap_scores
       WHERE telegram_id=$1 ORDER BY score DESC LIMIT 1`,
      [telegramId]
    ),
  ]);

  res.json({
    config: RHYTHM_TAP,
    best: myRes.rows[0] || null,
    leaderboard: lbRes.rows.map((r, i) => ({
      rank: i + 1,
      username: r.username,
      score: r.score,
      accuracy: parseFloat(r.accuracy),
      perfect: r.perfect,
      isMe: r.telegram_id === telegramId,
    })),
  });
}));

// POST /rhythmtap/submit — save session result
router.post('/submit', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { score, perfect, good, miss } = req.body;

  if (typeof score !== 'number' || score < 0) return res.status(400).json({ error: 'Invalid score' });

  const total = (perfect || 0) + (good || 0) + (miss || 0);
  const accuracy = total > 0 ? Math.round((((perfect || 0) + (good || 0)) / total) * 10000) / 100 : 0;

  await pool.query(
    `INSERT INTO rhythm_tap_scores (telegram_id, score, accuracy, perfect, good, miss, played_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [telegramId, score, accuracy, perfect || 0, good || 0, miss || 0, Date.now()]
  );

  // Gem reward based on accuracy
  const reward = RHYTHM_TAP.accuracyRewards.find(r => accuracy >= r.minAccuracy);
  let gems = 0;
  if (reward) {
    gems = reward.gems;
    await pool.query('UPDATE users SET gems=COALESCE(gems,0)+$1 WHERE telegram_id=$2', [gems, telegramId]);
  }

  res.json({ accuracy, gems, grade: reward?.label || 'C' });
}));

module.exports = router;
