import { useState, useEffect } from 'react';
import { api } from '../api';

export default function GuildOlympics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('events'); // events | standings

  const load = () => api.olympics.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async (eventKey) => {
    setLoading(true);
    try {
      const r = await api.olympics.submit(eventKey);
      alert(`📊 Твій результат: ${r.score.toLocaleString()}`);
      await load();
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;

  const endsIn = Math.max(0, data.season.endsAt - Date.now());
  const daysLeft = Math.floor(endsIn / 86400000);
  const hoursLeft = Math.floor((endsIn % 86400000) / 3600000);

  return (
    <div className="olympics-panel">
      <div className="olympics-header">🏅 Guild Olympics</div>
      <div className="olympics-season">
        {data.season.monthKey} • Залишилось: {daysLeft}д {hoursLeft}г
      </div>

      <div className="olympics-tabs">
        <button className={`olympics-tab ${view === 'events' ? 'active' : ''}`} onClick={() => setView('events')}>
          ⚡ Події
        </button>
        <button className={`olympics-tab ${view === 'standings' ? 'active' : ''}`} onClick={() => setView('standings')}>
          🏆 Рейтинг
        </button>
      </div>

      {view === 'events' && (
        <div className="olympics-events">
          {data.events.map(ev => {
            const myScore = data.myScores[ev.key];
            const tops = data.eventTops[ev.key] || [];
            return (
              <div key={ev.key} className="olympics-event-card">
                <div className="olympics-event-top">
                  <span className="olympics-event-icon">{ev.icon}</span>
                  <div className="olympics-event-info">
                    <div className="olympics-event-name">{ev.name}</div>
                    <div className="olympics-event-desc">{ev.desc}</div>
                  </div>
                  <div className="olympics-event-right">
                    {myScore !== undefined && (
                      <div className="olympics-my-score">{myScore.toLocaleString()}</div>
                    )}
                    <button
                      className="olympics-submit-btn"
                      onClick={() => submit(ev.key)}
                      disabled={loading}
                    >
                      {myScore !== undefined ? '🔄 Оновити' : '📊 Submit'}
                    </button>
                  </div>
                </div>
                {tops.length > 0 && (
                  <div className="olympics-event-lb">
                    {tops.slice(0, 3).map((t, i) => (
                      <div key={i} className={`olympics-event-lb-row ${t.isMe ? 'me' : ''}`}>
                        <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                        <span className="olympics-lb-name">{t.username}</span>
                        <span className="olympics-lb-score">{t.score.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {view === 'standings' && (
        <div className="olympics-standings">
          <div className="olympics-rewards-title">🏆 Нагороди гільдій</div>
          {data.rewards.map(r => (
            <div key={r.place} className="olympics-reward-row">
              <span>{r.title}</span>
              <span className="olympics-reward-gems">💎 {r.gems}</span>
            </div>
          ))}

          <div className="olympics-guild-lb">
            <div className="olympics-guild-lb-title">Рейтинг гільдій</div>
            {data.guildStandings.length === 0 && (
              <div className="olympics-empty">Ще немає учасників. Submit свій результат першим!</div>
            )}
            {data.guildStandings.map(g => (
              <div key={g.rank} className={`olympics-guild-row ${g.isMe ? 'me' : ''}`}>
                <span className="olympics-g-rank">
                  {g.rank <= 3 ? ['🥇','🥈','🥉'][g.rank-1] : `#${g.rank}`}
                </span>
                <span className="olympics-g-tag">[{g.tag}]</span>
                <span className="olympics-g-name">{g.guildName}</span>
                <span className="olympics-g-score">{g.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
