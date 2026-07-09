const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { COOP_RAID_BOSSES, COOP_RAID_LOBBY_EXPIRE_MS } = require('../gameConfig');
const { broadcast } = require('../wsManager');

const router = express.Router();

// GET /coopraid — list open lobbies + my active lobby
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const now = Date.now();

  const { rows: lobbies } = await pool.query(
    `SELECT l.*, u.username AS creator_name,
       (SELECT COUNT(*) FROM coop_raid_members m WHERE m.lobby_id = l.id) AS member_count
     FROM coop_raid_lobbies l
     JOIN users u ON u.telegram_id = l.creator_id
     WHERE l.status IN ('waiting','active')
     ORDER BY l.created_at DESC LIMIT 20`
  );

  const { rows: [myMembership] } = await pool.query(
    `SELECT m.lobby_id, m.damage, l.boss_key, l.hp, l.max_hp, l.status, l.ends_at
     FROM coop_raid_members m
     JOIN coop_raid_lobbies l ON l.id = m.lobby_id
     WHERE m.telegram_id=$1 AND l.status IN ('waiting','active')`,
    [telegramId]
  );

  res.json({
    lobbies: lobbies.map(l => ({
      id: l.id,
      bossKey: l.boss_key,
      boss: COOP_RAID_BOSSES.find(b => b.key === l.boss_key),
      hp: Number(l.hp),
      maxHp: Number(l.max_hp),
      status: l.status,
      memberCount: Number(l.member_count),
      startsAt: l.starts_at ? Number(l.starts_at) : null,
      endsAt: l.ends_at ? Number(l.ends_at) : null,
      creatorName: l.creator_name,
    })),
    myLobby: myMembership ? {
      lobbyId: myMembership.lobby_id,
      bossKey: myMembership.boss_key,
      myDamage: Number(myMembership.damage),
      hp: Number(myMembership.hp),
      maxHp: Number(myMembership.max_hp),
      status: myMembership.status,
      endsAt: myMembership.ends_at ? Number(myMembership.ends_at) : null,
    } : null,
    bossDefs: COOP_RAID_BOSSES,
  });
}));

// POST /coopraid/create
router.post('/create', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { bossKey } = req.body;
  const def = COOP_RAID_BOSSES.find(b => b.key === bossKey);
  if (!def) return res.status(400).json({ error: 'Unknown boss' });

  const result = await withTransaction(async (client) => {
    // Check not already in a lobby
    const { rows: [existing] } = await client.query(
      `SELECT l.id FROM coop_raid_members m
       JOIN coop_raid_lobbies l ON l.id = m.lobby_id
       WHERE m.telegram_id=$1 AND l.status IN ('waiting','active')`,
      [telegramId]
    );
    if (existing) throw Object.assign(new Error('Already in a raid lobby'), { status: 400 });

    const { rows: [lobby] } = await client.query(
      `INSERT INTO coop_raid_lobbies (boss_key, creator_id, hp, max_hp, status, created_at)
       VALUES ($1,$2,$3,$3,'waiting',$4) RETURNING id`,
      [bossKey, telegramId, def.hp, Date.now()]
    );
    await client.query(
      `INSERT INTO coop_raid_members (lobby_id, telegram_id, damage, joined_at) VALUES ($1,$2,0,$3)`,
      [lobby.id, telegramId, Date.now()]
    );
    return { lobbyId: lobby.id };
  });

  res.json(result);
}));

// POST /coopraid/join
router.post('/join', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const lobbyId = parseInt(req.body.lobbyId, 10);

  const result = await withTransaction(async (client) => {
    const { rows: [lobby] } = await client.query(
      'SELECT * FROM coop_raid_lobbies WHERE id=$1 FOR UPDATE', [lobbyId]
    );
    if (!lobby || lobby.status !== 'waiting') throw Object.assign(new Error('Lobby not available'), { status: 400 });

    const def = COOP_RAID_BOSSES.find(b => b.key === lobby.boss_key);
    const { rows: [count] } = await client.query(
      'SELECT COUNT(*)::int AS n FROM coop_raid_members WHERE lobby_id=$1', [lobbyId]
    );
    if (count.n >= def.maxPlayers) throw Object.assign(new Error('Lobby full'), { status: 400 });

    const { rows: [existing] } = await client.query(
      `SELECT l.id FROM coop_raid_members m
       JOIN coop_raid_lobbies l ON l.id = m.lobby_id
       WHERE m.telegram_id=$1 AND l.status IN ('waiting','active')`,
      [telegramId]
    );
    if (existing) throw Object.assign(new Error('Already in a lobby'), { status: 400 });

    await client.query(
      `INSERT INTO coop_raid_members (lobby_id, telegram_id, damage, joined_at) VALUES ($1,$2,0,$3)
       ON CONFLICT DO NOTHING`,
      [lobbyId, telegramId, Date.now()]
    );

    broadcast(`coopraid:${lobbyId}`, { type: 'member_joined', telegramId, memberCount: count.n + 1 });
    return { ok: true };
  });

  res.json(result);
}));

