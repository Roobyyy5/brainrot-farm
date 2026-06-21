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
  leaderboard: () => request('/leaderboard'),
  referral: () => request('/referral'),
};
