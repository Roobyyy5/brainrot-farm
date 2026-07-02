const express = require('express');
const { pool } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { TAP_CHALLENGES } = require('../gameConfig');

const router = express.Router();

// GET /ghostrace/:challengeKey — get best ghost (top record, excluding self)
router.get('/:key', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { key } = req.params;

  const cfg = TAP_CHALLENGES.find(c => c.key === key);
  if (!cfg) return res.status(400).json({ error: 'Unknown challenge' });

  // Best ghost from other players
  const { rows: [ghost] } = await pool.query(
    `SELECT gr.telegram_id, gr.total_taps, gr.tap_timeline, gr.recorded_at, u.username
     FROM ghost_records gr
     JOIN users u ON u.telegram_id = gr.telegram_id
     WHERE gr.challenge_key=$1 AND gr.telegram_id != $2
     ORDER BY gr.total_taps DESC
     LIMIT 1`,
    [key, telegramId]
  );

  // My own ghost
  const { rows: [myGhost] } = await pool.query(
    'SELECT total_taps, tap_timeline, recorded_at FROM ghost_records WHERE challenge_key=$1 AND telegram_id=$2',
    [key, telegramId]
  );

  // Top 5 records leaderboard
  const { rows: top } = await pool.query(
    `SELECT gr.telegram_id, gr.total_taps, gr.recorded_at, u.username,
            ROW_NUMBER() OVER (ORDER BY gr.total_taps DESC) AS rank
     FROM ghost_records gr
     JOIN users u ON u.telegram_id = gr.telegram_id
     WHERE gr.challenge_key=$1
     ORDER BY gr.total_taps DESC
     LIMIT 5`,
    [key]
  );

  res.json({
    challengeKey: key,
    ghost: ghost ? {
      username: ghost.username,
      totalTaps: ghost.total_taps,
      timeline: ghost.tap_timeline,
      recordedAt: Number(ghost.recorded_at),
    } : null,
    myGhost: myGhost ? {
      totalTaps: myGhost.total_taps,
      timeline: myGhost.tap_timeline,
      recordedAt: Number(myGhost.recorded_at),
    } : null,
    leaderboard: top.map(r => ({
      rank: Number(r.rank),
      username: r.username,
      totalTaps: r.total_taps,
      recordedAt: Number(r.recorded_at),
    })),
  });
}));

// POST /ghostrace/save — save a completed challenge run as ghost record
router.post('/save', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { challengeKey, totalTaps, timeline } = req.body;

  const cfg = TAP_CHALLENGES.find(c => c.key === challengeKey);
  if (!cfg) return res.status(400).json({ error: 'Unknown challenge' });

  const safeTaps = Math.min(Math.max(0, parseInt(totalTaps) || 0), 999999);
  const safeTimeline = Array.isArray(timeline) ? timeline.slice(0, 600) : [];

  // Only save if it's a personal best
  const { rows: [existing] } = await pool.query(
    'SELECT total_taps FROM ghost_records WHERE telegram_id=$1 AND challenge_key=$2',
    [telegramId, challengeKey]
  );

  if (existing && existing.total_taps >= safeTaps) {
    return res.json({ saved: false, reason: 'Not a personal best' });
  }

  await pool.query(
    `INSERT INTO ghost_records (telegram_id, challenge_key, total_taps, tap_timeline, recorded_at)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (telegram_id, challenge_key)
     DO UPDATE SET total_taps=$3, tap_timeline=$4, recorded_at=$5`,
    [telegramId, challengeKey, safeTaps, JSON.stringify(safeTimeline), Date.now()]
  );

  res.json({ saved: true, totalTaps: safeTaps });
}));

module.exports = router;
