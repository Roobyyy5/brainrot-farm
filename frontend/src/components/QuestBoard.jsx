import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

const TIER_COLOR = { bronze: '#cd7f32', silver: '#c0c5ce', gold: '#f5c344', platinum: '#00e5ff' };

export default function QuestBoard() {
  const t = useT();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('daily');
  const [loading, setLoading] = useState(false);

  const load = () => api.questboard.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const claim = async (questKey, periodKey) => {
    setLoading(true);
    try { await api.questboard.claim(questKey, periodKey); await load(); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const openChest = async () => {
    setLoading(true);
    try {
      const r = await api.questboard.chest();
      await load();
      alert(t('quest_chest_alert', { gems: r.gems }) + (r.artifactGranted ? t('quest_chest_artifact', { name: r.artifactGranted }) : ''));
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;
  const quests = tab === 'daily' ? data.daily : data.weekly;
  const qName = (q) => { const k = 'quest_' + q.key + '_name'; const v = t(k); return v === k ? q.name : v; };

  return (
    <div className="questboard-panel">
      <div className="questboard-header">{t('quest_title')}</div>

      <div className="questboard-tabs">
        <button className={tab === 'daily' ? 'active' : ''} onClick={() => setTab('daily')}>
          {t('quest_tab_daily', { n: data.completedToday })}
        </button>
        <button className={tab === 'weekly' ? 'active' : ''} onClick={() => setTab('weekly')}>{t('quest_tab_weekly')}</button>
      </div>

      {tab === 'daily' && (
        <div className={`questboard-chest ${data.chestReady ? 'ready' : ''} ${data.chestOpened ? 'opened' : ''}`}
          onClick={data.chestReady && !loading ? openChest : undefined}>
          <span className="questboard-chest-icon">🎁</span>
          <div className="questboard-chest-info">
            <div className="questboard-chest-title">{t('quest_daily')}</div>
            <div className="questboard-chest-sub">
              {data.chestOpened ? t('quest_chest_opened') : data.chestReady ? t('quest_chest_ready') : t('quest_chest_progress', { done: data.completedToday })}
            </div>
          </div>
          <div className="questboard-chest-bar">
            {[0,1,2,3,4].map(i => (
              <div key={i} className={`questboard-chest-pip ${i < data.completedToday ? 'done' : ''}`} />
            ))}
          </div>
        </div>
      )}

      <div className="questboard-list">
        {quests.map(q => {
          const pct = Math.min(100, q.tapTarget ? q.progress / q.target * 100 : q.completed ? 100 : 0);
          return (
            <div key={q.key} className={`questboard-quest ${q.completed ? 'completed' : ''} ${q.claimed ? 'claimed' : ''}`}>
              <span className="questboard-quest-icon">{q.icon}</span>
              <div className="questboard-quest-body">
                <div className="questboard-quest-name">{qName(q)}</div>
                <div className="questboard-progress-bar">
                  <div className="questboard-progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="questboard-quest-meta">
                  {q.progress.toLocaleString()} / {q.target.toLocaleString()}
                  {q.reward?.gems && <span className="questboard-reward">💎 {q.reward.gems}</span>}
                </div>
              </div>
              {q.completed && !q.claimed && (
                <button className="questboard-claim-btn" onClick={() => claim(q.key, q.periodKey)} disabled={loading}>
                  {t('quest_claim')}
                </button>
              )}
              {q.claimed && <span className="questboard-claimed-badge">✅</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
