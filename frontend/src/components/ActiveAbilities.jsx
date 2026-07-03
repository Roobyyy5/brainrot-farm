import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function ActiveAbilities({ onActivate }) {
  const t = useT();
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
    if (ms <= 0) return t('abilities_ready');
    const s = Math.ceil(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem}s`;
  };

  if (abilities.length === 0) return null;

  return (
    <div className="abilities-panel">
      <div className="abilities-title">{t('abilities_header')}</div>
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
              <span className="ability-name">{t('ability_' + ab.key + '_name')}</span>
              <span className="ability-cd">
                {ab.active ? t('abilities_active') : fmtCd(ab.cooldownMs)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
