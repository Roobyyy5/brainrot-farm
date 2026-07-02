import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function GuildRaid() {
  const t = useT();
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
      <div className="guildraid-header">{t('graid_title')}</div>

      {message === 'Not in a guild' ? (
        <div className="guildraid-empty">{t('graid_no_guild')}</div>
      ) : !raid ? (
        <>
          <div className="guildraid-idle">
            <div>{t('graid_idle')}</div>
            <div className="guildraid-waves-preview">
              {(waves || []).map(w => (
                <div key={w.wave} className="guildraid-wave-chip">
                  {t('graid_wave_chip', { n: w.wave, name: w.name, gems: w.gemReward })}
                </div>
              ))}
            </div>
          </div>
          <button className="guildraid-start-btn" onClick={handleStart} disabled={acting}>
            {acting ? '...' : t('graid_start')}
          </button>
        </>
      ) : (
        <div className="guildraid-active">
          <div className="guildraid-wave-info">
            <span>{t('graid_wave_info', { n: raid.wave, total: waves?.length || 5 })}</span>
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
            {acting ? '...' : t('graid_attack')}
          </button>

          {participants?.length > 0 && (
            <div className="guildraid-participants">
              {participants.map((p, i) => (
                <div key={i} className="guildraid-participant">
                  <span>{p.username}</span>
                  <span>{p.damage.toLocaleString()} {t('graid_dmg')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
