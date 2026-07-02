const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { BOSS_ECOSYSTEM } = require('../gameConfig');
const { grantRandomArtifact } = require('./artifacts');
const { broadcast } = require('../wsManager');

const router = express.Router();

async function initBossEcosystem(client) {
  for (const boss of BOSS_ECOSYSTEM) {
    await client.query(
      `INSERT INTO boss_ecosystem (boss_key, hp, max_hp, last_killed_at, active)
       VALUES ($1,$2,$2,0,TRUE)
       ON CONFLICT (boss_key) DO NOTHING`,
      [boss.key, boss.baseHp]
    );
  }
}

async function respawnDeadBosses(client) {
  const now = Date.now();
  for (const def of BOSS_ECOSYSTEM) {
    const { rows: [row] } = await client.query(
      'SELECT hp, last_killed_at, active FROM boss_ecosystem WHERE boss_key=$1',
      [def.key]
    );
    if (!row) continue;
    if (Number(row.hp) <= 0) {
      const readyAt = Number(row.last_killed_at) + def.respawnMs;
      if (now >= readyAt) {
        await client.query(
          'UPDATE boss_ecosystem SET hp=$1, active=TRUE WHERE boss_key=$2',
          [def.baseHp, def.key]
        );
      }
    }
  }
}

// GET /bossecosystem
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const client = await pool.connect();
  try {
    await respawnDeadBosses(client);

    const { rows: bossRows } = await client.query(
      'SELECT boss_key, hp, max_hp, last_killed_at, active FROM boss_ecosystem'
    );
    const { rows: hitRows } = await client.query(
      'SELECT boss_key, damage FROM boss_ecosystem_hits WHERE telegram_id=$1',
      [telegramId]
    );
    const myDamageMap = Object.fromEntries(hitRows.map(r => [r.boss_key, Number(r.damage)]));
    const now = Date.now();

    const bosses = BOSS_ECOSYSTEM.map(def => {
      const row = bossRows.find(r => r.boss_key === def.key) || {};
      const hp = Number(row.hp || 0);
      const maxHp = Number(row.max_hp || def.baseHp);
      const lastKilledAt = Number(row.last_killed_at || 0);
      const alive = hp > 0 && row.active;
      const respawnAt = alive ? null : lastKilledAt + def.respawnMs;
      return {
        key: def.key,
        name: def.name,
        icon: def.icon,
        type: def.type,
        weakness: def.weakness,
        weaknessArtifacts: def.weaknessArtifacts,
        hp,
        maxHp,
        hpPct: maxHp > 0 ? hp / maxHp : 0,
        alive,
        respawnAt,
        respawnInMs: alive ? null : Math.max(0, respawnAt - now),
        lootGems: def.loot.gems,
        lootArtifacts: def.loot.artifactKeys,
        myDamage: myDamageMap[def.key] || 0,
      };
    });

    res.json({ bosses });
  } finally {
    client.release();
  }
}));

// POST /bossecosystem/tap/:key
router.post('/tap/:key', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const bossKey = req.params.key;
  const count = Math.min(Math.max(1, parseInt(req.body.count) || 20), 100);

  const def = BOSS_ECOSYSTEM.find(b => b.key === bossKey);
  if (!def) return res.status(400).json({ error: 'Unknown boss' });

  const result = await withTransaction(async (client) => {
    const { rows: [boss] } = await client.query(
      'SELECT hp, max_hp, active FROM boss_ecosystem WHERE boss_key=$1',
      [bossKey]
    );
    if (!boss || Number(boss.hp) <= 0 || !boss.active) {
      throw Object.assign(new Error('Boss is dead or not spawned'), { status: 400 });
    }

    // Check equipped artifacts for weakness bonus
    const { rows: equipped } = await client.query(
      'SELECT artifact_key FROM user_artifacts WHERE telegram_id=$1 AND equipped_slot IS NOT NULL',
      [telegramId]
    );
    const equippedKeys = equipped.map(r => r.artifact_key);
    const hasWeakness = def.weaknessArtifacts.some(k => equippedKeys.includes(k));
    const damageMult = hasWeakness ? 2 : 1;
    const damage = count * 1000 * damageMult;

    const newHp = Math.max(0, Number(boss.hp) - damage);
    await client.query('UPDATE boss_ecosystem SET hp=$1 WHERE boss_key=$2', [newHp, bossKey]);
    await client.query(
      `INSERT INTO boss_ecosystem_hits (boss_key, telegram_id, damage)
       VALUES ($1,$2,$3)
       ON CONFLICT (boss_key, telegram_id) DO UPDATE SET damage = boss_ecosystem_hits.damage + $3`,
      [bossKey, telegramId, damage]
    );

    let lootEarned = null;
    if (newHp <= 0 && Number(boss.hp) > 0) {
      // Boss killed — reward top damagers
      await client.query(
        'UPDATE boss_ecosystem SET hp=0, active=FALSE, last_killed_at=$1 WHERE boss_key=$2',
        [Date.now(), bossKey]
      );

      const { rows: topHitters } = await client.query(
        `SELECT telegram_id, damage FROM boss_ecosystem_hits
         WHERE boss_key=$1 AND rewarded=FALSE
         ORDER BY damage DESC LIMIT 10`,
        [bossKey]
      );
      for (const h of topHitters) {
        const rank = topHitters.indexOf(h) + 1;
        const gems = Math.max(1, Math.floor(def.loot.gems / rank));
        await client.query(
          'UPDATE users SET gems = COALESCE(gems,0) + $1 WHERE telegram_id=$2',
          [gems, h.telegram_id]
        );
        if (rank <= 3 && def.loot.artifactKeys?.length > 0) {
          const artKey = def.loot.artifactKeys[Math.floor(Math.random() * def.loot.artifactKeys.length)];
          await grantRandomArtifact(client, h.telegram_id, artKey);
        }
      }
      await client.query(
        'UPDATE boss_ecosystem_hits SET rewarded=TRUE WHERE boss_key=$1',
        [bossKey]
      );
      lootEarned = { gems: def.loot.gems };

      broadcast(`bosseco:${bossKey}`, { type: 'boss_eco_killed', bossKey, name: def.name });
    } else {
      broadcast(`bosseco:${bossKey}`, { type: 'boss_eco_hp', bossKey, hp: newHp, maxHp: Number(boss.max_hp) });
    }

    return {
      damage,
      hasWeakness,
      damageMult,
      newHp,
      bossAlive: newHp > 0,
      lootEarned,
    };
  });

  res.json(result);
}));

module.exports = { router, initBossEcosystem };
