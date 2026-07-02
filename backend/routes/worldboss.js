const express = require('express');
const router = express.Router();
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { WORLD_BOSS_HP, WORLD_BOSS_NAMES, WORLD_BOSS_DURATION_MS, WORLD_BOSS_TOP_GEMS } = require('../gameConfig');
const { broadcast } = require('../wsManager');

async function getOrCreateBoss() {
  const now = Date.now();
  const r = await pool.query('SELECT * FROM world_boss WHERE settled = FALSE AND ends_at > $1 ORDER BY id DESC LIMIT 1', [now]);
  if (r.rows[0]) return r.rows[0];

  const name = WORLD_BOSS_NAMES[Math.floor(Math.random() * WORLD_BOSS_NAMES.length)];
  const ins = await pool.query(
    'INSERT INTO world_boss (name, hp, max_hp, starts_at, ends_at, created_at) VALUES ($1,$2,$2,$3,$4,$3) RETURNING *',
    [name, WORLD_BOSS_HP, now, now + WORLD_BOSS_DURATION_MS]
  );
  return ins.rows[0];
}

async function settleBoss(client, bossId) {
  await client.query('UPDATE world_boss SET settled = TRUE WHERE id = $1', [bossId]);
  const hits = await client.query(
    'SELECT telegram_id, damage FROM world_boss_hits WHERE boss_id = $1 AND rewarded = FALSE ORDER BY damage DESC LIMIT 50',
    [bossId]
  );
  for (let i = 0; i < hits.rows.length; i++) {
    const gems = WORLD_BOSS_TOP_GEMS[i] ?? 5;
    await client.query('UPDATE users SET gems = gems + $1 WHERE telegram_id = $2', [gems, hits.rows[i].telegram_id]);
    await client.query('UPDATE world_boss_hits SET rewarded = TRUE WHERE boss_id = $1 AND telegram_id = $2', [bossId, hits.rows[i].telegram_id]);
  }
}

// GET /worldboss
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const boss = await getOrCreateBoss();

  const myHit = await pool.query('SELECT damage FROM world_boss_hits WHERE boss_id = $1 AND telegram_id = $2', [boss.id, telegramId]);
  const topHitters = await pool.query(`
    SELECT u.username, wbh.damage FROM world_boss_hits wbh
    JOIN users u ON u.telegram_id = wbh.telegram_id
    WHERE wbh.boss_id = $1 ORDER BY wbh.damage DESC LIMIT 10
  `, [boss.id]);

  const now2 = Date.now();
  const phase = getBossPhase(boss);
  res.json({
    boss: {
      id:        boss.id,
      name:      boss.name,
      hp:        Number(boss.hp),
      maxHp:     Number(boss.max_hp),
      endsAt:    Number(boss.ends_at),
      pct:       Math.round(Number(boss.hp) / Number(boss.max_hp) * 100),
      phase,
      vulnUntil: Number(boss.vuln_until || 0),
      vulnActive: Number(boss.vuln_until || 0) > now2,
      vulnDamageMult: VULN_DAMAGE_MULT,
    },
    myDamage:   myHit.rows[0] ? Number(myHit.rows[0].damage) : 0,
    topHitters: topHitters.rows.map((r, i) => ({ rank: i + 1, username: r.username || '???', damage: Number(r.damage) })),
    topGems:    WORLD_BOSS_TOP_GEMS,
  });
}));

const RAGE_HP_PCT = 0.5;
const VULN_WINDOW_MS = 2 * 60 * 1000;
const VULN_DURATION_MS = 15 * 1000;
const VULN_DAMAGE_MULT = 3;
const DEBUFF_DURATION_MS = 30 * 1000;

function getBossPhase(boss) {
  const now = Date.now();
  const hpPct = Number(boss.hp) / Number(boss.max_hp);
  if (hpPct > RAGE_HP_PCT) return 'normal';
  if (Number(boss.vuln_until) > now) return 'vulnerable';
  return 'rage';
}

