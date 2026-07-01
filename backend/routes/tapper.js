const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const {
  TAPPER_UPGRADES,
  TAPPER_MAX_TAPS_PER_SEC,
  TAPPER_MAX_OFFLINE_HOURS,
  TAPPER_PRESTIGE_THRESHOLD,
  TAPPER_CRIT_CHANCE,
  TAPPER_ACHIEVEMENTS,
  BOSS_NAMES,
} = require('../gameConfig');

const router = express.Router();

// ─── helpers ────────────────────────────────────────────────────────────────

function computeEnergy(stored, energyMax, regenRate, lastEnergyAt) {
  const elapsed = (Date.now() - lastEnergyAt) / 1000;
  return Math.min(energyMax, Math.floor(stored + elapsed * regenRate));
}

function computeOfflineBP(autoBrainLevel, lastSeenAt) {
  if (autoBrainLevel === 0 || lastSeenAt === 0) return 0;
  const elapsedMin = Math.min(
    (Date.now() - lastSeenAt) / 60_000,
    TAPPER_MAX_OFFLINE_HOURS * 60
  );
  if (elapsedMin < 1) return 0;
  return Math.floor(elapsedMin * TAPPER_UPGRADES.AUTO_BRAIN.getEffect(autoBrainLevel));
}

function levelFor(upgradeKey, profile) {
  const map = {
    TAP_POWER:  'tap_power_level',
    ENERGY_MAX: 'energy_max_level',
    REGEN_RATE: 'regen_rate_level',
    MULTI_TAP:  'multi_tap_level',
    AUTO_BRAIN: 'auto_brain_level',
  };
  return profile[map[upgradeKey]];
}

function buildUpgradeList(profile) {
  return Object.entries(TAPPER_UPGRADES).map(([type, cfg]) => {
    const currentLevel = levelFor(type, profile);
    const isMaxed = currentLevel >= cfg.maxLevel;
    return {
      type,
      label: cfg.label,
      icon: cfg.icon,
      description: cfg.description,
      unit: cfg.unit,
      currentLevel,
      maxLevel: cfg.maxLevel,
      currentEffect: cfg.getEffect(currentLevel),
      nextEffect: isMaxed ? null : cfg.getEffect(currentLevel + 1),
      cost: isMaxed ? null : cfg.costs[currentLevel + 1],
      isMaxed,
    };
  });
}

async function getOrCreateProfile(client, telegramId) {
  const existing = await client.query(
    'SELECT * FROM tapper_profiles WHERE telegram_id = $1',
    [telegramId]
  );
  if (existing.rows[0]) return existing.rows[0];
  const created = await client.query(
    `INSERT INTO tapper_profiles (telegram_id, last_energy_at, last_seen_at)
     VALUES ($1, $2, $2) RETURNING *`,
    [telegramId, Date.now()]
  );
  return created.rows[0];
}

async function ensureDailyBoss(client) {
  const now = Date.now();
  const active = await client.query(
    'SELECT id FROM boss_fights WHERE ends_at > $1 AND completed = FALSE LIMIT 1',
    [now]
  );
  if (active.rows[0]) return;
  const name = BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)];
  await client.query(
    `INSERT INTO boss_fights (name, hp, max_hp, reward, starts_at, ends_at, created_at)
     VALUES ($1, 100000, 100000, 500, $2, $3, $2)
     ON CONFLICT DO NOTHING`,
    [name, now, now + 24 * 60 * 60 * 1000]
  );
}

async function checkTapperAchievements(client, telegramId, profile) {
  const unlocked = [];
  for (const ach of TAPPER_ACHIEVEMENTS) {
    if (!ach.check(profile)) continue;
    const res = await client.query(
      `INSERT INTO achievements (telegram_id, achievement_key, created_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (telegram_id, achievement_key) DO NOTHING
       RETURNING achievement_key`,
      [telegramId, ach.key, Date.now()]
    );
    if (res.rows[0]) {
      await client.query(
        'UPDATE users SET coins = coins + $1, weekly_coins = weekly_coins + $1 WHERE telegram_id = $2',
        [ach.reward, telegramId]
      );
      unlocked.push(ach);
    }
  }
  return unlocked;
}

// ─── routes ─────────────────────────────────────────────────────────────────

