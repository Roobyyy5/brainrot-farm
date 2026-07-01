import { useState, useEffect } from 'react';
import { api } from '../api';

export default function GuildRaid() {
  const [data, setData] = useState(null);
  const [acting, setActing] = useState(false);

  const load = () => api.guildraid.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleStart = async () => {
    setActing(true);
    try { await api.guildraid.start(); load(); }
    catch (err) { alert(err.message); }
    finally { setActing(false); }
  };

  const handleTap = async () => {
    if (acting) return;
    setActing(true);
    try { await api.guildraid.tap(20); await load(); }
    catch (err) { alert(err.message); }
    finally { setActing(false); }
  };

  if (!data) return null;
  const { raid, participants, waves, message } = data;

  return (
    <div className="guildraid-section">
      <div className="guildraid-header">⚔️ Guild Raid</div>

      {message === 'Not in a guild' ? (
        <div className="guildraid-empty">Join a guild to participate in raids!</div>
      ) : !raid ? (
        <>
          <div className="guildraid-idle">
            <div>No active raid. Start one to fight through 5 waves together!</div>
            <div className="guildraid-waves-preview">
              {(waves || []).map(w => (
                <div key={w.wave} className="guildraid-wave-chip">
                  Wave {w.wave}: {w.name} · 💎{w.gemReward}
                </div>
              ))}
            </div>
          </div>
          <button className="guildraid-start-btn" onClick={handleStart} disabled={acting}>
            {acting ? '...' : '⚔️ Start Guild Raid'}
          </button>
        </>
      ) : (
        <div className="guildraid-active">
          <div className="guildraid-wave-info">
            <span>Wave {raid.wave} / {waves?.length || 5}</span>
            <span>{raid.bossName}</span>
          </div>
          <div className="guildraid-hp-wrap">
            <div className="guildraid-hp-bar" style={{ width: `${Math.round(raid.bossHp / raid.bossMaxHp * 100)}%` }} />
          </div>
          <div className="guildraid-hp-text">{raid.bossHp.toLocaleString()} / {raid.bossMaxHp.toLocaleString()}</div>

          <div className="guildraid-waves-row">
            {(waves || []).map(w => (
              <div key={w.wave} className={`guildraid-dot${w.wave < raid.wave ? ' done' : w.wave === raid.wave ? ' current' : ''}`}>
                {w.wave}
              </div>
            ))}
          </div>

          <button className="guildraid-tap-btn" onClick={handleTap} disabled={acting}>
            {acting ? '...' : '⚔️ ATTACK! (×20)'}
          </button>

          {participants?.length > 0 && (
            <div className="guildraid-participants">
              {participants.map((p, i) => (
                <div key={i} className="guildraid-participant">
                  <span>{p.username}</span>
                  <span>{p.damage.toLocaleString()} dmg</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
