import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

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
  const t = useT();
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
        <div className="constellation-header">{t('const_header')}</div>
        <div className="constellation-locked">
          {t('const_locked', { n: data.requiredAscension })}
          <div className="constellation-locked-sub">{t('const_locked_sub')}</div>
        </div>
      </div>
    );
  }

  const selNode = selected ? data.nodes.find(n => n.id === selected) : null;

  return (
    <div className="constellation-panel">
      <div className="constellation-header">{t('const_header')}</div>
      <div className="constellation-stardust">
        {t('const_stardust', { n: data.available, unlocked: data.totalUnlocked, total: data.nodes.length })}
      </div>
      <div className="constellation-hint-small">{t('const_earned', { n: data.totalEarned })}</div>

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
          {selNode.cost > 0 && <div className="constellation-detail-cost">{t('const_cost', { n: selNode.cost })}</div>}
          {selNode.requires.length > 0 && (
            <div className="constellation-detail-req">
              {t('const_requires', { nodes: selNode.requires.map(r => data.nodes.find(n => n.id === r)?.name || r).join(', ') })}
            </div>
          )}
          {selNode.unlocked ? (
            <div className="constellation-detail-status done">{t('const_unlocked')}</div>
          ) : selNode.available ? (
            <button className="constellation-unlock-btn" onClick={() => unlock(selNode.id)} disabled={loading}>
              {t('const_unlock_btn', { n: selNode.cost })}
            </button>
          ) : (
            <div className="constellation-detail-status locked">
              {data.available < selNode.cost
                ? t('const_need_more', { n: selNode.cost - data.available })
                : t('const_prereq')}
            </div>
          )}
        </div>
      )}

      <div className="constellation-footer-hint">{t('const_hint')}</div>
    </div>
  );
}
