import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function Guilds({ onGemsChanged }) {
  const t = useT();
  const [guild, setGuild] = useState(undefined);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [view, setView] = useState('main');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [bossCount, setBossCount] = useState(1);

  const loadGuild = () => api.guilds.my().then((d) => setGuild(d.guild)).finally(() => setLoading(false));
  useEffect(() => { loadGuild(); }, []);

  const handleSearch = async () => {
    const res = await api.guilds.search(search);
    setSearchResults(res.guilds);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (acting) return;
    const name = e.target.name.value.trim();
    const tag = e.target.tag.value.trim();
    const description = e.target.description.value.trim();
    setActing(true);
    try {
      await api.guilds.create(name, tag, description);
      loadGuild();
      setView('main');
    } catch (err) { alert(err.message || t('upgrade_err')); }
    finally { setActing(false); }
  };

  const handleJoin = async (guildId) => {
    if (acting) return;
    setActing(true);
    try {
      await api.guilds.join(guildId);
      loadGuild();
      setView('main');
    } catch (err) { alert(err.message || t('upgrade_err')); }
    finally { setActing(false); }
  };

  const handleLeave = async () => {
    if (!window.confirm(t('guild_leave') + '?')) return;
    setActing(true);
    try { await api.guilds.leave(); loadGuild(); } catch (err) { alert(err.message); }
    finally { setActing(false); }
  };

  const handleBossTap = async () => {
    if (!guild?.boss || acting) return;
    setActing(true);
    try {
      const res = await api.guilds.bossTap(bossCount);
      if (res.gemReward > 0) onGemsChanged?.(res.gemReward);
      loadGuild();
    } catch (err) { alert(err.message); }
    finally { setActing(false); }
  };

  if (loading) return <div className="tap-loading">{t('guild_loading')}</div>;

  if (!guild) {
    return (
      <div className="guild-section">
        <div className="guild-header">
          <span className="guild-title">{t('guild_title')}</span>
        </div>
        <div className="guild-no-guild">
          <p>{t('guild_not_in')}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="guild-action-btn" onClick={() => setView(view === 'create' ? 'main' : 'create')}>
              ➕ {t('guild_create')}
            </button>
            <button className="guild-action-btn" onClick={() => setView(view === 'search' ? 'main' : 'search')}>
              🔍 {t('guild_join')}
            </button>
          </div>
        </div>

        {view === 'create' && (
          <form className="guild-create-form" onSubmit={handleCreate}>
            <input name="name" placeholder={t('guild_name_ph')} maxLength={30} required className="guild-input" />
            <input name="tag" placeholder={t('guild_tag_ph')} maxLength={6} required className="guild-input" />
            <input name="description" placeholder="..." className="guild-input" />
            <button type="submit" className="guild-submit-btn" disabled={acting}>
              {acting ? '...' : t('guild_create')}
            </button>
          </form>
        )}

        {view === 'search' && (
          <div className="guild-search">
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className="guild-input"
                placeholder={t('guild_search_ph')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="guild-action-btn" onClick={handleSearch}>{t('guild_search_btn')}</button>
            </div>
            {searchResults.map((g) => (
              <div key={g.id} className="guild-search-row">
                <div>
                  <strong>[{g.tag}] {g.name}</strong>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>{g.member_count}/10 · {t('guild_lv_prefix')}{g.level}</div>
                </div>
                <button className="guild-join-btn" onClick={() => handleJoin(g.id)} disabled={acting}>
                  {t('guild_join')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="guild-section">
      <div className="guild-header">
        <span className="guild-title">🏰 [{guild.tag}] {guild.name}</span>
        <span className="guild-level">{t('guild_lv_prefix')}{guild.level}</span>
      </div>

      {guild.boss ? (
        <div className="guild-boss-card">
          <div className="guild-boss-name">👾 {guild.boss.name}</div>
          <div className="guild-boss-hp-bar">
            <div className="guild-boss-hp-fill" style={{ width: `${(guild.boss.hp / guild.boss.maxHp) * 100}%` }} />
          </div>
          <div className="guild-boss-hp-text">
            {guild.boss.hp.toLocaleString()} / {guild.boss.maxHp.toLocaleString()} HP · 💎{guild.boss.rewardGems}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <input
              type="number" min={1} max={500} value={bossCount}
              onChange={(e) => setBossCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="guild-tap-input"
            />
            <button className="guild-boss-tap-btn" onClick={handleBossTap} disabled={acting}>
              {acting ? '...' : `⚔️ ${t('guild_attack')}`}
            </button>
          </div>
        </div>
      ) : (
        <div className="guild-boss-waiting">⏳ {t('guild_no_boss')}</div>
      )}

      <div className="guild-members-title">👥 {t('guild_members')} ({guild.members.length}/10)</div>
      <div className="guild-members">
        {guild.members.map((m) => (
          <div key={m.telegram_id} className="guild-member-row">
            <span className="guild-member-role">{m.role === 'owner' ? '👑' : '👤'}</span>
            <span className="guild-member-name">{m.username || `User_${String(m.telegram_id).slice(-4)}`}</span>
            <span className="guild-member-contrib">⚔️ {Number(m.weekly_contribution).toLocaleString()}</span>
          </div>
        ))}
      </div>

      {guild.role !== 'owner' && (
        <button className="guild-leave-btn" onClick={handleLeave} disabled={acting}>{t('guild_leave')}</button>
      )}
    </div>
  );
}
