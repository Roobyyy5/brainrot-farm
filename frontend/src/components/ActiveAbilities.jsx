import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function ActiveAbilities({ onActivate }) {
  const [abilities, setAbilities] = useState([]);
  const [activating, setActivating] = useState(null);
  const timerRef = useRef(null);

  const load = () => api.abilities.status().then(d => setAbilities(d.abilities || [])).catch(() => {});

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 5000);
    return () => clearInterval(timerRef.current);
  }, []);

  const activate = async (key) => {
    setActivating(key);
    try {
      await api.abilities.activate(key);
      await load();
      if (onActivate) onActivate(key);
    } catch (err) {
      alert(err.message);
    } finally {
      setActivating(null);
    }
  };

  const fmtCd = (ms) => {
    if (ms <= 0) return 'READY';
    const s = Math.ceil(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem}s`;
  };

  if (abilities.length === 0) return null;

  return (
    <div className="abilities-panel">
      <div className="abilities-title">⚔️ Active Abilities</div>
      <div className="abilities-grid">
        {abilities.map(ab => {
          const ready = ab.cooldownMs <= 0 && !ab.active;
          return (
            <button
              key={ab.key}
              className={`ability-btn ${ab.active ? 'ability-active' : ''} ${ready ? 'ability-ready' : ''}`}
              onClick={() => ready && activate(ab.key)}
              disabled={!ready || activating === ab.key}
              title={ab.desc}
            >
              <span className="ability-icon">{ab.icon}</span>
              <span className="ability-name">{ab.name}</span>
              <span className="ability-cd">
                {ab.active ? '✅ ACTIVE' : fmtCd(ab.cooldownMs)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
