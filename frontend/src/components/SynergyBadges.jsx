import { useState, useEffect } from 'react';
import { api } from '../api';

const SYNERGY_COLOR = {
  hyper_tap: '#ef4444',
  infinite_loop: '#3b82f6',
  quantum_battery: '#8b5cf6',
  omega_brain: '#f59e0b',
  tap_engine: '#10b981',
  energy_god: '#ec4899',
};

export default function SynergyBadges() {
  const [data, setData] = useState(null);

  useEffect(() => { api.tapper.upgrades().then(setData).catch(() => {}); }, []);

  if (!data?.synergies?.length) return null;

  return (
    <div className="synergy-panel">
      <div className="synergy-header">⚡ Active Synergies</div>
      <div className="synergy-list">
        {data.synergies.map(s => (
          <div key={s.key} className="synergy-badge" style={{ borderColor: SYNERGY_COLOR[s.key] || '#888' }}>
            <div className="synergy-badge-name" style={{ color: SYNERGY_COLOR[s.key] || '#888' }}>{s.name}</div>
            <div className="synergy-badge-desc">{s.description}</div>
            <div className="synergy-badge-bonus">
              {Object.entries(s.bonus).map(([k, v]) => (
                <span key={k} className="synergy-bonus-tag">
                  {k === 'tapMultiplier' && `×${v} tap`}
                  {k === 'energyMax' && `+${v} energy`}
                  {k === 'energyRegen' && `+${v}/s regen`}
                  {k === 'passiveMultiplier' && `×${v} passive`}
                  {k === 'gemBonus' && `+${v} gems`}
                  {k === 'xpBonus' && `+${v} XP`}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
