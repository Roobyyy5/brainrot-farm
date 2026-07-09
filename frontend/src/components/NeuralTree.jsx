import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';
import { toastError, toastSuccess } from '../toast';

export default function NeuralTree() {
  const t = useT();
  const BONUS_LABELS = {
    tapMult:       v => `+${Math.round(v*100)}% ${t('bonus_tap')}`,
    energyMax:     v => `+${v} ${t('bonus_energy')}`,
    energyRegen:   v => `+${Math.round(v*100)}% ${t('bonus_regen')}`,
    energyCostMult:v => `${Math.round(v*100)}% ${t('bonus_cost')}`,
    comboMult:     v => `+${Math.round(v*100)}% ${t('bonus_combo')}`,
    passiveMult:   v => `+${Math.round(v*100)}% ${t('bonus_passive')}`,
    gemMult:       v => `+${Math.round(v*100)}% ${t('bonus_gems')}`,
    critChance:    v => `+${Math.round(v*100)}% ${t('bonus_crit')}`,
    allMult:       v => `+${Math.round(v*100)}% ${t('bonus_all')}`,
  };
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => api.neuraltree.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const unlock = async (nodeId) => {
    setLoading(true);
    try { await api.neuraltree.unlock(nodeId); await load(); setSelected(null); }
    catch (err) { toastError(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;

  if (!data.treeUnlocked) {
    return (
      <div className="neural-panel">
        <div className="neural-header">{t('neural_header')}</div>
        <div className="neural-locked">
          {t('neural_locked', { n: data.requiredAscension })}
          <div className="neural-locked-sub">{t('neural_locked_sub')}</div>
        </div>
      </div>
    );
  }

  const selNode = selected ? data.nodes.find(n => n.id === selected) : null;

  return (
    <div className="neural-panel">
      <div className="neural-header">{t('neural_header')}</div>
      <div className="neural-points">{t('neural_points', { n: data.points, unlocked: data.totalUnlocked, total: data.nodes.length })}</div>

      <div className="neural-map">
        <svg className="neural-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          {data.nodes.map(node =>
            node.requires.map(reqId => {
              const req = data.nodes.find(n => n.id === reqId);
              if (!req) return null;
              return (
                <line key={`${reqId}-${node.id}`}
                  x1={req.x} y1={req.y} x2={node.x} y2={node.y}
                  stroke={node.unlocked ? '#8b5cf6' : '#1f2937'}
                  strokeWidth="0.8" strokeDasharray={node.unlocked ? '0' : '2,1'}
                />
              );
            })
          )}
          {data.nodes.map(node => (
            <g key={node.id} onClick={() => setSelected(selected === node.id ? null : node.id)} style={{ cursor: 'pointer' }}>
              <circle
                cx={node.x} cy={node.y} r={node.id === 'apex' ? 5 : 3.5}
                fill={node.unlocked ? '#8b5cf6' : node.available ? '#374151' : '#111827'}
                stroke={selected === node.id ? '#ff4fa3' : node.unlocked ? '#a78bfa' : node.available ? '#4b5563' : '#1f2937'}
                strokeWidth={selected === node.id ? 1.2 : 0.8}
              />
              <text x={node.x} y={node.y + 0.8} textAnchor="middle" fontSize="2.5" fill={node.unlocked ? '#fff' : '#6b7280'}>
                {node.icon}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {selNode && (
        <div className="neural-detail">
          <div className="neural-detail-name">{selNode.icon} {selNode.name}</div>
          <div className="neural-detail-bonus">
            {Object.entries(selNode.bonus).map(([k, v]) => (
              <span key={k} className="neural-bonus-tag">{BONUS_LABELS[k]?.(v) || `${k}: ${v}`}</span>
            ))}
          </div>
          {selNode.cost > 0 && <div className="neural-detail-cost">{t('neural_cost', { n: selNode.cost })}</div>}
          {selNode.requires.length > 0 && (
            <div className="neural-detail-req">
              {t('neural_requires', { nodes: selNode.requires.map(r => data.nodes.find(n => n.id === r)?.name || r).join(', ') })}
            </div>
          )}
          {selNode.unlocked ? (
            <div className="neural-detail-status unlocked">{t('neural_unlocked')}</div>
          ) : selNode.available ? (
            <button className="neural-unlock-btn" onClick={() => unlock(selNode.id)} disabled={loading}>
              {t('neural_unlock_btn', { n: selNode.cost })}
            </button>
          ) : (
            <div className="neural-detail-status locked">{t('neural_prereq')}</div>
          )}
        </div>
      )}

      <div className="neural-hint">{t('neural_hint')}</div>
    </div>
  );
}
