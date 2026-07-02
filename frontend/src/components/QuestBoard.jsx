import { useState, useEffect } from 'react';
import { api } from '../api';

const TIER_COLOR = { bronze: '#cd7f32', silver: '#c0c5ce', gold: '#f5c344', platinum: '#00e5ff' };

export default function QuestBoard() {
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
      alert(`🎁 Quest Chest opened! +${r.gems} 💎${r.artifactGranted ? ` + ${r.artifactGranted} artifact!` : ''}`);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;
  const quests = tab === 'daily' ? data.daily : data.weekly;

  return (
    <div className="questboard-panel">
      <div className="questboard-header">📋 Quest Board</div>

      <div className="questboard-tabs">
        <button className={tab === 'daily' ? 'active' : ''} onClick={() => setTab('daily')}>
          Daily ({data.completedToday}/5)
        </button>
        <button className={tab === 'weekly' ? 'active' : ''} onClick={() => setTab('weekly')}>Weekly</button>
      </div>

      {tab === 'daily' && (
        <div className={`questboard-chest ${data.chestReady ? 'ready' : ''} ${data.chestOpened ? 'opened' : ''}`}
          onClick={data.chestReady && !loading ? openChest : undefined}>
          <span className="questboard-chest-icon">🎁</span>
          <div className="questboard-chest-info">
            <div className="questboard-chest-title">Daily Quest Chest</div>
            <div className="questboard-chest-sub">
              {data.chestOpened ? '✅ Opened today' : data.chestReady ? 'TAP TO OPEN! +15 💎' : `${data.completedToday}/5 quests done`}
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
                <div className="questboard-quest-name">{q.name}</div>
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
                  Claim
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
