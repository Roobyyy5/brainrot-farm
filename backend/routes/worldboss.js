const express = require('express');
const router = express.Router();
const db = require('../db');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { WORLD_BOSS_HP, WORLD_BOSS_NAMES, WORLD_BOSS_DURATION_MS, WORLD_BOSS_TOP_GEMS } = require('../gameConfig');

async function getOrCreateBoss() {
  const now = Date.now();
  const r = await db.query('SELECT * FROM world_boss WHERE settled = FALSE AND ends_at > $1 ORDER BY id DESC LIMIT 1', [now]);
  if (r.rows[0]) return r.rows[0];

  const name = WORLD_BOSS_NAMES[Math.floor(Math.random() * WORLD_BOSS_NAMES.length)];
  const ins = await db.query(
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

  const myHit = await db.query('SELECT damage FROM world_boss_hits WHERE boss_id = $1 AND telegram_id = $2', [boss.id, telegramId]);
  const topHitters = await db.query(`
    SELECT u.username, wbh.damage FROM world_boss_hits wbh
    JOIN users u ON u.telegram_id = wbh.telegram_id
    WHERE wbh.boss_id = $1 ORDER BY wbh.damage DESC LIMIT 10
  `, [boss.id]);

  res.json({
    boss: {
      id:    boss.id,
      name:  boss.name,
      hp:    Number(boss.hp),
      maxHp: Number(boss.max_hp),
      endsAt: Number(boss.ends_at),
      pct:   Math.round(Number(boss.hp) / Number(boss.max_hp) * 100),
    },
    myDamage:   myHit.rows[0] ? Number(myHit.rows[0].damage) : 0,
    topHitters: topHitters.rows.map((r, i) => ({ rank: i + 1, username: r.username || '???', damage: Number(r.damage) })),
    topGems:    WORLD_BOSS_TOP_GEMS,
  });
}));

// POST /worldboss/tap
router.post('/tap', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const taps = Math.min(Math.max(1, Math.floor(Number(req.body.count) || 1)), 100);
  const now = Date.now();

  await withTransaction(async (client) => {
    const bossR = await client.query(
      'SELECT * FROM world_boss WHERE settled = FALSE AND ends_at > $1 ORDER BY id DESC LIMIT 1 FOR UPDATE',
      [now]
    );
    if (!bossR.rows[0]) throw Object.assign(new Error('No active world boss'), { status: 404 });
    const boss = bossR.rows[0];
    if (Number(boss.hp) <= 0) throw Object.assign(new Error('Boss already dead'), { status: 400 });

    const profR = await client.query('SELECT tap_power_level FROM tapper_profiles WHERE telegram_id = $1', [telegramId]);
    const tapPower = (Number(profR.rows[0]?.tap_power_level) || 0) + 1;
    const damage = tapPower * taps;
    const newHp = Math.max(0, Number(boss.hp) - damage);

    await client.query('UPDATE world_boss SET hp = $1 WHERE id = $2', [newHp, boss.id]);
    await client.query(`
      INSERT INTO world_boss_hits (boss_id, telegram_id, damage) VALUES ($1, $2, $3)
      ON CONFLICT (boss_id, telegram_id) DO UPDATE SET damage = world_boss_hits.damage + EXCLUDED.damage
    `, [boss.id, telegramId, damage]);

    if (newHp <= 0) await settleBoss(client, boss.id);
  });

  res.json({ ok: true });
}));

async function settleExpiredBosses() {
  const now = Date.now();
  const expired = await db.query('SELECT id FROM world_boss WHERE settled = FALSE AND ends_at <= $1', [now]);
  for (const row of expired.rows) {
    await withTransaction(client => settleBoss(client, row.id)).catch(err => console.error('World boss settle error:', err.message));
  }
}

module.exports = { router, settleExpiredBosses };
