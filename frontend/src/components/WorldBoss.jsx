import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function WorldBoss() {
  const [data, setData] = useState(null);
  const [tapping, setTapping] = useState(false);
  const [countdown, setCountdown] = useState('');
  const timerRef = useRef(null);

  const load = () => api.worldboss.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!data?.boss) return;
    clearInterval(timerRef.current);
    const tick = () => {
      const ms = Math.max(0, data.boss.endsAt - Date.now());
      const d  = Math.floor(ms / 86400000);
      const h  = Math.floor((ms % 86400000) / 3600000);
      const m  = Math.floor((ms % 3600000) / 60000);
      setCountdown(d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`);
      if (ms <= 0) { load(); clearInterval(timerRef.current); }
    };
    tick();
    timerRef.current = setInterval(tick, 30000);
    return () => clearInterval(timerRef.current);
  }, [data]);

  const handleTap = async () => {
    if (tapping) return;
    setTapping(true);
    try { await api.worldboss.tap(10); await load(); }
    catch (err) { alert(err.message); }
    finally { setTapping(false); }
  };

  if (!data) return null;
  const { boss, myDamage, topHitters, topGems } = data;

  return (
    <div className="worldboss-section">
      <div className="worldboss-header">🌍 World Boss</div>

      {boss.hp <= 0 ? (
        <div className="worldboss-dead">Boss defeated! A new boss will spawn soon.</div>
      ) : (
        <>
          <div className="worldboss-name">{boss.name}</div>
          <div className="worldboss-hp-bar-wrap">
            <div className="worldboss-hp-bar" style={{ width: `${boss.pct}%` }} />
          </div>
          <div className="worldboss-hp-text">
            {Number(boss.hp).toLocaleString()} / {Number(boss.maxHp).toLocaleString()} HP
          </div>
          <div className="worldboss-meta">
            <span>⏰ {countdown} left</span>
            <span>⚔️ My damage: {myDamage.toLocaleString()}</span>
          </div>
          <button className="worldboss-tap-btn" onClick={handleTap} disabled={tapping}>
            {tapping ? '...' : '⚔️ ATTACK! (×10)'}
          </button>
        </>
      )}

      {topHitters?.length > 0 && (
        <div className="worldboss-lb">
          <div className="worldboss-lb-title">Top Attackers</div>
          {topHitters.map(r => (
            <div key={r.rank} className="worldboss-lb-row">
              <span className="worldboss-lb-rank">#{r.rank}</span>
              <span className="worldboss-lb-name">{r.username}</span>
              <span className="worldboss-lb-dmg">{Number(r.damage).toLocaleString()}</span>
              {topGems[r.rank - 1] > 0 && <span className="worldboss-lb-gems">💎{topGems[r.rank - 1]}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