// GET /tapper/me
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;

  const result = await withTransaction(async (client) => {
    await ensureDailyBoss(client);
    const profile = await getOrCreateProfile(client, telegramId);
    const now = Date.now();

    const energyMax  = TAPPER_UPGRADES.ENERGY_MAX.getEffect(profile.energy_max_level);
    const regenRate  = TAPPER_UPGRADES.REGEN_RATE.getEffect(profile.regen_rate_level);
    const energy     = computeEnergy(profile.energy, energyMax, regenRate, profile.last_energy_at);

    // Credit offline BP immediately so the user sees their balance update when they collect
    const offlineBP = computeOfflineBP(profile.auto_brain_level, profile.last_seen_at);
    if (offlineBP > 0) {
      await client.query(
        'UPDATE users SET coins = coins + $1, weekly_coins = weekly_coins + $1 WHERE telegram_id = $2',
        [offlineBP, telegramId]
      );
      await client.query(
        'UPDATE tapper_profiles SET total_bp_earned = total_bp_earned + $1, last_seen_at = $2 WHERE telegram_id = $3',
        [offlineBP, now, telegramId]
      );
    }

    const boss = await client.query(
      `SELECT b.*, bp.damage AS my_damage
       FROM boss_fights b
       LEFT JOIN boss_participants bp ON bp.boss_id = b.id AND bp.telegram_id = $1
       WHERE b.ends_at > $2 AND b.completed = FALSE
       ORDER BY b.starts_at DESC LIMIT 1`,
      [telegramId, now]
    );

    return {
      energy,
      energyMax,
      regenRate,
      tapPower:        TAPPER_UPGRADES.TAP_POWER.getEffect(profile.tap_power_level),
      multiTap:        TAPPER_UPGRADES.MULTI_TAP.getEffect(profile.multi_tap_level),
      autoBrainPerMin: TAPPER_UPGRADES.AUTO_BRAIN.getEffect(profile.auto_brain_level),
      levels: {
        tapPower:  profile.tap_power_level,
        energyMax: profile.energy_max_level,
        regenRate: profile.regen_rate_level,
        multiTap:  profile.multi_tap_level,
        autoBrain: profile.auto_brain_level,
      },
      totalTaps:     profile.total_taps,
      totalBpEarned: profile.total_bp_earned,
      prestige:      profile.prestige,
      offlineBP:     offlineBP,
      boss: boss.rows[0] ? {
        id:       boss.rows[0].id,
        name:     boss.rows[0].name,
        hp:       boss.rows[0].hp,
        maxHp:    boss.rows[0].max_hp,
        reward:   boss.rows[0].reward,
        endsAt:   boss.rows[0].ends_at,
        myDamage: boss.rows[0].my_damage || 0,
      } : null,
    };
  });

  res.json(result);
}));

// POST /tapper/tap
router.post('/tap', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const count = parseInt(req.body.count, 10);
  if (!count || count < 1 || count > 10_000) {
    return res.status(400).json({ error: 'Invalid tap count' });
  }

  const result = await withTransaction(async (client) => {
    const profile = await getOrCreateProfile(client, telegramId);

    const energyMax = TAPPER_UPGRADES.ENERGY_MAX.getEffect(profile.energy_max_level);
    const regenRate = TAPPER_UPGRADES.REGEN_RATE.getEffect(profile.regen_rate_level);
    const tapPower  = TAPPER_UPGRADES.TAP_POWER.getEffect(profile.tap_power_level);
    const multiTap  = TAPPER_UPGRADES.MULTI_TAP.getEffect(profile.multi_tap_level);
    const now       = Date.now();

    // Anti-cheat: cap by elapsed time since last batch
    const elapsedSec = profile.last_energy_at > 0
      ? (now - profile.last_energy_at) / 1000
      : 999;
    const maxClicks = Math.max(1, Math.floor(elapsedSec * TAPPER_MAX_TAPS_PER_SEC));
    const effectiveClicks = Math.min(count, maxClicks);

    const currentEnergy = computeEnergy(profile.energy, energyMax, regenRate, profile.last_energy_at);
    const energyUsed = Math.min(effectiveClicks * multiTap, currentEnergy);

    if (energyUsed === 0) {
      return { bpEarned: 0, energy: currentEnergy, energyMax, isCrit: false, unlockedAchievements: [] };
    }

    const isCrit   = Math.random() < TAPPER_CRIT_CHANCE;
    const bpEarned = Math.floor(energyUsed * tapPower * (isCrit ? 10 : 1));
    const newEnergy = currentEnergy - energyUsed;

    await client.query(
      `UPDATE tapper_profiles SET
         energy = $1, last_energy_at = $2, last_seen_at = $2,
         total_taps = total_taps + $3,
         total_bp_earned = total_bp_earned + $4
       WHERE telegram_id = $5`,
      [newEnergy, now, energyUsed, bpEarned, telegramId]
    );
    await client.query(
      'UPDATE users SET coins = coins + $1, weekly_coins = weekly_coins + $1 WHERE telegram_id = $2',
      [bpEarned, telegramId]
    );
    await client.query(
      'INSERT INTO tap_batches (telegram_id, tap_count, bp_earned, created_at) VALUES ($1, $2, $3, $4)',
      [telegramId, energyUsed, bpEarned, now]
    );

    const updatedProfile = await client.query(
      'SELECT * FROM tapper_profiles WHERE telegram_id = $1', [telegramId]
    );
    const unlockedAchievements = await checkTapperAchievements(client, telegramId, updatedProfile.rows[0]);

    return { bpEarned, energy: newEnergy, energyMax, isCrit, unlockedAchievements };
  });

  res.json(result);
}));

