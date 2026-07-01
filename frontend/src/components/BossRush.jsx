import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function BossRush() {
  const [session, setSession] = useState(undefined);
  const [waves, setWaves] = useState([]);
  const [tapping, setTapping] = useState(false);
  const [acting, setActing] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const pendingTaps = useRef(0);
  const flushTimer = useRef(null);

  const load = () => api.bossrush.status().then(d => {
    setSession(d.session);
    setWaves(d.waves || []);
  }).catch(() => {});

  useEffect(() => { load(); }, []);
  useEffect(() => () => clearTimeout(flushTimer.current), []);

  const flush = async () => {
    const count = pendingTaps.current;
    if (!count || !session) return;
    pendingTaps.current = 0;
    try {
      const res = await api.bossrush.tap(count);
      setLastResult(res);
      if (res.nextWave) {
        setSession(s => s ? { ...s, wave: res.nextWave.wave, bossName: res.nextWave.bossName, bossHp: res.nextWave.bossHp, bossMaxHp: res.nextWave.bossMaxHp } : s);
      } else if (res.completed) {
        setSession(null);
        load();
      } else {
        setSession(s => s ? { ...s, bossHp: res.newHp } : s);
      }
    } catch {}
  };

  const handleTap = () => {
    if (!session) return;
    pendingTaps.current += 1;
    setSession(s => s ? { ...s, bossHp: Math.max(0, s.bossHp - 1) } : s);
    setTapping(true);
    setTimeout(() => setTapping(false), 80);
    clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flush, 600);
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); } catch {}
  };

  const handleStart = async () => {
    if (acting) return;
    setActing(true);
    try { await api.bossrush.start(); load(); } catch (err) { alert(err.message); }
    finally { setActing(false); }
  };

  const handleAbandon = async () => {
    if (!window.confirm('Abandon this run? Progress is lost.')) return;
    await api.bossrush.abandon();
    setSession(null);
    setLastResult(null);
  };

  if (session === undefined) return null;

  if (!session) {
    return (
      <div className="bossrush-section">
        <div className="bossrush-header">👾 Boss Rush</div>
        <div className="bossrush-sub">Defeat 10 escalating bosses for massive BP and gem rewards!</div>
        {lastResult?.completed && (
          <div className="bossrush-complete">🏆 Run Complete! Check your rewards!</div>
        )}
        <div className="bossrush-wave-preview">
          {waves.slice(0, 5).map(w => (
            <div key={w.wave} className="bossrush-wave-chip">
              Wave {w.wave}<br />
              <span style={{ fontSize: 10 }}>💰{w.bpReward}{w.gemReward > 0 ? ` 💎${w.gemReward}` : ''}</span>
            </div>
          ))}
          <div className="bossrush-wave-chip" style={{ opacity: 0.5 }}>…</div>
        </div>
        <button className="bossrush-start-btn" onClick={handleStart} disabled={acting}>
          {acting ? '...' : '⚔️ Start Boss Rush'}
        </button>
      </div>
    );
  }

  const hpPct = (session.bossHp / session.bossMaxHp) * 100;

  return (
    <div className="bossrush-section bossrush-active">
      <div className="bossrush-header">👾 Boss Rush — Wave {session.wave}/10</div>
      <div className="bossrush-boss-name">{session.bossName}</div>
      <div className="bossrush-hp-bar-wrap">
        <div className="bossrush-hp-bar" style={{ width: `${hpPct}%` }} />
      </div>
      <div className="bossrush-hp-text">
        {session.bossHp.toLocaleString()} / {session.bossMaxHp.toLocaleString()} HP
      </div>
      {lastResult && (lastResult.bpEarned > 0 || lastResult.gemsEarned > 0) && (
        <div className="bossrush-reward-flash">
          {lastResult.bpEarned > 0 && `+${lastResult.bpEarned.toLocaleString()} BP `}
          {lastResult.gemsEarned > 0 && `💎+${lastResult.gemsEarned}`}
        </div>
      )}
      <div className={`bossrush-tap-area${tapping ? ' bossrush-tapping' : ''}`} onClick={handleTap}>
        <div className="bossrush-boss-emoji">👾</div>
        <div className="bossrush-tap-hint">TAP TO ATTACK!</div>
      </div>
      <button className="bossrush-abandon-btn" onClick={handleAbandon}>Abandon Run</button>
    </div>
  );
}
