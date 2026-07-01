import { useState, useEffect } from 'react';
import { api } from '../api';

function msToCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m ${sec}s`;
}

const SKIN_LABELS = { skin_fire: '🔥 Fire Brain', skin_diamond: '💎 Diamond Brain', skin_crown: '👑 Crown Brain' };

export default function Tournament() {
  const [data, setData] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    api.tournament.status().then(setData).catch(() => {});
  }, []);

  useEffect(() => {
    if (!data?.tournament?.endsAt) return;
    const iv = setInterval(() => setTimeLeft(msToCountdown(data.tournament.endsAt - Date.now())), 1000);
    setTimeLeft(msToCountdown(data.tournament.endsAt - Date.now()));
    return () => clearInterval(iv);
  }, [data?.tournament?.endsAt]);

  if (!data) return null;
  const { tournament, leaderboard, myScore, topGems } = data;

  return (
    <div className="tourney-section">
      <div className="tourney-header">🏆 {tournament.name}</div>
      <div className="tourney-meta">
        Ends in <strong>{timeLeft}</strong> · Prize: {SKIN_LABELS[tournament.prizeSkin] || tournament.prizeSkin}
      </div>
      {myScore > 0 && <div className="tourney-myscore">Your score: {myScore.toLocaleString()} BP</div>}
      <div className="tourney-rewards-row">
        {topGems.slice(0, 5).map((g, i) => (
          <div key={i} className="tourney-reward-chip">#{i + 1} 💎{g}</div>
        ))}
        <div className="tourney-reward-chip">#1 {SKIN_LABELS[tournament.prizeSkin]?.split(' ')[0]}</div>
      </div>
      <div className="tourney-list">
        {leaderboard.length === 0 && (
          <div className="tourney-empty">No participants yet — start tapping to join!</div>
        )}
        {leaderboard.map(e => (
          <div key={e.telegramId} className={`tourney-row${e.isMe ? ' tourney-row--me' : ''}`}>
            <span className="tourney-pos">#{e.rank}</span>
            <span className="tourney-name">{e.username}</span>
            <span className="tourney-score">{e.score.toLocaleString()} BP</span>
            {e.gemReward > 0 && <span className="tourney-prize">💎{e.gemReward}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