// GET /tapper/upgrades
router.get('/upgrades', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { rows } = await pool.query(
    'SELECT * FROM tapper_profiles WHERE telegram_id = $1', [telegramId]
  );
  const profile = rows[0] || { tap_power_level: 0, energy_max_level: 0, regen_rate_level: 0, multi_tap_level: 0, auto_brain_level: 0 };
  res.json({ upgrades: buildUpgradeList(profile) });
}));

// POST /tapper/upgrade
router.post('/upgrade', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { type } = req.body;

  if (!TAPPER_UPGRADES[type]) return res.status(400).json({ error: 'Unknown upgrade type' });

  const result = await withTransaction(async (client) => {
    const profile = await getOrCreateProfile(client, telegramId);
    const cfg = TAPPER_UPGRADES[type];
    const colMap = {
      TAP_POWER:  'tap_power_level',
      ENERGY_MAX: 'energy_max_level',
      REGEN_RATE: 'regen_rate_level',
      MULTI_TAP:  'multi_tap_level',
      AUTO_BRAIN: 'auto_brain_level',
    };
    const col = colMap[type];
    const currentLevel = profile[col];

    if (currentLevel >= cfg.maxLevel) return { error: 'Already at max level' };

    const cost = cfg.costs[currentLevel + 1];
    const user = await client.query('SELECT coins FROM users WHERE telegram_id = $1', [telegramId]);
    if (user.rows[0].coins < cost) return { error: 'Not enough coins' };

    await client.query('UPDATE users SET coins = coins - $1 WHERE telegram_id = $2', [cost, telegramId]);
    await client.query(
      `UPDATE tapper_profiles SET ${col} = ${col} + 1 WHERE telegram_id = $1`,
      [telegramId]
    );

    const updated = await client.query('SELECT * FROM tapper_profiles WHERE telegram_id = $1', [telegramId]);
    return { success: true, upgrades: buildUpgradeList(updated.rows[0]) };
  });

  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

// POST /tapper/prestige
router.post('/prestige', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;

  const result = await withTransaction(async (client) => {
    const profile = await getOrCreateProfile(client, telegramId);
    if (profile.total_taps < TAPPER_PRESTIGE_THRESHOLD) {
      return { error: `Need ${TAPPER_PRESTIGE_THRESHOLD.toLocaleString()} total taps to prestige` };
    }
    await client.query(
      `UPDATE tapper_profiles SET
         energy = 1000, last_energy_at = $1,
         tap_power_level = 0, energy_max_level = 0, regen_rate_level = 0,
         multi_tap_level = 0, auto_brain_level = 0,
         prestige = prestige + 1
       WHERE telegram_id = $2`,
      [Date.now(), telegramId]
    );
    const unlocked = await checkTapperAchievements(client, telegramId,
      { ...profile, prestige: profile.prestige + 1 }
    );
    return { success: true, unlockedAchievements: unlocked };
  });

  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

// GET /tapper/leaderboard
router.get('/leaderboard', asyncHandler(async (req, res) => {
  const now = Date.now();
  const todayStart = new Date(); todayStart.setUTCHours(0,0,0,0);

  const [allTime, daily] = await Promise.all([
    pool.query(`
      SELECT u.telegram_id, u.username, u.level, tp.total_taps, tp.prestige
      FROM tapper_profiles tp
      JOIN users u ON u.telegram_id = tp.telegram_id
      WHERE tp.total_taps > 0
      ORDER BY tp.total_taps DESC LIMIT 20
    `),
    pool.query(`
      SELECT tb.telegram_id, u.username, u.level, SUM(tb.tap_count)::BIGINT AS taps_today
      FROM tap_batches tb
      JOIN users u ON u.telegram_id = tb.telegram_id
      WHERE tb.created_at >= $1
      GROUP BY tb.telegram_id, u.username, u.level
      ORDER BY taps_today DESC LIMIT 20
    `, [todayStart.getTime()]),
  ]);

  res.json({
    allTime: allTime.rows.map((r, i) => ({ rank: i + 1, ...r })),
    daily:   daily.rows.map((r, i) => ({ rank: i + 1, ...r })),
  });
}));

// GET /tapper/boss
router.get('/boss', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { rows } = await pool.query(
    `SELECT b.*, bp.damage AS my_damage
     FROM boss_fights b
     LEFT JOIN boss_participants bp ON bp.boss_id = b.id AND bp.telegram_id = $1
     WHERE b.ends_at > $2 AND b.completed = FALSE
     ORDER BY b.starts_at DESC LIMIT 1`,
    [telegramId, Date.now()]
  );
  res.json({ boss: rows[0] ? {
    id:       rows[0].id,
    name:     rows[0].name,
    hp:       rows[0].hp,
    maxHp:    rows[0].max_hp,
    reward:   rows[0].reward,
    endsAt:   rows[0].ends_at,
    myDamage: rows[0].my_damage || 0,
  } : null });
}));

