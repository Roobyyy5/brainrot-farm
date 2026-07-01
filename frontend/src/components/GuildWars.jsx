import { useState, useEffect } from 'react';
import { api } from '../api';

function msToCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
}

export default function GuildWars() {
  const [data, setData] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    api.guildwars.status().then(d => {
      setData(d);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!data?.endsAt) return;
    const iv = setInterval(() => {
      setTimeLeft(msToCountdown(data.endsAt - Date.now()));
    }, 1000);
    setTimeLeft(msToCountdown(data.endsAt - Date.now()));
    return () => clearInterval(iv);
  }, [data?.endsAt]);

  if (!data) return null;

  return (
    <div className="guildwars-section">
      <div className="guildwars-header">⚔️ Guild Wars</div>
      <div className="guildwars-meta">
        Weekly competition · Resets in <strong>{timeLeft}</strong>
      </div>

      {data.myGuild && (
        <div className="guildwars-myscore">
          [{data.myGuild.tag}] {data.myGuild.name} — 🗡️ {Number(data.myGuild.warScore).toLocaleString()} pts
        </div>
      )}

      <div className="guildwars-rewards-row">
        {data.rewards.slice(0, 5).map((gems, i) => (
          <div key={i} className="guildwars-reward-chip">
            #{i + 1} 💎{gems}
          </div>
        ))}
      </div>

      <div className="guildwars-list">
        {data.leaderboard.length === 0 && (
          <div className="guildwars-empty">No guilds on the board yet — attack your guild boss!</div>
        )}
        {data.leaderboard.map(g => (
          <div
            key={g.guildId}
            className={`guildwars-row${data.myGuild?.guildId === g.guildId ? ' guildwars-row--me' : ''}`}
          >
            <span className="guildwars-pos">#{g.rank}</span>
            <span className="guildwars-tag">[{g.tag}]</span>
            <span className="guildwars-name">{g.name}</span>
            <span className="guildwars-score">🗡️ {Number(g.warScore).toLocaleString()}</span>
            {g.gemReward > 0 && <span className="guildwars-prize">💎{g.gemReward}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
