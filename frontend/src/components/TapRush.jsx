import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';
import { toastError, toastSuccess } from '../toast';

const RUSH_DURATION = 30;

export default function TapRush() {
  const t = useT();
  const [data, setData] = useState(null);
  const [rushSecondsLeft, setRushSecondsLeft] = useState(0);
  const [starting, setStarting] = useState(false);
  const [cooldownStr, setCooldownStr] = useState('');
  const timerRef = useRef(null);
  const loadedAt = useRef(Date.now());

  const load = () => api.taprush.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => { loadedAt.current = Date.now(); }, [data]);

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

  const handleStart = async () => {
    setStarting(true);
    try { await api.taprush.start(); load(); }
    catch (err) { toastError(err.message); }
    finally { setStarting(false); }
  };

  if (!data) return null;

  return (
    <div className="taprush-section">
      <div className="taprush-header">{t('tap_rush_title')}</div>
      <div className="taprush-sub">{t('tap_rush_sub', { n: data.multiplier })}</div>

      {data.active ? (
        <div className="taprush-active">
          <div className="taprush-timer">{rushSecondsLeft}s</div>
          <div className="taprush-active-label">{t('tap_rush_active')}</div>
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
          {starting ? '...' : data.cooldownMs > 0 ? t('tap_rush_cooldown', { time: cooldownStr }) : t('tap_rush_btn')}
        </button>
      )}

      <div className="taprush-stats">
        <span>{t('tap_rush_week', { n: data.weekScore.toLocaleString() })}</span>
      </div>

      {data.leaderboard?.length > 0 && (
        <div className="taprush-lb">
          <div className="taprush-lb-title">{t('tap_rush_lb')}</div>
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
