const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { GUILD_MAX_MEMBERS, GUILD_BOSS_SCHEDULE, TAPPER_UPGRADES } = require('../gameConfig');
const { addWarScore } = require('./guildwars');

const router = express.Router();

router.get('/my', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { rows: m } = await pool.query(
    `SELECT gm.guild_id, gm.role, g.name, g.tag, g.level, g.xp, g.description, g.owner_id
     FROM guild_members gm JOIN guilds g ON g.id=gm.guild_id
     WHERE gm.telegram_id=$1`, [telegramId]
  );
  if (!m[0]) return res.json({ guild: null });
  const { guild_id, role, name, tag, level, xp, description, owner_id } = m[0];
  const [members, bossRows] = await Promise.all([
    pool.query(
      `SELECT gm.telegram_id, gm.role, gm.weekly_contribution, u.username
       FROM guild_members gm JOIN users u ON u.telegram_id=gm.telegram_id
       WHERE gm.guild_id=$1 ORDER BY gm.weekly_contribution DESC`, [guild_id]
    ),
    pool.query(
      'SELECT * FROM guild_boss_fights WHERE guild_id=$1 AND completed=FALSE AND ends_at>$2 ORDER BY id DESC LIMIT 1',
      [guild_id, Date.now()]
    ),
  ]);
  const boss = bossRows.rows[0];
  res.json({ guild: {
    id: guild_id, name, tag, level, xp, description, ownerId: owner_id, role,
    members: members.rows,
    boss: boss ? { id: boss.id, name: boss.name, hp: boss.hp, maxHp: boss.max_hp, rewardGems: boss.reward_gems, endsAt: boss.ends_at } : null,
  }});
}));

router.get('/search', asyncHandler(async (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const { rows } = await pool.query(
    `SELECT g.id, g.name, g.tag, g.level, g.description,
       (SELECT COUNT(*)::int FROM guild_members WHERE guild_id=g.id) AS member_count
     FROM guilds g WHERE g.name ILIKE $1 OR g.tag ILIKE $1 LIMIT 10`, [q]
  );
  res.json({ guilds: rows });
}));

