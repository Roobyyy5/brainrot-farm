import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function GuildOlympics() {
  const t = useT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('events');

  const load = () => api.olympics.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async (eventKey) => {
    setLoading(true);
    try {
      const r = await api.olympics.submit(eventKey);
      alert(t('olympics_score_alert', { n: r.score.toLocaleString() }));
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
      <div className="olympics-header">{t('olympics_header')}</div>
      <div className="olympics-season">
        {t('olympics_season', { month: data.season.monthKey, d: daysLeft, h: hoursLeft })}
      </div>

      <div className="olympics-tabs">
        <button className={`olympics-tab ${view === 'events' ? 'active' : ''}`} onClick={() => setView('events')}>
          {t('olympics_tab_events')}
        </button>
        <button className={`olympics-tab ${view === 'standings' ? 'active' : ''}`} onClick={() => setView('standings')}>
          {t('olympics_tab_standings')}
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
                      {myScore !== undefined ? t('olympics_update_btn') : t('olympics_submit_btn')}
                    </button>
                  </div>
                </div>
                {tops.length > 0 && (
                  <div className="olympics-event-lb">
                    {tops.slice(0, 3).map((top, i) => (
                      <div key={i} className={`olympics-event-lb-row ${top.isMe ? 'me' : ''}`}>
                        <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                        <span className="olympics-lb-name">{top.username}</span>
                        <span className="olympics-lb-score">{top.score.toLocaleString()}</span>
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
          <div className="olympics-rewards-title">{t('olympics_rewards_title')}</div>
          {data.rewards.map(r => (
            <div key={r.place} className="olympics-reward-row">
              <span>{r.title}</span>
              <span className="olympics-reward-gems">💎 {r.gems}</span>
            </div>
          ))}

          <div className="olympics-guild-lb">
            <div className="olympics-guild-lb-title">{t('olympics_guild_lb_title')}</div>
            {data.guildStandings.length === 0 && (
              <div className="olympics-empty">{t('olympics_empty')}</div>
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
