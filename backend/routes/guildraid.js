const express = require('express');
const router = express.Router();
const db = require('../db');
const { withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { GUILD_RAID_WAVES, GUILD_RAID_BASE_HP } = require('../gameConfig');

const RAID_TIMEOUT_MS = 24 * 60 * 60 * 1000;

// GET /guildraid
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();

  const memberR = await db.query('SELECT guild_id FROM guild_members WHERE telegram_id = $1', [telegramId]);
  if (!memberR.rows[0]) return res.json({ raid: null, waves: GUILD_RAID_WAVES, message: 'Not in a guild' });
  const guildId = memberR.rows[0].guild_id;

  const raidR = await db.query(
    "SELECT * FROM guild_raids WHERE guild_id = $1 AND status = 'active' ORDER BY started_at DESC LIMIT 1",
    [guildId]
  );

  if (!raidR.rows[0]) return res.json({ raid: null, waves: GUILD_RAID_WAVES });
  const raid = raidR.rows[0];

  if (Date.now() - Number(raid.started_at) > RAID_TIMEOUT_MS) {
    await db.query("UPDATE guild_raids SET status = 'failed', ended_at = $1 WHERE id = $2", [Date.now(), raid.id]);
    return res.json({ raid: null, waves: GUILD_RAID_WAVES, message: 'Raid timed out' });
  }

  const myHit = await db.query('SELECT damage FROM guild_raid_hits WHERE raid_id = $1 AND telegram_id = $2', [raid.id, telegramId]);
  const participants = await db.query(`
    SELECT u.username, grh.damage FROM guild_raid_hits grh
    JOIN users u ON u.telegram_id = grh.telegram_id
    WHERE grh.raid_id = $1 ORDER BY grh.damage DESC
  `, [raid.id]);

  res.json({
    raid: {
      id:          raid.id,
      wave:        raid.current_wave,
      bossHp:      Number(raid.boss_hp),
      bossMaxHp:   Number(raid.boss_max_hp),
      bossName:    raid.boss_name,
      status:      raid.status,
      totalDamage: Number(raid.total_damage),
      startedAt:   Number(raid.started_at),
    },
    myDamage:     myHit.rows[0] ? Number(myHit.rows[0].damage) : 0,
    participants: participants.rows.map(r => ({ username: r.username || '???', damage: Number(r.damage) })),
    waves:        GUILD_RAID_WAVES,
  });
}));

// POST /guildraid/start
router.post('/start', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const now = Date.now();

  const memberR = await db.query('SELECT guild_id FROM guild_members WHERE telegram_id = $1', [telegramId]);
  if (!memberR.rows[0]) return res.status(400).json({ error: 'Not in a guild' });
  const guildId = memberR.rows[0].guild_id;

  const existingR = await db.query("SELECT id FROM guild_raids WHERE guild_id = $1 AND status = 'active'", [guildId]);
  if (existingR.rows[0]) return res.status(400).json({ error: 'Raid already active' });

  const wave = GUILD_RAID_WAVES[0];
  const bossHp = Math.floor(GUILD_RAID_BASE_HP * wave.hpMult);

  const ins = await db.query(
    "INSERT INTO guild_raids (guild_id, current_wave, boss_hp, boss_max_hp, boss_name, total_damage, status, started_at) VALUES ($1,1,$2,$2,$3,0,'active',$4) RETURNING id",
    [guildId, bossHp, wave.name, now]
  );

  res.json({ ok: true, raidId: ins.rows[0].id });
}));

// POST /guildraid/tap
router.post('/tap', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id.toString();
  const taps = Math.min(Math.max(1, Math.floor(Number(req.body.count) || 1)), 200);

  await withTransaction(async (client) => {
    const memberR = await client.query('SELECT guild_id FROM guild_members WHERE telegram_id = $1', [telegramId]);
    if (!memberR.rows[0]) throw Object.assign(new Error('Not in a guild'), { status: 400 });
    const guildId = memberR.rows[0].guild_id;

    const raidR = await client.query(
      "SELECT * FROM guild_raids WHERE guild_id = $1 AND status = 'active' LIMIT 1 FOR UPDATE",
      [guildId]
    );
    if (!raidR.rows[0]) throw Object.assign(new Error('No active raid'), { status: 404 });
    const raid = raidR.rows[0];

    const profR = await client.query('SELECT tap_power_level FROM tapper_profiles WHERE telegram_id = $1', [telegramId]);
    const tapPower = (Number(profR.rows[0]?.tap_power_level) || 0) + 1;
    const damage = tapPower * taps;
    const newHp = Math.max(0, Number(raid.boss_hp) - damage);

    await client.query('UPDATE guild_raids SET boss_hp = $1, total_damage = total_damage + $2 WHERE id = $3', [newHp, damage, raid.id]);
    await client.query(`
      INSERT INTO guild_raid_hits (raid_id, telegram_id, damage) VALUES ($1, $2, $3)
      ON CONFLICT (raid_id, telegram_id) DO UPDATE SET damage = guild_raid_hits.damage + EXCLUDED.damage
    `, [raid.id, telegramId, damage]);

    if (newHp <= 0) {
      const currentWave = Number(raid.current_wave);
      if (currentWave >= GUILD_RAID_WAVES.length) {
        await client.query("UPDATE guild_raids SET status = 'completed', ended_at = $1 WHERE id = $2", [Date.now(), raid.id]);
        const totalGems = GUILD_RAID_WAVES.reduce((s, w) => s + w.gemReward, 0);
        const pts = await client.query('SELECT DISTINCT telegram_id FROM guild_raid_hits WHERE raid_id = $1', [raid.id]);
        for (const p of pts.rows) {
          await client.query('UPDATE users SET gems = gems + $1 WHERE telegram_id = $2', [totalGems, p.telegram_id]);
        }
      } else {
        const next = GUILD_RAID_WAVES[currentWave];
        const nextHp = Math.floor(GUILD_RAID_BASE_HP * next.hpMult);
        await client.query(
          'UPDATE guild_raids SET current_wave = $1, boss_hp = $2, boss_max_hp = $3, boss_name = $4 WHERE id = $5',
          [currentWave + 1, nextHp, nextHp, next.name, raid.id]
        );
      }
    }
  });

  res.json({ ok: true });
}));

module.exports = router;
