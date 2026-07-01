const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { logEvent } = require('../events');
const {
  TAPPER_UPGRADES,
  TAPPER_MAX_TAPS_PER_SEC,
  TAPPER_MAX_OFFLINE_HOURS,
  TAPPER_PRESTIGE_THRESHOLD,
  TAPPER_CRIT_CHANCE,
  TAPPER_ACHIEVEMENTS,
  BOSS_NAMES,
  rankForTaps,
  TAP_STREAK_BONUS_PCT,
  TAP_STREAK_MAX_DAYS,
  BRAIN_SKINS,
  SKILL_POINTS_PER_TAPS,
  BATTLE_PASS_XP_PER_ENERGY,
  TALENTS,
  getPetBonuses,
  WORLD_ZONES,
  PRESTIGE_SHOP,
  getCurrentWeeklyEvent,
  TAP_RUSH_MULTIPLIER,
} = require('../gameConfig');

// Build skill-level map for a user (key → level)
async function getUserSkills(client, telegramId) {
  const { rows } = await client.query('SELECT skill_key, level FROM user_skills WHERE telegram_id=$1', [telegramId]);
  const map = {};
  for (const r of rows) map[r.skill_key] = r.level;
  return map;
}

// Compute effective stat bonuses from skills + talents
function skillBonuses(skills, talents) {
  const t = new Set(talents || []);
  return {
    extraTapPower: skills.tap_force || 0,
    extraCritChance: (skills.crit_chance || 0) * 0.03 + (t.has('crit_storm') ? 0.10 : 0),
    critMultiplier: 10 + (skills.crit_multi || 0) * 5,
    extraEnergyMax: (skills.energy_cap || 0) * 500 + (t.has('energy_god') ? 1000 : 0),
    extraRegen: skills.regen_boost || 0,
    efficiencyPct: (skills.efficiency || 0) * 10,
    gemDropChance: (skills.gem_drops || 0) * 0.015 + (t.has('gem_magnet') ? 0.05 : 0),
    cardBoostPct: (skills.card_boost || 0) * 15,
    offlineAmpPct: (skills.offline_amp || 0) * 25,
    bossLootBoostPct: (skills.boss_loot || 0) * 25 + (t.has('boss_slayer') ? 100 : 0),
    skillRegenPerTap: skills.skill_regen || 0,
    passiveLord: t.has('passive_lord'),
    autoMaster: t.has('auto_master'),
    eternalStreak: t.has('eternal_streak'),
    doubleGlory: t.has('double_glory'),
  };
}
const { computeCardOfflineIncome } = require('./cards');

const router = express.Router();

// ─── helpers ────────────────────────────────────────────────────────────────

async function getPrestigeUpgrades(client, telegramId) {
  const { rows } = await client.query('SELECT upgrade_key, level FROM prestige_upgrades WHERE telegram_id=$1', [telegramId]);
  const map = {};
  for (const r of rows) map[r.upgrade_key] = r.level;
  return map;
}

