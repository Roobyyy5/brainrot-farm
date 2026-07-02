import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Ascension() {
  const [data, setData] = useState(null);
  const [lb, setLb] = useState([]);
  const [tab, setTab] = useState('tree');
  const [loading, setLoading] = useState(false);

  const load = () => {
    api.ascension.status().then(setData).catch(() => {});
    api.ascension.leaderboard().then(d => setLb(d.leaderboard || [])).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const doAscend = async () => {
    if (!confirm('Ascend? This resets all prestiges, upgrades, skills, and talents but grants 3 Ascension Points.')) return;
    setLoading(true);
    try { await api.ascension.ascend(); load(); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const doUpgrade = async (key) => {
    setLoading(true);
    try { await api.ascension.upgrade(key); load(); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;

  return (
    <div className="ascension-panel">
      <div className="ascension-header">
        <span>🌟 Ascension</span>
        <span className="ascension-pts">{data.ascensionPoints} AP</span>
      </div>

      <div className="ascension-tabs">
        <button className={tab === 'tree' ? 'active' : ''} onClick={() => setTab('tree')}>Tree</button>
        <button className={tab === 'lb' ? 'active' : ''} onClick={() => setTab('lb')}>Leaderboard</button>
      </div>

      {tab === 'tree' && (
        <>
          <div className="ascension-info">
            Prestige: <b>{data.prestige}</b> / {data.requiredPrestiges} needed to ascend |
            Ascensions: <b>{data.ascensionCount}</b>
          </div>

          {data.canAscend && (
            <button className="ascension-btn" onClick={doAscend} disabled={loading}>
              🌟 ASCEND (+3 AP, reset all)
            </button>
          )}

          <div className="ascension-tree-grid">
            {(data.tree || []).map(node => {
              const maxed = node.currentLevel >= node.maxLevel;
              const canAfford = data.ascensionPoints >= node.costPerLevel;
              return (
                <div key={node.key} className={`ascension-node ${maxed ? 'maxed' : ''}`}>
                  <div className="asc-node-icon">{node.icon}</div>
                  <div className="asc-node-name">{node.name}</div>
                  <div className="asc-node-desc">{node.desc}</div>
                  <div className="asc-node-level">{node.currentLevel}/{node.maxLevel}</div>
                  {!maxed && (
                    <button
                      className="asc-node-btn"
                      onClick={() => doUpgrade(node.key)}
                      disabled={!canAfford || loading}
                    >
                      {node.costPerLevel} AP
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'lb' && (
        <div className="ascension-lb">
          <div className="asc-lb-title">🏆 Prestige Score Leaderboard</div>
          <div className="asc-lb-sub">Score = Total Taps × Prestige²</div>
          {lb.map(r => (
            <div key={r.rank} className="asc-lb-row">
              <span className="asc-lb-rank">#{r.rank}</span>
              <span className="asc-lb-name">{r.username}</span>
              <span className="asc-lb-p">P{r.prestige}</span>
              {r.ascensionCount > 0 && <span className="asc-lb-asc">🌟×{r.ascensionCount}</span>}
              <span className="asc-lb-score">{Number(r.prestigeScore).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
