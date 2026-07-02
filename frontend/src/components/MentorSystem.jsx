import { useState, useEffect } from 'react';
import { api } from '../api';

export default function MentorSystem() {
  const [data, setData] = useState(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => api.mentor.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const act = async (fn, msg) => {
    setLoading(true);
    try { await fn(); if (msg) alert(msg); await load(); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;

  const xpPct = data.nextMilestone
    ? Math.min(100, (data.totalTeachingXp / data.nextMilestone.xp) * 100)
    : 100;

  return (
    <div className="mentor-panel">
      <div className="mentor-header">🎓 Ментор / Учень</div>

      {data.myMentor ? (
        <div className="mentor-my-mentor">
          <div className="mentor-my-mentor-title">Мій ментор</div>
          <div className="mentor-my-mentor-row">
            <span className="mentor-my-mentor-name">👤 {data.myMentor.username}</span>
            <span className="mentor-bonus">+{Math.round(data.myMentor.bonusPct * 100)}% бонус</span>
          </div>
          <button className="mentor-resign-btn" onClick={() => act(() => api.mentor.resign(), 'Ти пішов від ментора')} disabled={loading}>
            Залишити ментора
          </button>
        </div>
      ) : (
        <div className="mentor-find">
          <div className="mentor-find-title">Знайти ментора</div>
          <div className="mentor-find-row">
            <input
              className="mentor-input"
              placeholder="Username ментора"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
            <button
              className="mentor-take-btn"
              onClick={() => act(() => api.mentor.take(username), `${username} тепер твій ментор!`)}
              disabled={loading || !username}
            >
              Стати учнем
            </button>
          </div>
        </div>
      )}

      <div className="mentor-section-title">
        Мої учні ({data.apprentices.length}/{data.maxApprentices})
      </div>

      {data.apprentices.length === 0 ? (
        <div className="mentor-empty">Учнів поки немає. Поділись своїм username щоб інші змогли до тебе звернутись.</div>
      ) : (
        <div className="mentor-apprentices">
          {data.apprentices.map(a => (
            <div key={a.telegramId} className="mentor-apprentice-row">
              <span className="mentor-ap-name">👤 {a.username}</span>
              <span className="mentor-ap-xp">📚 {a.teachingXp} XP</span>
              <button className="mentor-remove-btn" onClick={() => act(() => api.mentor.remove(a.telegramId))} disabled={loading}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {data.apprentices.length > 0 && (
        <div className="mentor-progress">
          <div className="mentor-progress-top">
            <span className="mentor-progress-label">Teaching XP: {data.totalTeachingXp}</span>
            {data.nextMilestone && <span className="mentor-next">→ {data.nextMilestone.name}</span>}
          </div>
          <div className="mentor-progress-bar">
            <div className="mentor-progress-fill" style={{ width: `${xpPct}%` }} />
          </div>
          <div className="mentor-milestones">
            {data.milestones.map(m => (
              <div key={m.xp} className={`mentor-milestone ${data.totalTeachingXp >= m.xp ? 'done' : ''}`}>
                <span className="mentor-ms-name">{m.name}</span>
                <span className="mentor-ms-reward">+{m.reward.gems}💎</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.apprentices.length < data.maxApprentices && (
        <div className="mentor-find">
          <div className="mentor-find-title">Додати учня</div>
          <div className="mentor-find-row">
            <input
              className="mentor-input"
              placeholder="Username учня"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
            <button
              className="mentor-take-btn"
              onClick={() => act(() => api.mentor.take(username), `${username} став твоїм учнем!`)}
              disabled={loading || !username}
            >
              Взяти
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
