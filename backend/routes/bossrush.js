const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { BOSS_RUSH_WAVES, BOSS_RUSH_BASE_HP, TAPPER_UPGRADES } = require('../gameConfig');

const router = express.Router();

function waveConfig(waveNum) {
  return BOSS_RUSH_WAVES.find(w => w.wave === waveNum) || BOSS_RUSH_WAVES[BOSS_RUSH_WAVES.length - 1];
}

// GET /bossrush — active session or null
router.get('/', asyncHandler(async (req, res) => {
  const tid = req.tgUser.id.toString();
  const { rows } = await pool.query(
    'SELECT * FROM boss_rush_sessions WHERE telegram_id=$1 AND status=$2 ORDER BY id DESC LIMIT 1',
    [tid, 'active']
  );
  if (!rows[0]) {
    return res.json({ session: null, waves: BOSS_RUSH_WAVES });
  }
  const s = rows[0];
  res.json({
    session: {
      id: s.id,
      wave: s.current_wave,
      bossName: s.boss_name,
      bossHp: Number(s.boss_hp),
      bossMaxHp: Number(s.boss_max_hp),
      score: Number(s.score),
      startedAt: Number(s.started_at),
    },
    waves: BOSS_RUSH_WAVES,
  });
}));

// POST /bossrush/start — start a new run
router.post('/start', asyncHandler(async (req, res) => {
  const tid = req.tgUser.id.toString();
  const result = await withTransaction(async (client) => {
    const { rows: existing } = await client.query(
      "SELECT id FROM boss_rush_sessions WHERE telegram_id=$1 AND status='active'",
      [tid]
    );
    if (existing[0]) return { error: 'Session already active — defeat the boss first!' };

    const wave = waveConfig(1);
    const hp = BOSS_RUSH_BASE_HP * wave.hpMult;
    const { rows } = await client.query(
      `INSERT INTO boss_rush_sessions (telegram_id, current_wave, boss_hp, boss_max_hp, boss_name, score, started_at)
       VALUES ($1, 1, $2, $2, $3, 0, $4) RETURNING *`,
      [tid, hp, wave.name, Date.now()]
    );
    return { session: rows[0] };
  });
  if (result.error) return res.status(400).json({ error: result.error });
  const s = result.session;
  res.json({
    session: {
      id: s.id, wave: s.current_wave, bossName: s.boss_name,
      bossHp: Number(s.boss_hp), bossMaxHp: Number(s.boss_max_hp), score: 0,
    },
  });
}));

// POST /bossrush/tap — deal damage
router.post('/tap', asyncHandler(async (req, res) => {
  const tid = req.tgUser.id.toString();
  const count = Math.max(1, Math.min(1000, parseInt(req.body.count, 10) || 1));

  const result = await withTransaction(async (client) => {
    const { rows: sessions } = await client.query(
      "SELECT * FROM boss_rush_sessions WHERE telegram_id=$1 AND status='active' FOR UPDATE",
      [tid]
    );
    if (!sessions[0]) return { error: 'No active session' };
    const s = sessions[0];

    const { rows: prof } = await client.query(
      'SELECT tap_power_level FROM tapper_profiles WHERE telegram_id=$1',
      [tid]
    );
    const tapPower = TAPPER_UPGRADES.TAP_POWER.getEffect(prof[0]?.tap_power_level || 0);
    const damage = count * tapPower;
    const newHp = Math.max(0, Number(s.boss_hp) - damage);
    const killed = newHp === 0;

    const wave = waveConfig(s.current_wave);
    let bpEarned = 0;
    let gemsEarned = 0;
    let nextWave = null;
    let completed = false;

    if (killed) {
      bpEarned = wave.bpReward;
      gemsEarned = wave.gemReward;
      if (bpEarned > 0) await client.query('UPDATE users SET coins=coins+$1, weekly_coins=weekly_coins+$1 WHERE telegram_id=$2', [bpEarned, tid]);
      if (gemsEarned > 0) await client.query('UPDATE users SET gems=gems+$1 WHERE telegram_id=$2', [gemsEarned, tid]);

      if (s.current_wave >= BOSS_RUSH_WAVES.length) {
        completed = true;
        await client.query(
          'UPDATE boss_rush_sessions SET boss_hp=0, score=score+$1, status=$2, ended_at=$3 WHERE id=$4',
          [wave.bpReward, 'completed', Date.now(), s.id]
        );
      } else {
        const nw = waveConfig(s.current_wave + 1);
        const nHp = BOSS_RUSH_BASE_HP * nw.hpMult;
        nextWave = { wave: nw.wave, bossName: nw.name, bossHp: nHp, bossMaxHp: nHp };
        await client.query(
          'UPDATE boss_rush_sessions SET current_wave=$1, boss_hp=$2, boss_max_hp=$2, boss_name=$3, score=score+$4 WHERE id=$5',
          [nw.wave, nHp, nw.name, wave.bpReward, s.id]
        );
      }
    } else {
      await client.query('UPDATE boss_rush_sessions SET boss_hp=$1 WHERE id=$2', [newHp, s.id]);
    }

    return { damage, newHp, killed, bpEarned, gemsEarned, nextWave, completed };
  });

  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

// POST /bossrush/abandon — give up
router.post('/abandon', asyncHandler(async (req, res) => {
  const tid = req.tgUser.id.toString();
  await pool.query(
    "UPDATE boss_rush_sessions SET status='failed', ended_at=$1 WHERE telegram_id=$2 AND status='active'",
    [Date.now(), tid]
  );
  res.json({ success: true });
}));

module.exports = router;
