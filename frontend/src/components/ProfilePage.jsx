import { useState } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

const TAPPER_ACHIEVEMENTS = [
  { key: 'tap_first', emoji: '👆' }, { key: 'tap_100', emoji: '💯' },
  { key: 'tap_1k', emoji: '🔥' }, { key: 'tap_10k', emoji: '⚡' },
  { key: 'tap_100k', emoji: '🧠' }, { key: 'tap_maxed', emoji: '💎' },
  { key: 'tap_prestige', emoji: '✨' },
];

export default function ProfilePage({ currentUserId }) {
  const t = useT();
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
      <div className="profile-header">👤 {t('profile_title')}</div>

      <div className="profile-search-row">
        <button className="profile-me-btn" onClick={loadMyProfile}>{t('profile_my')}</button>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6, flex: 1 }}>
          <input
            className="profile-search-input"
            placeholder={t('profile_search_ph')}
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
          />
          <button type="submit" className="profile-search-btn">🔍</button>
        </form>
      </div>

      {loading && <div className="tap-loading">{t('skill_loading')}</div>}
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
              <div className="profile-stat-lbl">{t('profile_taps')}</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-val">✨{profile.prestige}</div>
              <div className="profile-stat-lbl">{t('profile_prestige')}</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-val">{profile.petCount}</div>
              <div className="profile-stat-lbl">{t('pets_title')}</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-val">
                {profile.maxCombo ? `×${profile.maxCombo.toFixed(1)}` : '—'}
              </div>
              <div className="profile-stat-lbl">{t('stats_best_combo')}</div>
            </div>
          </div>

          <div className="profile-zone">
            {profile.currentZone?.icon} {(() => {
              const zone = profile.currentZone;
              if (!zone) return null;
              const k = 'zone_name_' + zone.zone;
              const v = t(k);
              return v === k ? zone.name : v;
            })()}
          </div>

          {profile.activePet && (
            <div className="profile-pet-row">
              <span>{profile.activePet.icon}</span>
              <span>{(() => { const k = 'pet_' + profile.activePet.key + '_name'; const v = t(k); return v === k ? profile.activePet.name : v; })()}</span>
              <span style={{ opacity: 0.6 }}>{(() => { const k = 'pet_' + profile.activePet.key + '_desc'; const v = t(k); return v === k ? profile.activePet.desc : v; })()}</span>
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