// POST /coopraid/start — creator starts the raid
router.post('/start', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const lobbyId = parseInt(req.body.lobbyId, 10);

  const result = await withTransaction(async (client) => {
    const { rows: [lobby] } = await client.query(
      'SELECT * FROM coop_raid_lobbies WHERE id=$1 AND creator_id=$2 FOR UPDATE', [lobbyId, telegramId]
    );
    if (!lobby || lobby.status !== 'waiting') throw Object.assign(new Error('Cannot start'), { status: 400 });

    const def = COOP_RAID_BOSSES.find(b => b.key === lobby.boss_key);
    const now = Date.now();
    const endsAt = now + def.durationMs;

    await client.query(
      `UPDATE coop_raid_lobbies SET status='active', starts_at=$1, ends_at=$2 WHERE id=$3`,
      [now, endsAt, lobbyId]
    );

    broadcast(`coopraid:${lobbyId}`, { type: 'raid_started', endsAt, hp: Number(lobby.hp), maxHp: Number(lobby.max_hp) });
    return { ok: true, endsAt };
  });

  res.json(result);
}));

// POST /coopraid/tap
router.post('/tap', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const lobbyId = parseInt(req.body.lobbyId, 10);
  const count = Math.min(Math.max(1, parseInt(req.body.count, 10) || 1), 100);

  const result = await withTransaction(async (client) => {
    const { rows: [lobby] } = await client.query(
      'SELECT * FROM coop_raid_lobbies WHERE id=$1 FOR UPDATE', [lobbyId]
    );
    if (!lobby || lobby.status !== 'active') throw Object.assign(new Error('Raid not active'), { status: 400 });

    const now = Date.now();
    if (Number(lobby.ends_at) < now) {
      await client.query(`UPDATE coop_raid_lobbies SET status='expired' WHERE id=$1`, [lobbyId]);
      throw Object.assign(new Error('Raid expired'), { status: 400 });
    }

    const { rows: [member] } = await client.query(
      'SELECT 1 FROM coop_raid_members WHERE lobby_id=$1 AND telegram_id=$2', [lobbyId, telegramId]
    );
    if (!member) throw Object.assign(new Error('Not in this raid'), { status: 400 });

    const damage = count * 5000;
    const newHp = Math.max(0, Number(lobby.hp) - damage);
    await client.query('UPDATE coop_raid_lobbies SET hp=$1 WHERE id=$2', [newHp, lobbyId]);
    await client.query(
      `UPDATE coop_raid_members SET damage = damage + $1 WHERE lobby_id=$2 AND telegram_id=$3`,
      [damage, lobbyId, telegramId]
    );

    let lootEarned = null;
    if (newHp <= 0 && Number(lobby.hp) > 0) {
      await client.query(`UPDATE coop_raid_lobbies SET status='completed' WHERE id=$1`, [lobbyId]);

      const { rows: members } = await client.query(
        `SELECT m.telegram_id, m.damage FROM coop_raid_members m WHERE m.lobby_id=$1 ORDER BY m.damage DESC`,
        [lobbyId]
      );
      const def = COOP_RAID_BOSSES.find(b => b.key === lobby.boss_key);
      const totalDmg = members.reduce((s, m) => s + Number(m.damage), 0) || 1;

      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const share = Math.floor((Number(m.damage) / totalDmg) * def.loot.gems);
        const bonus = i < 3 ? def.loot.topBonus : 0;
        const total = share + bonus;
        if (total > 0) await client.query('UPDATE users SET gems=COALESCE(gems,0)+$1 WHERE telegram_id=$2', [total, m.telegram_id]);
      }
      await client.query('UPDATE coop_raid_members SET rewarded=TRUE WHERE lobby_id=$1', [lobbyId]);
      lootEarned = true;
      broadcast(`coopraid:${lobbyId}`, { type: 'raid_cleared', name: def.name });
    } else {
      broadcast(`coopraid:${lobbyId}`, { type: 'raid_hp', hp: newHp, maxHp: Number(lobby.max_hp), damage, telegramId });
    }

    return { damage, newHp, bossAlive: newHp > 0, lootEarned };
  });

  res.json(result);
}));

// POST /coopraid/leave
router.post('/leave', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const lobbyId = parseInt(req.body.lobbyId, 10);
  await pool.query('DELETE FROM coop_raid_members WHERE lobby_id=$1 AND telegram_id=$2', [lobbyId, telegramId]);
  broadcast(`coopraid:${lobbyId}`, { type: 'member_left', telegramId });
  res.json({ ok: true });
}));

module.exports = router;
