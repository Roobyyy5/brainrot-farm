import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Achievements({ refreshKey }) {
  const [list, setList] = useState([]);

  useEffect(() => {
    api.achievements().then((data) => setList(data.achievements)).catch(() => {});
  }, [refreshKey]);

  if (list.length === 0) return null;

  return (
    <div className="achievements-section">
      <div className="achievements-title">🎖️ Achievements</div>
      <div className="achievements-grid">
        {list.map((a) => (
          <div key={a.key} className={a.unlocked ? 'achievement-badge unlocked' : 'achievement-badge'}>
            <div className="achievement-badge-emoji">{a.emoji}</div>
            <div className="achievement-badge-name">{a.name}</div>
            <div className="achievement-badge-reward">+{a.reward}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
