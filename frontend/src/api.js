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
    tap: (count) => request('/tapper/tap', { method: 'POST', body: { count } }),
    upgrades: () => request('/tapper/upgrades'),
    upgrade: (type) => request('/tapper/upgrade', { method: 'POST', body: { type } }),
    prestige: () => request('/tapper/prestige', { method: 'POST' }),
    leaderboard: () => request('/tapper/leaderboard'),
    boss: () => request('/tapper/boss'),
    bossTap: (bossId, count) => request('/tapper/boss/tap', { method: 'POST', body: { bossId, count } }),
  },
};
