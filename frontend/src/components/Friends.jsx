import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Friends() {
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
    } catch (err) { alert(err.message); }
    finally { setActing(false); }
  };

  const handleAccept = async (friendId) => {
    setActing(true);
    try { await api.friends.accept(friendId); load(); }
    catch (err) { alert(err.message); }
    finally { setActing(false); }
  };

  const handleRemove = async (friendId) => {
    if (!window.confirm('Remove this friend?')) return;
    await api.friends.remove(friendId);
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
      <div className="friends-header">👥 Friends</div>

      {viewProfile && (
        <div className="friends-profile-overlay" onClick={() => setViewProfile(null)}>
          <div className="friends-profile-card" onClick={e => e.stopPropagation()}>
            <div className="fp-name">{viewProfile.username}</div>
            <div className="fp-rank" style={{ color: viewProfile.rank?.color }}>{viewProfile.rank?.emoji} {viewProfile.rank?.name}</div>
            <div className="fp-stats">
              <span>⚡{viewProfile.totalTaps.toLocaleString()} taps</span>
              <span>✨{viewProfile.prestige} prestige</span>
            </div>
            <div className="fp-zone">{viewProfile.zone}</div>
            {viewProfile.guild && <div className="fp-guild">{viewProfile.guild}</div>}
            <button className="fp-close-btn" onClick={() => setViewProfile(null)}>Close</button>
          </div>
        </div>
      )}

      <form className="friends-add-form" onSubmit={handleAdd}>
        <input
          className="friends-add-input"
          placeholder="Enter Telegram ID to add friend"
          value={addId}
          onChange={e => setAddId(e.target.value)}
        />
        <button type="submit" className="friends-add-btn" disabled={acting || !addId.trim()}>
          {acting ? '...' : '+ Add'}
        </button>
      </form>

      {data.incoming.length > 0 && (
        <div className="friends-group">
          <div className="friends-group-title">📨 Incoming Requests</div>
          {data.incoming.map(f => (
            <div key={f.telegramId} className="friends-row">
              <span className="friends-name">{f.username || f.telegramId}</span>
              <button className="friends-accept-btn" onClick={() => handleAccept(f.telegramId)} disabled={acting}>Accept</button>
            </div>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div className="friends-group">
          <div className="friends-group-title">⏳ Sent Requests</div>
          {pending.map(f => (
            <div key={f.telegramId} className="friends-row">
              <span className="friends-name">{f.username || f.telegramId}</span>
              <span className="friends-pending">Pending</span>
            </div>
          ))}
        </div>
      )}

      {accepted.length > 0 && (
        <div className="friends-group">
          <div className="friends-group-title">Friends ({accepted.length})</div>
          {accepted.map(f => (
            <div key={f.telegramId} className="friends-row" onClick={() => openProfile(f.telegramId)} style={{ cursor: 'pointer' }}>
              <span className="friends-name">{f.username || f.telegramId}</span>
              <button className="friends-remove-btn" onClick={e => { e.stopPropagation(); handleRemove(f.telegramId); }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {accepted.length === 0 && pending.length === 0 && data.incoming.length === 0 && (
        <div className="friends-empty">No friends yet. Add someone by their Telegram ID!</div>
      )}
    </div>
  );
}
