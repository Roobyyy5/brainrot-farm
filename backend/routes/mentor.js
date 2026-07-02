const express = require('express');
const { pool, withTransaction } = require('../db');
const { asyncHandler } = require('../asyncHandler');
const { MENTOR_MAX_APPRENTICES, MENTOR_MILESTONES, MENTOR_BONUS_PCT } = require('../gameConfig');

const router = express.Router();

// GET /mentor
router.get('/', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;

  const [mentorRes, appRes] = await Promise.all([
    pool.query(
      `SELECT mr.*, u.username as apprentice_username
       FROM mentor_relations mr
       JOIN users u ON u.telegram_id = mr.apprentice_id
       WHERE mr.mentor_id = $1
       ORDER BY mr.joined_at DESC`,
      [telegramId]
    ),
    pool.query(
      `SELECT mr.*, u.username as mentor_username
       FROM mentor_relations mr
       JOIN users u ON u.telegram_id = mr.mentor_id
       WHERE mr.apprentice_id = $1`,
      [telegramId]
    ),
  ]);

  const apprentices = mentorRes.rows.map(r => ({
    telegramId: r.apprentice_id,
    username: r.apprentice_username,
    teachingXp: Number(r.teaching_xp),
    joinedAt: Number(r.joined_at),
  }));

  const myMentor = appRes.rows[0] ? {
    telegramId: appRes.rows[0].mentor_id,
    username: appRes.rows[0].mentor_username,
    joinedAt: Number(appRes.rows[0].joined_at),
    bonusPct: MENTOR_BONUS_PCT,
  } : null;

  const totalTeachingXp = apprentices.reduce((s, a) => s + a.teachingXp, 0);
  const nextMilestone = MENTOR_MILESTONES.find(m => m.xp > totalTeachingXp) || null;

  res.json({
    apprentices,
    myMentor,
    maxApprentices: MENTOR_MAX_APPRENTICES,
    totalTeachingXp,
    milestones: MENTOR_MILESTONES,
    nextMilestone,
    bonusPct: MENTOR_BONUS_PCT,
  });
}));

// POST /mentor/take — add apprentice by username
router.post('/take', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });

  return withTransaction(async (client) => {
    const { rows: [target] } = await client.query(
      'SELECT telegram_id FROM users WHERE username=$1', [username]
    );
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.telegram_id === telegramId) return res.status(400).json({ error: 'Cannot mentor yourself' });

    const { rows: [cnt] } = await client.query(
      'SELECT count(*) c FROM mentor_relations WHERE mentor_id=$1', [telegramId]
    );
    if (Number(cnt.c) >= MENTOR_MAX_APPRENTICES) {
      return res.status(400).json({ error: `Max ${MENTOR_MAX_APPRENTICES} apprentices` });
    }

    const { rows: existing } = await client.query(
      'SELECT 1 FROM mentor_relations WHERE apprentice_id=$1', [target.telegram_id]
    );
    if (existing.length > 0) return res.status(400).json({ error: 'User already has a mentor' });

    await client.query(
      `INSERT INTO mentor_relations (mentor_id, apprentice_id, joined_at) VALUES ($1,$2,$3)`,
      [telegramId, target.telegram_id, Date.now()]
    );
    return res.json({ ok: true, apprenticeUsername: username });
  });
}));

// POST /mentor/resign — resign as apprentice
router.post('/resign', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { rows } = await pool.query(
    'DELETE FROM mentor_relations WHERE apprentice_id=$1 RETURNING id', [telegramId]
  );
  if (!rows[0]) return res.status(400).json({ error: 'No mentor to resign from' });
  res.json({ ok: true });
}));

// POST /mentor/remove — remove an apprentice (as mentor)
router.post('/remove', asyncHandler(async (req, res) => {
  const telegramId = req.tgUser.id;
  const { apprenticeId } = req.body;
  const { rows } = await pool.query(
    'DELETE FROM mentor_relations WHERE mentor_id=$1 AND apprentice_id=$2 RETURNING id',
    [telegramId, apprenticeId]
  );
  if (!rows[0]) return res.status(400).json({ error: 'Apprentice not found' });
  res.json({ ok: true });
}));

// Internal: add teaching XP when apprentice taps
async function addTeachingXp(apprenticeId, taps) {
  try {
    const xpToAdd = Math.floor(taps / 100);
    if (xpToAdd <= 0) return;
    await pool.query(
      `UPDATE mentor_relations SET teaching_xp = teaching_xp + $1 WHERE apprentice_id = $2`,
      [xpToAdd, apprenticeId]
    );
  } catch (_) {}
}

module.exports = { router, addTeachingXp };
