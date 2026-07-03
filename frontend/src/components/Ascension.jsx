import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function Ascension() {
  const t = useT();
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
    if (!confirm(t('asc_confirm'))) return;
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
        <span>{t('asc_header')}</span>
        <span className="ascension-pts">{data.ascensionPoints} AP</span>
      </div>

      <div className="ascension-tabs">
        <button className={tab === 'tree' ? 'active' : ''} onClick={() => setTab('tree')}>{t('asc_tab_tree')}</button>
        <button className={tab === 'lb' ? 'active' : ''} onClick={() => setTab('lb')}>{t('asc_tab_lb')}</button>
      </div>

      {tab === 'tree' && (
        <>
          <div className="ascension-info">
            {t('asc_info', { p: data.prestige, req: data.requiredPrestiges, count: data.ascensionCount })}
          </div>

          {data.canAscend && (
            <button className="ascension-btn" onClick={doAscend} disabled={loading}>
              {t('asc_btn')}
            </button>
          )}

          <div className="ascension-tree-grid">
            {(data.tree || []).map(node => {
              const maxed = node.currentLevel >= node.maxLevel;
              const canAfford = data.ascensionPoints >= node.costPerLevel;
              return (
                <div key={node.key} className={`ascension-node ${maxed ? 'maxed' : ''}`}>
                  <div className="asc-node-icon">{node.icon}</div>
                  <div className="asc-node-name">{(() => { const k = 'asc_node_' + node.key + '_name'; const v = t(k); return v === k ? node.name : v; })()}</div>
                  <div className="asc-node-desc">{(() => { const k = 'asc_node_' + node.key + '_desc'; const v = t(k); return v === k ? node.desc : v; })()}</div>
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
          <div className="asc-lb-title">{t('asc_lb_title')}</div>
          <div className="asc-lb-sub">{t('asc_lb_sub')}</div>
          {lb.map(r => (
            <div key={r.rank} className="asc-lb-row">
              <span className="asc-lb-rank">#{r.rank}</span>
              <span className="asc-lb-name">{r.username}</span>
              <span className="asc-lb-p">{t('asc_prestige_prefix')}{r.prestige}</span>
              {r.ascensionCount > 0 && <span className="asc-lb-asc">🌟×{r.ascensionCount}</span>}
              <span className="asc-lb-score">{Number(r.prestigeScore).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
