import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

const RUSH_DURATION = 30;

export default function TapRush() {
  const [data, setData] = useState(null);
  const [rushSecondsLeft, setRushSecondsLeft] = useState(0);
  const [starting, setStarting] = useState(false);
  const [cooldownStr, setCooldownStr] = useState('');
  const timerRef = useRef(null);

  const load = () => api.taprush.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!data) return;
    clearInterval(timerRef.current);

    if (data.active) {
      const tick = () => {
        const left = Math.max(0, Math.ceil((data.activeUntil - Date.now()) / 1000));
        setRushSecondsLeft(left);
        if (left <= 0) { load(); clearInterval(timerRef.current); }
      };
      tick();
      timerRef.current = setInterval(tick, 500);
    } else if (data.cooldownMs > 0) {
      const tick = () => {
        const ms = Math.max(0, data.cooldownMs - (Date.now() - (Date.now() - data.cooldownMs)));
        // Recalculate from data.cooldownMs stored at load time
        const remaining = Math.max(0, data.cooldownMs - (Date.now() - loadedAt.current));
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setCooldownStr(`${h}h ${m}m ${s}s`);
        if (remaining <= 0) { load(); clearInterval(timerRef.current); }
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [data]);

  const loadedAt = useRef(Date.now());
  useEffect(() => { loadedAt.current = Date.now(); }, [data]);

  const handleStart = async () => {
    setStarting(true);
    try { await api.taprush.start(); load(); }
    catch (err) { alert(err.message); }
    finally { setStarting(false); }
  };

  const fmtCooldown = () => {
    if (!data || data.cooldownMs <= 0) return '';
    const elapsed = Date.now() - loadedAt.current;
    const remaining = Math.max(0, data.cooldownMs - elapsed);
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  if (!data) return null;

  return (
    <div className="taprush-section">
      <div className="taprush-header">⚡ Tap Rush</div>
      <div className="taprush-sub">30 seconds of ×{data.multiplier} tap power!</div>

      {data.active ? (
        <div className="taprush-active">
          <div className="taprush-timer">{rushSecondsLeft}s</div>
          <div className="taprush-active-label">🔥 RUSH ACTIVE — Tap like crazy!</div>
          <div className="taprush-bar-wrap">
            <div className="taprush-bar" style={{ width: `${(rushSecondsLeft / RUSH_DURATION) * 100}%` }} />
          </div>
        </div>
      ) : (
        <button
          className="taprush-btn"
          onClick={handleStart}
          disabled={starting || data.cooldownMs > 0}
        >
          {starting ? '...' : data.cooldownMs > 0 ? `Cooldown: ${fmtCooldown()}` : '⚡ START RUSH!'}
        </button>
      )}

      <div className="taprush-stats">
        <span>📅 Week Score: <b>{data.weekScore.toLocaleString()} BP</b></span>
      </div>

      {data.leaderboard?.length > 0 && (
        <div className="taprush-lb">
          <div className="taprush-lb-title">🏆 Weekly Rush Leaderboard</div>
          {data.leaderboard.map(r => (
            <div key={r.rank} className="taprush-lb-row">
              <span className="taprush-lb-rank">#{r.rank}</span>
              <span className="taprush-lb-name">{r.username}</span>
              <span className="taprush-lb-score">{r.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
