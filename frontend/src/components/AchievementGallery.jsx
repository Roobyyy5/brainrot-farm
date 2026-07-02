import { useState, useEffect } from 'react';
import { api } from '../api';

const TIER_COLOR = { bronze: '#cd7f32', silver: '#c0c5ce', gold: '#f5c344', diamond: '#00e5ff' };
const TIER_ORDER = ['bronze', 'silver', 'gold', 'diamond'];

export default function AchievementGallery() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  const load = () => api.gallery.list().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const claim = async (achKey) => {
    setLoading(true);
    try {
      const r = await api.gallery.claim(achKey);
      await load();
      alert(`🏆 Achievement claimed! +${r.gems} 💎`);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;

  const categories = ['all', 'tapper', 'prestige', 'social'];
  const filtered = filter === 'all' ? data.achievements : data.achievements.filter(a => a.category === filter);

  const completed = data.achievements.filter(a => a.completed).length;
  const total = data.achievements.length;

  return (
    <div className="gallery-panel">
      <div className="gallery-header">🏆 Achievement Gallery</div>
      <div className="gallery-progress">
        <div className="gallery-progress-bar">
          <div className="gallery-progress-fill" style={{ width: `${(completed / total) * 100}%` }} />
        </div>
        <div className="gallery-progress-text">{completed}/{total} achievements • {data.totalGems} 💎 earned</div>
      </div>

      <div className="gallery-filters">
        {categories.map(c => (
          <button key={c} className={`gallery-filter ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}>
            {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      <div className="gallery-list">
        {filtered.map(a => {
          const color = TIER_COLOR[a.tier] || '#888';
          const tierIdx = TIER_ORDER.indexOf(a.tier);
          return (
            <div key={a.key} className={`gallery-ach ${a.completed ? 'completed' : ''} ${a.claimed ? 'claimed' : ''}`}>
              <div className="gallery-ach-icon" style={{ borderColor: color }}>{a.icon}</div>
              <div className="gallery-ach-body">
                <div className="gallery-ach-name">{a.name}</div>
                <div className="gallery-ach-desc">{a.description}</div>
                <div className="gallery-ach-meta">
                  <span className="gallery-tier-badge" style={{ color }}>
                    {'◆'.repeat(tierIdx + 1)} {a.tier.toUpperCase()}
                  </span>
                  <span className="gallery-ach-reward">💎 {a.gems}</span>
                </div>
              </div>
              {a.completed && !a.claimed && (
                <button className="gallery-claim-btn" onClick={() => claim(a.key)} disabled={loading}>
                  Claim
                </button>
              )}
              {a.claimed && <span className="gallery-claimed">✅</span>}
              {!a.completed && (
                <div className="gallery-ach-progress">
                  <div className="gallery-ach-prog-bar">
                    <div className="gallery-ach-prog-fill" style={{ width: `${Math.min(100, (a.progress / a.progressTarget) * 100)}%`, background: color }} />
                  </div>
                  <div className="gallery-ach-prog-text">{a.progress?.toLocaleString()} / {a.progressTarget?.toLocaleString()}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