function prestigeBonuses(upgrades) {
  return {
    extraTapPower: upgrades.eternal_tap || 0,
    extraEnergyBase: (upgrades.vast_energy || 0) * 500,
    extraGemDrop: (upgrades.gem_vault || 0) * 0.01,
    incomePct: (upgrades.prestige_aura || 0) * 10,
  };
}

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

    const skills = await getUserSkills(client, telegramId);
    const bonuses = skillBonuses(skills, profile.talents_chosen || []);
    const petB = getPetBonuses(profile.active_pet || '');
    const pUpgrades = await getPrestigeUpgrades(client, telegramId);
    const pBonuses = prestigeBonuses(pUpgrades);
    const weeklyEvent = getCurrentWeeklyEvent();
    const zoneData = WORLD_ZONES.find(z => z.zone === (profile.current_zone || 1)) || WORLD_ZONES[0];
    const regenMult = weeklyEvent.effect === 'regenMult' ? weeklyEvent.value : 1;
    const energyMax  = TAPPER_UPGRADES.ENERGY_MAX.getEffect(profile.energy_max_level) + bonuses.extraEnergyMax + (petB.extraEnergy || 0) + pBonuses.extraEnergyBase;
    const regenRate  = Math.floor((TAPPER_UPGRADES.REGEN_RATE.getEffect(profile.regen_rate_level) + bonuses.extraRegen) * regenMult);
    const energy     = computeEnergy(profile.energy, energyMax, regenRate, profile.last_energy_at);

    // Credit all offline passive income atomically
    const autoBrainBP = computeOfflineBP(profile.auto_brain_level, profile.last_seen_at);
    const { income: cardBP, perHour: cardPerHour } = await computeCardOfflineIncome(client, telegramId, profile.last_seen_at);

    // Referral boost applied to card income
    const { rows: refRows } = await client.query(
      `SELECT COUNT(*)::int AS count FROM referrals r
       JOIN users u ON u.telegram_id = r.referred_id
       WHERE r.referrer_id = $1 AND u.has_farmed_once = TRUE`,
      [telegramId]
    );
    const referralBoostPct = refRows[0].count * 2;
    const cardMultiplier = (1 + referralBoostPct / 100) * (1 + bonuses.cardBoostPct / 100) * (bonuses.passiveLord ? 1.5 : 1);
    const offlineMultiplier = 1 + bonuses.offlineAmpPct / 100 + (petB.offlinePct || 0) / 100;
    const boostedCardBP = Math.floor(cardBP * cardMultiplier);
    const boostedAutoBP = Math.floor(autoBrainBP * offlineMultiplier * (bonuses.autoMaster ? 2 : 1));

    // Auto-tapper income (if boost active)
    const autoTapperBoost = await client.query(
      "SELECT expires_at, activated_at FROM user_boosts WHERE telegram_id=$1 AND boost_type='auto_tapper' AND expires_at>$2 ORDER BY expires_at DESC LIMIT 1",
      [telegramId, now]
    );
    let autoTapperBP = 0;
    if (autoTapperBoost.rows[0]) {
      const tapPower = TAPPER_UPGRADES.TAP_POWER.getEffect(profile.tap_power_level);
      const since = Math.min(now, Number(autoTapperBoost.rows[0].expires_at));
      const activated = Number(autoTapperBoost.rows[0].activated_at);
      const lastSeen = profile.last_seen_at || activated;
      const elapsedSec = Math.max(0, (since - Math.max(lastSeen, activated)) / 1000);
      autoTapperBP = Math.floor(elapsedSec * 3 * tapPower); // 3 taps/sec
    }

    const offlineBP = boostedAutoBP + boostedCardBP + autoTapperBP;

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
      tapPower:        Math.floor((TAPPER_UPGRADES.TAP_POWER.getEffect(profile.tap_power_level) + bonuses.extraTapPower + zoneData.tapPowerBonus + pBonuses.extraTapPower) * (1 + (petB.tapPowerPct || 0))),
      multiTap:        TAPPER_UPGRADES.MULTI_TAP.getEffect(profile.multi_tap_level),
      autoBrainPerMin: TAPPER_UPGRADES.AUTO_BRAIN.getEffect(profile.auto_brain_level),
      levels: {
        tapPower:  profile.tap_power_level,
        energyMax: profile.energy_max_level,
        regenRate: profile.regen_rate_level,
        multiTap:  profile.multi_tap_level,
        autoBrain: profile.auto_brain_level,
      },
      totalTaps:        profile.total_taps,
      totalBpEarned:    profile.total_bp_earned,
      prestige:         profile.prestige,
      offlineBP:        offlineBP,
      cardIncomePerHour: Math.floor(cardPerHour * cardMultiplier),
      referralBoostPct,
      skillPoints: profile.skill_points || 0,
      talentPoints: profile.talent_points || 0,
      talentsChosen: profile.talents_chosen || [],
      rank:             rankForTaps(profile.total_taps),
      tapStreak:        profile.tap_streak || 0,
      streakBonusPct:   Math.min((profile.tap_streak || 0) * TAP_STREAK_BONUS_PCT, TAP_STREAK_MAX_DAYS * TAP_STREAK_BONUS_PCT),
      selectedSkin:     profile.selected_skin || 'default',
      skinsUnlocked:    profile.skins_unlocked || [],
      activePet:        profile.active_pet || '',
      currentZone:      zoneData,
      prestigeTokens:   profile.prestige_tokens || 0,
      weeklyEvent,
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

    const skills  = await getUserSkills(client, telegramId);
    const bonuses = skillBonuses(skills, profile.talents_chosen || []);
    const energyMax = TAPPER_UPGRADES.ENERGY_MAX.getEffect(profile.energy_max_level) + bonuses.extraEnergyMax;
    const regenRate = TAPPER_UPGRADES.REGEN_RATE.getEffect(profile.regen_rate_level) + bonuses.extraRegen;
    const tapPower  = TAPPER_UPGRADES.TAP_POWER.getEffect(profile.tap_power_level) + bonuses.extraTapPower;
    const multiTap  = TAPPER_UPGRADES.MULTI_TAP.getEffect(profile.multi_tap_level);
    const now       = Date.now();
    const prevRank  = rankForTaps(profile.total_taps);

    // Anti-cheat: cap by elapsed time since last batch
    const elapsedSec = profile.last_energy_at > 0
      ? (now - profile.last_energy_at) / 1000
      : 999;
    const maxClicks = Math.max(1, Math.floor(elapsedSec * TAPPER_MAX_TAPS_PER_SEC));
    const effectiveClicks = Math.min(count, maxClicks);

    // Efficiency skill: reduce energy cost
    const efficiencyMult = 1 - (bonuses.efficiencyPct / 100);
    const effectiveMultiTap = Math.max(1, Math.floor(multiTap * efficiencyMult));

    const petB2 = getPetBonuses(profile.active_pet || '');
    const zoneData2 = WORLD_ZONES.find(z => z.zone === (profile.current_zone || 1)) || WORLD_ZONES[0];
    const pUpgrades2 = await getPrestigeUpgrades(client, telegramId);
    const pBonuses2 = prestigeBonuses(pUpgrades2);
    const weeklyEvent2 = getCurrentWeeklyEvent();
    const bpMultWeekly = weeklyEvent2.effect === 'bpMult' ? weeklyEvent2.value : 1;
    const gemMultWeekly = weeklyEvent2.effect === 'gemDropMult' ? weeklyEvent2.value : 1;
    const bpXpMultWeekly = weeklyEvent2.effect === 'bpXpMult' ? weeklyEvent2.value : 1;
    const rushActive = Number(profile.rush_active_until || 0) > now;
    const rushMult   = rushActive ? TAP_RUSH_MULTIPLIER : 1;
    // Check active crit_shield boost
    const critShield = await client.query(
      "SELECT 1 FROM user_boosts WHERE telegram_id=$1 AND boost_type='crit_shield' AND expires_at>$2 LIMIT 1",
      [telegramId, Date.now()]
    );
    const currentEnergy = computeEnergy(profile.energy, energyMax, regenRate, profile.last_energy_at);
    const energyUsed = Math.min(effectiveClicks * effectiveMultiTap, currentEnergy);

    if (energyUsed === 0) {
      return { bpEarned: 0, energy: currentEnergy, energyMax, isCrit: false, unlockedAchievements: [] };
    }

    // Tap streak
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(now - 86_400_000).toISOString().slice(0, 10);
    let newStreak = profile.tap_streak || 0;
    if (profile.last_tap_date !== today) {
      const resetStreak = bonuses.eternalStreak ? newStreak : 1;
      newStreak = profile.last_tap_date === yesterday ? newStreak + 1 : resetStreak;
    }
    const streakBonusPct = Math.min(newStreak * TAP_STREAK_BONUS_PCT, TAP_STREAK_MAX_DAYS * TAP_STREAK_BONUS_PCT);

    // Active 2× boost
    const boostRow = await client.query(
      "SELECT id FROM user_boosts WHERE telegram_id=$1 AND boost_type='2x_tap' AND expires_at>$2 LIMIT 1",
      [telegramId, now]
    );
    const boostMultiplier = boostRow.rows[0] ? 2 : 1;

    const baseTapPower = Math.floor((tapPower + zoneData2.tapPowerBonus + pBonuses2.extraTapPower) * (1 + (petB2.tapPowerPct || 0)));
    const incomeMult = 1 + (pBonuses2.incomePct || 0) / 100;
    const effectiveTapPower = baseTapPower * (1 + streakBonusPct / 100) * boostMultiplier * incomeMult * bpMultWeekly * rushMult;
    const critChance = critShield.rows[0] ? 1.0 : TAPPER_CRIT_CHANCE + bonuses.extraCritChance + (petB2.critChancePct || 0);
    const isCrit    = Math.random() < critChance;
    const critMult  = bonuses.critMultiplier;
    const bpEarned  = Math.floor(energyUsed * effectiveTapPower * (isCrit ? critMult : 1));
    const newEnergy = currentEnergy - energyUsed;

    // Gem drop luck (including pet + prestige + weekly event bonuses)
    const gemDropChanceFinal = (bonuses.gemDropChance + (petB2.gemDropPct || 0) + (pBonuses2.extraGemDrop || 0)) * gemMultWeekly;
    const gemDrop = Math.random() < gemDropChanceFinal ? 1 : 0;

    // Track max combo for leaderboard (combo sent from client)
    const clientCombo = parseFloat(req.body?.combo) || 1.0;
    const weekKey = new Date().toISOString().slice(0, 7);
    if (clientCombo > parseFloat(profile.max_combo || 1)) {
      await client.query(
        'UPDATE tapper_profiles SET max_combo=$1, max_combo_week=$2 WHERE telegram_id=$3',
        [clientCombo, weekKey, telegramId]
      ).catch(() => {});
    }

    // Skill points earned
    const skillPtsEarned = Math.floor(energyUsed / SKILL_POINTS_PER_TAPS)
      + Math.floor(energyUsed * (bonuses.skillRegenPerTap / 25));

    // Battle Pass XP (with weekly event multiplier)
    const bpXpEarned = Math.floor(energyUsed * BATTLE_PASS_XP_PER_ENERGY * bpXpMultWeekly);

    // Schedule energy-full notification
    const energyNotifAt  = newEnergy < energyMax
      ? now + Math.ceil((energyMax - newEnergy) / regenRate) * 1000
      : 0;

    await client.query(
      `UPDATE tapper_profiles SET
         energy = $1, last_energy_at = $2, last_seen_at = $2,
         total_taps = total_taps + $3,
         total_bp_earned = total_bp_earned + $4,
         tap_streak = $5, last_tap_date = $6,
         energy_notif_at = $7, energy_notif_sent = FALSE,
         skill_points = skill_points + $9,
         bp_xp = bp_xp + $10
       WHERE telegram_id = $8`,
      [newEnergy, now, energyUsed, bpEarned, newStreak, today, energyNotifAt, telegramId, skillPtsEarned, bpXpEarned]
    );
    if (gemDrop > 0) {
      await client.query('UPDATE users SET gems=gems+$1 WHERE telegram_id=$2', [gemDrop, telegramId]);
    }
    await client.query(
      'UPDATE users SET coins = coins + $1, weekly_coins = weekly_coins + $1 WHERE telegram_id = $2',
      [bpEarned, telegramId]
    );
    await client.query(
      'INSERT INTO tap_batches (telegram_id, tap_count, bp_earned, created_at) VALUES ($1, $2, $3, $4)',
      [telegramId, energyUsed, bpEarned, now]
    );
    // Add to active tournament score (fire-and-forget)
    const { addTournamentScore } = require('./tournament');
    addTournamentScore(telegramId.toString(), bpEarned).catch(() => {});

    // Season BP tracking
    if (bpEarned > 0) {
      await client.query('UPDATE tapper_profiles SET season_bp = season_bp + $1 WHERE telegram_id = $2', [bpEarned, telegramId]);
      if (rushActive) {
        const rushWk = 'W' + Math.floor(now / (7 * 24 * 60 * 60 * 1000));
        await client.query(`
          UPDATE tapper_profiles SET
            rush_week_score = CASE WHEN rush_week_key = $2 THEN rush_week_score + $1 ELSE $1 END,
            rush_week_key = $2
          WHERE telegram_id = $3
        `, [bpEarned, rushWk, telegramId]);
      }
    }

    const updatedProfile = await client.query(
      'SELECT * FROM tapper_profiles WHERE telegram_id = $1', [telegramId]
    );
    const unlockedAchievements = await checkTapperAchievements(client, telegramId, updatedProfile.rows[0]);
    const newRank = rankForTaps(updatedProfile.rows[0].total_taps);
    const rankUp = newRank.name !== prevRank.name ? newRank : null;

    return {
      bpEarned, energy: newEnergy, energyMax, isCrit, critMult, unlockedAchievements,
      streakBonusPct, boostActive: !!boostRow.rows[0],
      gemDrop, skillPtsEarned, rankUp,
    };
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
    logEvent(telegramId, 'tapper_upgrade');

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
         prestige = prestige + 1,
         talent_points = talent_points + 1,
         prestige_tokens = prestige_tokens + 1
       WHERE telegram_id = $2`,
      [Date.now(), telegramId]
    );
    const unlocked = await checkTapperAchievements(client, telegramId,
      { ...profile, prestige: profile.prestige + 1 }
    );
    // Offer 3 random talent choices the user doesn't yet have
    const chosen = profile.talents_chosen || [];
    const available = TALENTS.filter((t) => !chosen.includes(t.key));
    const shuffled = available.sort(() => Math.random() - 0.5).slice(0, 3);
    return { success: true, unlockedAchievements: unlocked, talentChoices: shuffled };
  });

  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

// GET /tapper/talents
router.get('/talents', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { rows } = await pool.query(
    'SELECT talent_points, talents_chosen FROM tapper_profiles WHERE telegram_id=$1', [telegramId]
  );
  const talent_points = rows[0]?.talent_points || 0;
  const chosen = rows[0]?.talents_chosen || [];
  const available = TALENTS.filter((t) => !chosen.includes(t.key));
  res.json({
    talentPoints: talent_points,
    talents: TALENTS.map((t) => ({ ...t, owned: chosen.includes(t.key) })),
    choices: talent_points > 0 ? available.sort(() => Math.random() - 0.5).slice(0, 3) : [],
  });
}));

// POST /tapper/talent
router.post('/talent', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { talentKey } = req.body;
  if (!TALENTS.find((t) => t.key === talentKey)) return res.status(400).json({ error: 'Unknown talent' });

  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT talent_points, talents_chosen FROM tapper_profiles WHERE telegram_id=$1 FOR UPDATE', [telegramId]
    );
    if (!rows[0] || rows[0].talent_points < 1) return { error: 'No talent points' };
    if ((rows[0].talents_chosen || []).includes(talentKey)) return { error: 'Already have this talent' };
    await client.query(
      `UPDATE tapper_profiles SET
         talent_points = talent_points - 1,
         talents_chosen = array_append(talents_chosen, $1)
       WHERE telegram_id = $2`,
      [talentKey, telegramId]
    );
    return { success: true };
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
