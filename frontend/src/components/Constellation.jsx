import { useState, useEffect } from 'react';
import { api } from '../api';

const BONUS_LABELS = {
  tapMult:     v => `+${Math.round(v*100)}% Tap`,
  gemMult:     v => `+${Math.round(v*100)}% Gems`,
  passiveMult: v => `+${Math.round(v*100)}% Passive`,
  comboMult:   v => `+${Math.round(v*100)}% Combo`,
  energyMax:   v => `+${v} Energy`,
  energyRegen: v => `+${Math.round(v*100)}% Regen`,
  critChance:  v => `+${Math.round(v*100)}% Crit`,
  allMult:     v => `+${Math.round(v*100)}% All`,
};

export default function Constellation() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => api.constellation.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const unlock = async (nodeId) => {
    setLoading(true);
    try { await api.constellation.unlock(nodeId); await load(); setSelected(null); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;

  if (!data.constellationUnlocked) {
    return (
      <div className="constellation-panel">
        <div className="constellation-header">🌌 Prestige Constellation</div>
        <div className="constellation-locked">
          🔒 Відкривається після Ascension {data.requiredAscension}
          <div className="constellation-locked-sub">24 зірки постійних бонусів через prestige & ascension</div>
        </div>
      </div>
    );
  }

  const selNode = selected ? data.nodes.find(n => n.id === selected) : null;

  return (
    <div className="constellation-panel">
      <div className="constellation-header">🌌 Prestige Constellation</div>
      <div className="constellation-stardust">
        ⭐ {data.available} Stardust доступно • {data.totalUnlocked}/{data.nodes.length} зірок
      </div>
      <div className="constellation-hint-small">Зароблено: {data.totalEarned} (prestige×10 + ascension×80)</div>

      <div className="constellation-map">
        <svg className="constellation-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          {data.nodes.map(node =>
            node.requires.map(reqId => {
              const req = data.nodes.find(n => n.id === reqId);
              if (!req) return null;
              return (
                <line key={`${reqId}-${node.id}`}
                  x1={req.x} y1={req.y} x2={node.x} y2={node.y}
                  stroke={node.unlocked ? '#f5c344' : '#1f2937'}
                  strokeWidth="0.6"
                  strokeDasharray={node.unlocked ? '0' : '1.5,1'}
                  opacity="0.6"
                />
              );
            })
          )}
          {data.nodes.map(node => (
            <g key={node.id} onClick={() => setSelected(selected === node.id ? null : node.id)} style={{ cursor: 'pointer' }}>
              <circle
                cx={node.x} cy={node.y}
                r={node.id === 'cs_root' || node.id === 'cs_apex' ? 5 : node.id.startsWith('cs_leg') ? 4 : 3}
                fill={node.unlocked ? '#f5c344' : node.available ? '#374151' : '#111827'}
                stroke={selected === node.id ? '#ff4fa3' : node.unlocked ? '#fde68a' : node.available ? '#6b7280' : '#1f2937'}
                strokeWidth={selected === node.id ? 1.2 : 0.7}
              />
              <text x={node.x} y={node.y + 0.8} textAnchor="middle" fontSize="2.2" fill={node.unlocked ? '#fff' : '#4b5563'}>
                {node.icon?.slice(0,2)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {selNode && (
        <div className="constellation-detail">
          <div className="constellation-detail-name">{selNode.icon} {selNode.name}</div>
          <div className="constellation-detail-bonus">
            {Object.entries(selNode.bonus).map(([k, v]) => (
              <span key={k} className="constellation-bonus-tag">{BONUS_LABELS[k]?.(v) || `${k}:${v}`}</span>
            ))}
          </div>
          {selNode.cost > 0 && <div className="constellation-detail-cost">⭐ Вартість: {selNode.cost} Stardust</div>}
          {selNode.requires.length > 0 && (
            <div className="constellation-detail-req">
              Потребує: {selNode.requires.map(r => data.nodes.find(n => n.id === r)?.name || r).join(', ')}
            </div>
          )}
          {selNode.unlocked ? (
            <div className="constellation-detail-status done">✅ Розблоковано</div>
          ) : selNode.available ? (
            <button className="constellation-unlock-btn" onClick={() => unlock(selNode.id)} disabled={loading}>
              ⭐ Розблокувати ({selNode.cost})
            </button>
          ) : (
            <div className="constellation-detail-status locked">
              {data.available < selNode.cost
                ? `Потрібно ще ${selNode.cost - data.available} Stardust`
                : '🔒 Розблокуй попередні зірки'}
            </div>
          )}
        </div>
      )}

      <div className="constellation-footer-hint">
        Тапай на зірку • Stardust: +10 за prestige, +80 за ascension
      </div>
    </div>
  );
}