// POST /worldboss/tap
router.post('/tap', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const taps = Math.min(Math.max(1, Math.floor(Number(req.body.count) || 1)), 100);
  const now = Date.now();

  const result = await withTransaction(async (client) => {
    const bossR = await client.query(
      'SELECT * FROM world_boss WHERE settled = FALSE AND ends_at > $1 ORDER BY id DESC LIMIT 1 FOR UPDATE',
      [now]
    );
    if (!bossR.rows[0]) throw Object.assign(new Error('No active world boss'), { status: 404 });
    const boss = bossR.rows[0];
    if (Number(boss.hp) <= 0) throw Object.assign(new Error('Boss already dead'), { status: 400 });

    const profR = await client.query('SELECT tap_power_level FROM tapper_profiles WHERE telegram_id = $1', [telegramId]);
    const tapPower = (Number(profR.rows[0]?.tap_power_level) || 0) + 1;

    const phase = getBossPhase(boss);
    const damageMult = phase === 'vulnerable' ? VULN_DAMAGE_MULT : 1;
    const damage = tapPower * taps * damageMult;
    const newHp = Math.max(0, Number(boss.hp) - damage);

    // Transition to rage / update vuln windows
    let newPhase = 'normal';
    let newVulnUntil = Number(boss.vuln_until || 0);
    const hpPct = newHp / Number(boss.max_hp);
    if (hpPct <= RAGE_HP_PCT) {
      newPhase = 'rage';
      // Open vulnerability window every VULN_WINDOW_MS
      const timeSinceRage = now - Number(boss.rage_until || now);
      if (Number(boss.rage_until) === 0) {
        // First time entering rage
        newVulnUntil = 0;
        await client.query('UPDATE world_boss SET rage_until=$1 WHERE id=$2', [now, boss.id]);
      } else if (timeSinceRage >= VULN_WINDOW_MS && Number(boss.vuln_until) < now) {
        newVulnUntil = now + VULN_DURATION_MS;
        await client.query('UPDATE world_boss SET vuln_until=$1 WHERE id=$2', [newVulnUntil, boss.id]);
      }
    }

    await client.query('UPDATE world_boss SET hp=$1, phase=$2 WHERE id=$3', [newHp, newPhase, boss.id]);
    await client.query(`
      INSERT INTO world_boss_hits (boss_id, telegram_id, damage) VALUES ($1, $2, $3)
      ON CONFLICT (boss_id, telegram_id) DO UPDATE SET damage = world_boss_hits.damage + EXCLUDED.damage
    `, [boss.id, telegramId, damage]);

    // Rage debuff: -50% energy regen for 30s (stored as a boost with negative type)
    if (newPhase === 'rage' && phase !== 'rage') {
      await client.query(
        `INSERT INTO user_boosts (telegram_id, boost_type, expires_at, activated_at)
         VALUES ($1,'rage_debuff',$2,$3)`,
        [telegramId, now + DEBUFF_DURATION_MS, now]
      );
    }

    if (newHp <= 0) await settleBoss(client, boss.id);

    return { bossId: boss.id, newHp, maxHp: Number(boss.max_hp), phase: newPhase, damageMult, vulnUntil: newVulnUntil };
  });

  // Broadcast live HP to all subscribers
  broadcast(`worldboss:${result.bossId}`, {
    type: 'boss_hp',
    hp: result.newHp,
    maxHp: result.maxHp,
    pct: Math.round(result.newHp / result.maxHp * 100),
    phase: result.phase,
    vulnUntil: result.vulnUntil,
  });

  res.json({ ok: true, phase: result.phase, damageMult: result.damageMult, vulnUntil: result.vulnUntil });
}));

async function settleExpiredBosses() {
  const now = Date.now();
  const expired = await pool.query('SELECT id FROM world_boss WHERE settled = FALSE AND ends_at <= $1', [now]);
  for (const row of expired.rows) {
    await withTransaction(client => settleBoss(client, row.id)).catch(err => console.error('World boss settle error:', err.message));
  }
}

module.exports = { router, settleExpiredBosses };
