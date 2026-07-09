import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';
import { toastError, toastSuccess } from '../toast';

export default function Friends() {
  const t = useT();
  const [data, setData] = useState({ friends: [], incoming: [] });
  const [addId, setAddId] = useState('');
  const [viewProfile, setViewProfile] = useState(null);
  const [acting, setActing] = useState(false);

  const load = () => api.friends.list().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addId.trim() || acting) return;
    setActing(true);
    try {
      await api.friends.add(addId.trim());
      setAddId('');
      load();
    } catch (err) { toastError(err.message); }
    finally { setActing(false); }
  };

  const handleAccept = async (friendId) => {
    setActing(true);
    try { await api.friends.accept(friendId); load(); }
    catch (err) { toastError(err.message); }
    finally { setActing(false); }
  };

  const handleRemove = async (friendId) => {
    if (!window.confirm(t('friends_remove_confirm'))) return;
    try { await api.friends.remove(friendId); } catch (err) { toastError(err.message); }
    load();
  };

  const openProfile = async (telegramId) => {
    try {
      const p = await api.friends.profile(telegramId);
      setViewProfile(p);
    } catch {}
  };

  const accepted = data.friends.filter(f => f.status === 'accepted');
  const pending = data.friends.filter(f => f.status === 'pending');

  return (
    <div className="friends-section">
      <div className="friends-header">👥 {t('friends_title')}</div>

      {viewProfile && (
        <div className="friends-profile-overlay" onClick={() => setViewProfile(null)}>
          <div className="friends-profile-card" onClick={e => e.stopPropagation()}>
            <div className="fp-name">{viewProfile.username}</div>
            <div className="fp-rank" style={{ color: viewProfile.rank?.color }}>{viewProfile.rank?.emoji} {viewProfile.rank?.name}</div>
            <div className="fp-stats">
              <span>⚡{viewProfile.totalTaps.toLocaleString()} {t('profile_taps')}</span>
              <span>✨{viewProfile.prestige} {t('profile_prestige')}</span>
            </div>
            <div className="fp-zone">{viewProfile.zone}</div>
            {viewProfile.guild && <div className="fp-guild">{viewProfile.guild}</div>}
            <button className="fp-close-btn" onClick={() => setViewProfile(null)}>{t('friends_close')}</button>
          </div>
        </div>
      )}

      <form className="friends-add-form" onSubmit={handleAdd}>
        <input
          className="friends-add-input"
          placeholder={t('friends_add_full_ph')}
          value={addId}
          onChange={e => setAddId(e.target.value)}
        />
        <button type="submit" className="friends-add-btn" disabled={acting || !addId.trim()}>
          {acting ? '...' : `+ ${t('friends_add_btn')}`}
        </button>
      </form>

      {data.incoming.length > 0 && (
        <div className="friends-group">
          <div className="friends-group-title">{t('friends_incoming')}</div>
          {data.incoming.map(f => (
            <div key={f.telegramId} className="friends-row">
              <span className="friends-name">{f.username || f.telegramId}</span>
              <button className="friends-accept-btn" onClick={() => handleAccept(f.telegramId)} disabled={acting}>{t('friends_accept')}</button>
            </div>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div className="friends-group">
          <div className="friends-group-title">{t('friends_sent')}</div>
          {pending.map(f => (
            <div key={f.telegramId} className="friends-row">
              <span className="friends-name">{f.username || f.telegramId}</span>
              <span className="friends-pending">{t('friends_pending')}</span>
            </div>
          ))}
        </div>
      )}

      {accepted.length > 0 && (
        <div className="friends-group">
          <div className="friends-group-title">{t('friends_group', { n: accepted.length })}</div>
          {accepted.map(f => (
            <div key={f.telegramId} className="friends-row" onClick={() => openProfile(f.telegramId)} style={{ cursor: 'pointer' }}>
              <span className="friends-name">{f.username || f.telegramId}</span>
              <button className="friends-remove-btn" onClick={e => { e.stopPropagation(); handleRemove(f.telegramId); }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {accepted.length === 0 && pending.length === 0 && data.incoming.length === 0 && (
        <div className="friends-empty">{t('friends_none')}</div>
      )}
    </div>
  );
}
