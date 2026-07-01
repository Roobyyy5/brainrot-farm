import { getInitData } from './telegram';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const initData = getInitData();
  if (initData) headers['x-telegram-init-data'] = initData;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  register: (ref) => request('/register', { method: 'POST', body: { ref } }),
  farm: () => request('/farm', { method: 'POST' }),
  boost: () => request('/boost', { method: 'POST' }),
  daily: () => request('/daily', { method: 'POST' }),
  leaderboard: (period) => request(`/leaderboard${period === 'weekly' ? '?period=weekly' : ''}`),
  referral: () => request('/referral'),
  achievements: () => request('/achievements'),

  tapper: {
    me: () => request('/tapper'),
    tap: (count, combo) => request('/tapper/tap', { method: 'POST', body: { count, combo } }),
    upgrades: () => request('/tapper/upgrades'),
    upgrade: (type) => request('/tapper/upgrade', { method: 'POST', body: { type } }),
    prestige: () => request('/tapper/prestige', { method: 'POST' }),
    leaderboard: () => request('/tapper/leaderboard'),
    boss: () => request('/tapper/boss'),
    bossTap: (bossId, count) => request('/tapper/boss/tap', { method: 'POST', body: { bossId, count } }),
    talents: () => request('/tapper/talents'),
    chooseTalent: (talentKey) => request('/tapper/talent', { method: 'POST', body: { talentKey } }),
  },

  cards: {
    list: () => request('/cards'),
    buy: (key) => request('/cards/buy', { method: 'POST', body: { key } }),
  },

  wheel: {
    status: () => request('/wheel'),
    spin: () => request('/wheel/spin', { method: 'POST' }),
  },

  missions: {
    list: () => request('/missions'),
    claim: (key) => request('/missions/claim', { method: 'POST', body: { key } }),
  },

  gemshop: {
    status: () => request('/gemshop'),
    buy: (key) => request('/gemshop/buy', { method: 'POST', body: { key } }),
    equipSkin: (skin) => request('/gemshop/skin', { method: 'POST', body: { skin } }),
  },

  skills: {
    list: () => request('/skills'),
    upgrade: (skillKey) => request('/skills/upgrade', { method: 'POST', body: { skillKey } }),
  },

  battlepass: {
    status: () => request('/battlepass'),
    claim: (level, premium) => request('/battlepass/claim', { method: 'POST', body: { level, premium } }),
    buyPremium: () => request('/battlepass/buy-premium', { method: 'POST' }),
  },

  loginstreak: {
    status: () => request('/loginstreak'),
    claim: () => request('/loginstreak/claim', { method: 'POST' }),
  },

  guilds: {
    my: () => request('/guilds/my'),
    search: (q) => request(`/guilds/search?q=${encodeURIComponent(q)}`),
    create: (name, tag, description) => request('/guilds/create', { method: 'POST', body: { name, tag, description } }),
    join: (guildId) => request('/guilds/join', { method: 'POST', body: { guildId } }),
    leave: () => request('/guilds/leave', { method: 'POST' }),
    bossTap: (count) => request('/guilds/boss/tap', { method: 'POST', body: { count } }),
  },

  duels: {
    list: () => request('/duels'),
    challenge: (username, stakeGems) => request('/duels/challenge', { method: 'POST', body: { username, stakeGems } }),
    accept: (duelId) => request('/duels/accept', { method: 'POST', body: { duelId } }),
    decline: (duelId) => request('/duels/decline', { method: 'POST', body: { duelId } }),
    tap: (duelId, bp) => request('/duels/tap', { method: 'POST', body: { duelId, bp } }),
    resolve: (duelId) => request('/duels/resolve', { method: 'POST', body: { duelId } }),
  },

  dailyshop: {
    status: () => request('/dailyshop'),
    buy: (itemKey) => request('/dailyshop/buy', { method: 'POST', body: { itemKey } }),
  },

  pets: {
    list: () => request('/pets'),
    equip: (petKey) => request('/pets/equip', { method: 'POST', body: { petKey } }),
  },

  worlds: {
    list: () => request('/worlds'),
    advance: () => request('/worlds/advance', { method: 'POST' }),
  },

  profile: {
    get: (telegramId) => request(`/profile/${telegramId}`),
  },

  comboboard: {
    list: () => request('/comboboard'),
  },

  guildwars: {
    status: () => request('/guildwars'),
  },
};
