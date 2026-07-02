const express = require('express');
const router = express.Router();
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { TAP_CHALLENGES } = require('../gameConfig');

// GET /tapchallenge — list all challenges + player records
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();

  const recordsR = await pool.query(
    'SELECT challenge_key, best_taps, best_time_ms FROM tap_challenge_records WHERE telegram_id=$1',
    [telegramId]
  );
  const myRecords = {};
  for (const r of recordsR.rows) myRecords[r.challenge_key] = { bestTaps: Number(r.best_taps), bestTimeMs: r.best_time_ms ? Number(r.best_time_ms) : null };

  // Active run if any
  const activeR = await pool.query(
    "SELECT * FROM tap_challenge_runs WHERE telegram_id=$1 AND status='active' LIMIT 1",
    [telegramId]
  );

  const challenges = TAP_CHALLENGES.map(c => ({
    ...c,
    myRecord: myRecords[c.key] || null,
  }));

  res.json({ challenges, activeRun: activeR.rows[0] || null });
}));

// POST /tapchallenge/start
router.post('/start', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const { challengeKey } = req.body;
  const cfg = TAP_CHALLENGES.find(c => c.key === challengeKey);
  if (!cfg) return res.status(400).json({ error: 'Unknown challenge' });

  await withTransaction(async (client) => {
    // Cancel any existing active run
    await client.query(
      "UPDATE tap_challenge_runs SET status='abandoned', ended_at=$1 WHERE telegram_id=$2 AND status='active'",
      [Date.now(), telegramId]
    );

    await client.query(
      "INSERT INTO tap_challenge_runs (telegram_id, challenge_key, taps_done, status, started_at) VALUES ($1,$2,0,'active',$3)",
      [telegramId, challengeKey, Date.now()]
    );
  });

  res.json({ ok: true, timeLimit: cfg.timeLimit, tapTarget: cfg.tapTarget });
}));

// POST /tapchallenge/tap — record taps during challenge
router.post('/tap', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const taps = Math.min(Math.max(1, Math.floor(Number(req.body.count) || 1)), 1000);
  const now = Date.now();

  const result = await withTransaction(async (client) => {
    const runR = await client.query(
      "SELECT * FROM tap_challenge_runs WHERE telegram_id=$1 AND status='active' FOR UPDATE",
      [telegramId]
    );
    if (!runR.rows[0]) throw Object.assign(new Error('No active challenge run'), { status: 404 });
    const run = runR.rows[0];

    const cfg = TAP_CHALLENGES.find(c => c.key === run.challenge_key);
    if (!cfg) throw Object.assign(new Error('Unknown challenge config'), { status: 500 });

    const elapsed = now - Number(run.started_at);
    const timeLimitMs = cfg.timeLimit * 1000;

    if (elapsed > timeLimitMs) {
      // Time expired — fail
      await client.query("UPDATE tap_challenge_runs SET status='failed', ended_at=$1 WHERE id=$2", [now, run.id]);
      return { status: 'failed', tapsDone: Number(run.taps_done), cfg };
    }

    const newTaps = Number(run.taps_done) + taps;
    await client.query('UPDATE tap_challenge_runs SET taps_done=$1 WHERE id=$2', [newTaps, run.id]);

    // Score-mode or target-mode check
    let completed = false;
    if (cfg.tapTarget && newTaps >= cfg.tapTarget) completed = true;
    if (completed || (cfg.scoreMode && elapsed > timeLimitMs)) completed = true;

    if (completed) {
      await client.query(
        "UPDATE tap_challenge_runs SET status='completed', taps_done=$1, ended_at=$2, gems_rewarded=$3 WHERE id=$4",
        [newTaps, now, cfg.rewardGems, run.id]
      );
      await client.query('UPDATE users SET gems=gems+$1 WHERE telegram_id=$2', [cfg.rewardGems, telegramId]);

      // Update personal record
      const recR = await client.query(
        'SELECT best_taps, best_time_ms FROM tap_challenge_records WHERE telegram_id=$1 AND challenge_key=$2',
        [telegramId, cfg.key]
      );
      const timeMs = elapsed;
      if (!recR.rows[0] || newTaps > Number(recR.rows[0].best_taps) || (cfg.scoreMode && newTaps > Number(recR.rows[0].best_taps))) {
        await client.query(
          `INSERT INTO tap_challenge_records (telegram_id, challenge_key, best_taps, best_time_ms, achieved_at)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (telegram_id, challenge_key) DO UPDATE SET best_taps=$3, best_time_ms=$4, achieved_at=$5`,
          [telegramId, cfg.key, newTaps, timeMs, now]
        );
      }

      return { status: 'completed', tapsDone: newTaps, gemsEarned: cfg.rewardGems, timeMs, cfg };
    }

    return { status: 'active', tapsDone: newTaps, timeLeft: Math.max(0, timeLimitMs - elapsed), cfg };
  });

  res.json(result);
}));

// POST /tapchallenge/abandon
router.post('/abandon', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  await pool.query(
    "UPDATE tap_challenge_runs SET status='abandoned', ended_at=$1 WHERE telegram_id=$2 AND status='active'",
    [Date.now(), telegramId]
  );
  res.json({ ok: true });
}));

// GET /tapchallenge/leaderboard/:key
router.get('/leaderboard/:key', asyncHandler(async (req, res) => {
  const { key } = req.params;
  const cfg = TAP_CHALLENGES.find(c => c.key === key);
  if (!cfg) return res.status(400).json({ error: 'Unknown challenge' });

  const { rows } = await pool.query(
    `SELECT u.username, tcr.best_taps, tcr.best_time_ms, tcr.achieved_at
     FROM tap_challenge_records tcr
     JOIN users u ON u.telegram_id = tcr.telegram_id
     WHERE tcr.challenge_key=$1
     ORDER BY tcr.best_taps DESC, tcr.best_time_ms ASC
     LIMIT 20`,
    [key]
  );

  res.json({
    challenge: cfg,
    leaderboard: rows.map((r, i) => ({
      rank: i + 1,
      username: r.username || '???',
      bestTaps: Number(r.best_taps),
      bestTimeMs: r.best_time_ms ? Number(r.best_time_ms) : null,
    })),
  });
}));

module.exports = router;