router.post('/create', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { name, tag, description } = req.body;
  if (!name || !tag || name.length > 30 || tag.length > 6) {
    return res.status(400).json({ error: 'Name ≤30 chars, tag ≤6 chars required' });
  }
  const result = await withTransaction(async (client) => {
    const { rows: ex } = await client.query('SELECT id FROM guild_members WHERE telegram_id=$1', [telegramId]);
    if (ex[0]) return { error: 'Already in a guild' };
    const { rows: g } = await client.query(
      'INSERT INTO guilds (name,tag,owner_id,description,created_at) VALUES($1,$2,$3,$4,$5) RETURNING id',
      [name, tag.toUpperCase(), telegramId, description || '', Date.now()]
    );
    const guildId = g[0].id;
    await client.query('INSERT INTO guild_members (guild_id,telegram_id,role,joined_at) VALUES($1,$2,$3,$4)',
      [guildId, telegramId, 'owner', Date.now()]);
    const boss = GUILD_BOSS_SCHEDULE[0];
    await client.query(
      'INSERT INTO guild_boss_fights (guild_id,name,hp,max_hp,reward_gems,ends_at,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [guildId, boss.name, boss.maxHp, boss.maxHp, boss.rewardGems, Date.now() + 24 * 60 * 60 * 1000, Date.now()]
    );
    return { success: true, guildId };
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

router.post('/join', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const guildId = parseInt(req.body.guildId, 10);
  if (!guildId) return res.status(400).json({ error: 'guildId required' });
  const result = await withTransaction(async (client) => {
    const { rows: ex } = await client.query('SELECT id FROM guild_members WHERE telegram_id=$1', [telegramId]);
    if (ex[0]) return { error: 'Already in a guild' };
    const { rows: cnt } = await client.query('SELECT COUNT(*)::int AS c FROM guild_members WHERE guild_id=$1', [guildId]);
    if (cnt[0].c >= GUILD_MAX_MEMBERS) return { error: 'Guild is full' };
    await client.query('INSERT INTO guild_members (guild_id,telegram_id,role,joined_at) VALUES($1,$2,$3,$4)',
      [guildId, telegramId, 'member', Date.now()]);
    return { success: true };
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

router.post('/leave', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const result = await withTransaction(async (client) => {
    const { rows: m } = await client.query('SELECT guild_id, role FROM guild_members WHERE telegram_id=$1', [telegramId]);
    if (!m[0]) return { error: 'Not in a guild' };
    if (m[0].role === 'owner') return { error: 'Transfer ownership before leaving' };
    await client.query('DELETE FROM guild_members WHERE telegram_id=$1', [telegramId]);
    return { success: true };
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

router.post('/boss/tap', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const count = parseInt(req.body.count, 10);
  if (!count || count < 1 || count > 10000) return res.status(400).json({ error: 'Invalid count' });

  const result = await withTransaction(async (client) => {
    const { rows: m } = await client.query('SELECT guild_id FROM guild_members WHERE telegram_id=$1', [telegramId]);
    if (!m[0]) return { error: 'Not in a guild' };
    const guildId = m[0].guild_id;

    const { rows: b } = await client.query(
      'SELECT * FROM guild_boss_fights WHERE guild_id=$1 AND completed=FALSE AND ends_at>$2 FOR UPDATE LIMIT 1',
      [guildId, Date.now()]
    );
    if (!b[0]) return { error: 'No active guild boss' };

    const { rows: prof } = await client.query('SELECT * FROM tapper_profiles WHERE telegram_id=$1', [telegramId]);
    const tapPower = TAPPER_UPGRADES.TAP_POWER.getEffect(prof[0]?.tap_power_level || 0);
    const damage = count * tapPower;
    const newHp = Math.max(0, b[0].hp - damage);
    const killed = newHp === 0;

    await client.query('UPDATE guild_boss_fights SET hp=$1, completed=$2 WHERE id=$3', [newHp, killed, b[0].id]);
    await client.query(
      `INSERT INTO guild_boss_hits (fight_id,telegram_id,damage)
       VALUES($1,$2,$3) ON CONFLICT (fight_id,telegram_id) DO UPDATE SET damage=guild_boss_hits.damage+$3`,
      [b[0].id, telegramId, damage]
    );
    await client.query('UPDATE guild_members SET weekly_contribution=weekly_contribution+$1 WHERE telegram_id=$2', [damage, telegramId]);

    let gemReward = 0;
    if (killed) {
      const { rows: hits } = await client.query('SELECT * FROM guild_boss_hits WHERE fight_id=$1 AND rewarded=FALSE', [b[0].id]);
      const totalDmg = hits.reduce((s, h) => s + Number(h.damage), 0);
      for (const h of hits) {
        const share = Math.max(1, Math.floor((Number(h.damage) / totalDmg) * b[0].reward_gems));
        await client.query('UPDATE users SET gems=gems+$1 WHERE telegram_id=$2', [share, h.telegram_id]);
        await client.query('UPDATE guild_boss_hits SET rewarded=TRUE WHERE id=$1', [h.id]);
        if (h.telegram_id === telegramId) gemReward = share;
      }
      const idx = Math.floor(Math.random() * GUILD_BOSS_SCHEDULE.length);
      const next = GUILD_BOSS_SCHEDULE[idx];
      await client.query(
        'INSERT INTO guild_boss_fights (guild_id,name,hp,max_hp,reward_gems,ends_at,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [guildId, next.name, next.maxHp, next.maxHp, next.rewardGems, Date.now() + 24 * 60 * 60 * 1000, Date.now()]
      );
    }
    // Contribute damage to guild war score
    await addWarScore(guildId, damage).catch(() => {});

    return { damage, killed, gemReward, newHp };
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

module.exports = router;