// POST /tapper/boss/tap
router.post('/boss/tap', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const bossId = parseInt(req.body.bossId, 10);
  const count  = parseInt(req.body.count, 10);

  if (!bossId || !count || count < 1 || count > 5000) {
    return res.status(400).json({ error: 'Invalid params' });
  }

  const result = await withTransaction(async (client) => {
    const boss = await client.query(
      'SELECT * FROM boss_fights WHERE id = $1 FOR UPDATE', [bossId]
    );
    if (!boss.rows[0] || boss.rows[0].completed || boss.rows[0].ends_at <= Date.now()) {
      return { error: 'Boss fight not active' };
    }

    const profile  = await getOrCreateProfile(client, telegramId);
    const energyMax = TAPPER_UPGRADES.ENERGY_MAX.getEffect(profile.energy_max_level);
    const regenRate = TAPPER_UPGRADES.REGEN_RATE.getEffect(profile.regen_rate_level);
    const tapPower  = TAPPER_UPGRADES.TAP_POWER.getEffect(profile.tap_power_level);
    const now = Date.now();

    const currentEnergy = computeEnergy(profile.energy, energyMax, regenRate, profile.last_energy_at);
    const energyUsed = Math.min(count, currentEnergy);
    if (energyUsed === 0) return { error: 'No energy' };

    const damage    = energyUsed * tapPower;
    const newBossHp = Math.max(0, boss.rows[0].hp - damage);
    const killed    = newBossHp === 0;

    await client.query('UPDATE boss_fights SET hp = $1, completed = $2 WHERE id = $3', [newBossHp, killed, bossId]);
    await client.query(
      `INSERT INTO boss_participants (boss_id, telegram_id, damage)
       VALUES ($1, $2, $3)
       ON CONFLICT (boss_id, telegram_id) DO UPDATE SET damage = boss_participants.damage + $3`,
      [bossId, telegramId, damage]
    );
    await client.query(
      `UPDATE tapper_profiles SET energy = $1, last_energy_at = $2, last_seen_at = $2,
         total_taps = total_taps + $3 WHERE telegram_id = $4`,
      [currentEnergy - energyUsed, now, energyUsed, telegramId]
    );

    let myReward = 0;
    if (killed) {
      const participants = await client.query(
        'SELECT * FROM boss_participants WHERE boss_id = $1 AND rewarded = FALSE', [bossId]
      );
      const totalDamage = participants.rows.reduce((s, p) => s + p.damage, 0);
      const bossReward  = boss.rows[0].reward;

      for (const p of participants.rows) {
        const share = Math.floor((p.damage / totalDamage) * bossReward);
        await client.query(
          'UPDATE users SET coins = coins + $1, weekly_coins = weekly_coins + $1 WHERE telegram_id = $2',
          [share, p.telegram_id]
        );
        await client.query('UPDATE boss_participants SET rewarded = TRUE WHERE id = $1', [p.id]);
        if (p.telegram_id === telegramId) myReward = share;
      }
    }

    return { damage, killed, reward: myReward, energy: currentEnergy - energyUsed, energyMax };
  });

  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

module.exports = router;
