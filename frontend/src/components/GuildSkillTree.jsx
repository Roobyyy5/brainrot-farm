import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

const BRANCH_COLOR = { offense: '#ef4444', defense: '#60a5fa', economy: '#34d399', war: '#f59e0b' };

export default function GuildSkillTree() {
  const t = useT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('skills');

  const load = () => api.guildskilltree.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const act = async (fn) => {
    setLoading(true);
    try { await fn(); await load(); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;
  if (!data.inGuild) return (
    <div className="gskilltree-panel">
      <div className="gskilltree-header">{t('gst_header')}</div>
      <div className="gskilltree-noguild">{t('gst_no_guild')}</div>
    </div>
  );

  const { guild, skills, bonuses } = data;
  const xpPct = guild.skillLevel < 30 ? Math.min(100, guild.skillXp / guild.xpForNextLevel * 100) : 100;

  return (
    <div className="gskilltree-panel">
      <div className="gskilltree-header">{t('gst_header')}</div>

      <div className="gskilltree-guild-info">
        <div className="gskilltree-guild-name">{guild.name}</div>
        <div className="gskilltree-level">{t('gst_level', { n: guild.skillLevel })}</div>
        <div className="gskilltree-xp-bar">
          <div className="gskilltree-xp-fill" style={{ width: `${xpPct}%` }} />
        </div>
        <div className="gskilltree-xp-label">{guild.skillXp.toLocaleString()} / {guild.xpForNextLevel.toLocaleString()} XP</div>
      </div>

      <div className="gskilltree-tabs">
        <button className={tab === 'skills' ? 'active' : ''} onClick={() => setTab('skills')}>{t('gst_tab_skills')}</button>
        <button className={tab === 'bonuses' ? 'active' : ''} onClick={() => setTab('bonuses')}>{t('gst_tab_bonuses')}</button>
        <button className={tab === 'contribute' ? 'active' : ''} onClick={() => setTab('contribute')}>{t('gst_tab_contribute')}</button>
      </div>

      {tab === 'contribute' && (
        <div className="gskilltree-contribute">
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
            {t('gst_contribute_desc')}
          </p>
          <button className="gskilltree-contribute-btn" onClick={() => act(() => api.guildskilltree.contribute(100))} disabled={loading}>
            {t('gst_contribute_btn')}
          </button>
        </div>
      )}

      {tab === 'bonuses' && (
        <div className="gskilltree-bonuses">
          {bonuses.tapPctBonus > 0    && <div className="gskilltree-bonus-row">⚡ {t('guild_tap_power_label')} <span>+{bonuses.tapPctBonus}%</span></div>}
          {bonuses.energyBonus > 0    && <div className="gskilltree-bonus-row">🔋 {t('guild_max_energy_label')} <span>+{bonuses.energyBonus.toLocaleString()}</span></div>}
          {bonuses.gemDropPct > 0     && <div className="gskilltree-bonus-row">💎 {t('guild_gem_drop_label')} <span>+{(bonuses.gemDropPct * 100).toFixed(1)}%</span></div>}
          {bonuses.bossDamagePct > 0  && <div className="gskilltree-bonus-row">💣 {t('guild_boss_damage_label')} <span>+{bonuses.bossDamagePct}%</span></div>}
          {bonuses.offlinePct > 0     && <div className="gskilltree-bonus-row">🤖 {t('guild_offline_income_label')} <span>+{bonuses.offlinePct}%</span></div>}
          {bonuses.bracketDmgPct > 0  && <div className="gskilltree-bonus-row">🥁 {t('guild_war_damage_label')} <span>+{bonuses.bracketDmgPct}%</span></div>}
          {Object.values(bonuses).every(v => v === 0) && (
            <div style={{ color: 'var(--text-faint)', fontSize: '0.8rem', textAlign: 'center', padding: 12 }}>{t('gst_no_bonuses')}</div>
          )}
        </div>
      )}

      {tab === 'skills' && (
        <div className="gskilltree-list">
          {skills.map(s => {
            const isMaxed = s.currentLevel >= s.maxLevel;
            const cost = s.costPerLevel * (s.currentLevel + 1);
            return (
              <div key={s.key} className="gskilltree-skill" style={{ borderLeftColor: BRANCH_COLOR[s.branch] || '#888' }}>
                <div className="gskilltree-skill-top">
                  <span className="gskilltree-skill-icon">{s.icon}</span>
                  <div className="gskilltree-skill-info">
                    <div className="gskilltree-skill-name">{s.name}</div>
                    <div className="gskilltree-skill-desc">{s.desc}</div>
                  </div>
                  <div className="gskilltree-skill-level">
                    {isMaxed ? <span className="gskilltree-maxed">{t('common_max')}</span> : `${s.currentLevel}/${s.maxLevel}`}
                  </div>
                </div>
                {!isMaxed && (
                  <button
                    className="gskilltree-upgrade-btn"
                    onClick={() => act(() => api.guildskilltree.upgrade(s.key))}
                    disabled={loading || guild.skillXp < cost}
                  >
                    {t('gst_upgrade_btn', { n: cost.toLocaleString() })}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
