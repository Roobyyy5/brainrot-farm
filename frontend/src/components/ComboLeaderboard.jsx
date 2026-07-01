import { useState, useEffect } from 'react';
import { api } from '../api';

export default function ComboLeaderboard() {
  const [entries, setEntries] = useState([]);
  const [myBest, setMyBest] = useState(null);

  useEffect(() => {
    api.comboboard.list().then(d => {
      setEntries(d.entries);
      setMyBest(d.myBest);
    }).catch(() => {});
  }, []);

  return (
    <div className="comboboard-section">
      <div className="comboboard-header">🌪️ Combo Leaderboard</div>
      <div className="comboboard-sub">Best combo multiplier this month</div>
      {myBest && (
        <div className="comboboard-mybest">Your best: ×{myBest.toFixed(1)}</div>
      )}
      <div className="comboboard-list">
        {entries.length === 0 && (
          <div className="comboboard-empty">No combos yet this month. Tap fast!</div>
        )}
        {entries.map(e => (
          <div key={e.telegramId} className={`comboboard-row${e.isMe ? ' comboboard-row--me' : ''}`}>
            <span className="comboboard-rank">#{e.rank}</span>
            <span className="comboboard-name">{e.username}</span>
            <span className="comboboard-combo">×{e.maxCombo.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
