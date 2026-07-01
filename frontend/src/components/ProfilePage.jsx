import { useState } from 'react';
import { api } from '../api';

const TAPPER_ACHIEVEMENTS = [
  { key: 'tap_first', emoji: '👆' }, { key: 'tap_100', emoji: '💯' },
  { key: 'tap_1k', emoji: '🔥' }, { key: 'tap_10k', emoji: '⚡' },
  { key: 'tap_100k', emoji: '🧠' }, { key: 'tap_maxed', emoji: '💎' },
  { key: 'tap_prestige', emoji: '✨' },
];

export default function ProfilePage({ currentUserId }) {
  const [searchId, setSearchId] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const loadProfile = async (tid) => {
    setLoading(true);
    setErr('');
    try {
      const data = await api.profile.get(tid);
      setProfile(data);
    } catch (e) { setErr(e.message || 'Not found'); setProfile(null); }
    finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchId.trim()) loadProfile(searchId.trim());
  };

  const loadMyProfile = () => {
    if (currentUserId) loadProfile(currentUserId);
  };

  return (
    <div className="profile-section">
      <div className="profile-header">👤 Profile</div>

      <div className="profile-search-row">
        <button className="profile-me-btn" onClick={loadMyProfile}>My Profile</button>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6, flex: 1 }}>
          <input
            className="profile-search-input"
            placeholder="Search by Telegram ID"
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
          />
          <button type="submit" className="profile-search-btn">🔍</button>
        </form>
      </div>

      {loading && <div className="tap-loading">Loading...</div>}
      {err && <div className="profile-error">{err}</div>}

      {profile && (
        <div className="profile-card">
          <div className="profile-name">
            {profile.activePet && <span>{profile.activePet.icon} </span>}
            {profile.username}
          </div>

          <div className="profile-rank-row">
            <span className="profile-rank" style={{ color: profile.rank?.color }}>
              {profile.rank?.emoji} {profile.rank?.name}
            </span>
            {profile.guild && (
              <span className="profile-guild">[{profile.guild.tag}] {profile.guild.name}</span>
            )}
          </div>

          <div className="profile-stats-grid">
            <div className="profile-stat">
              <div className="profile-stat-val">{Number(profile.totalTaps).toLocaleString()}</div>
              <div className="profile-stat-lbl">Total Taps</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-val">✨{profile.prestige}</div>
              <div className="profile-stat-lbl">Prestige</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-val">{profile.petCount}</div>
              <div className="profile-stat-lbl">Pets</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-val">
                {profile.maxCombo ? `×${profile.maxCombo.toFixed(1)}` : '—'}
              </div>
              <div className="profile-stat-lbl">Best Combo</div>
            </div>
          </div>

          <div className="profile-zone">
            {profile.currentZone?.icon} {profile.currentZone?.name}
          </div>

          {profile.activePet && (
            <div className="profile-pet-row">
              <span>{profile.activePet.icon}</span>
              <span>{profile.activePet.name}</span>
              <span style={{ opacity: 0.6 }}>{profile.activePet.desc}</span>
            </div>
          )}

          {profile.achievements.length > 0 && (
            <div className="profile-badges">
              {TAPPER_ACHIEVEMENTS.filter(a => profile.achievements.includes(a.key)).map(a => (
                <span key={a.key} className="profile-badge" title={a.key}>{a.emoji}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
