import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

const MECHANIC_ICON = {
  standard: '⚔️', no_stop: '🏃', burst: '💥', regen_boss: '💚',
  combo_only: '🌀', dark_phase: '🌑', reverse: '🔄', shields: '🛡️',
  enrage: '😡', final_boss: '💀',
};

export default function StoryMode() {
  const t = useT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('fight');
  const tapBtnRef = useRef(null);

  const load = () => api.campaign.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const start = async () => {
    setLoading(true);
    try { await api.campaign.start(); await load(); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const tapBoss = async (n = 50) => {
    try {
      const r = await api.campaign.tap(n);
      if (r.defeated) {
        alert(t('story_completed', { n: r.chapterId, gems: r.reward?.gems || 0 }));
        await load();
      } else {
        setData(prev => prev ? { ...prev, bossHp: r.newHp } : prev);
      }
    } catch (_) {}
  };

  const abandon = async () => {
    if (!confirm(t('story_confirm'))) return;
    await api.campaign.abandon();
    load();
  };

  if (!data) return null;

  const hpPct = data.bossMaxHp > 0 ? (data.bossHp / data.bossMaxHp) * 100 : 0;
  const ch = data.currentChapter;

  return (
    <div className="campaign-panel">
      <div className="campaign-header">{t('story_header')}</div>
      <div className="campaign-progress-badge">
        {t('story_progress', { n: data.chapter, max: data.maxChapter, done: data.completedChapters.length })}
      </div>

      <div className="campaign-tabs">
        <button className={tab === 'fight' ? 'active' : ''} onClick={() => setTab('fight')}>{t('story_tab_fight')}</button>
        <button className={tab === 'chapters' ? 'active' : ''} onClick={() => setTab('chapters')}>{t('story_tab_chapters')}</button>
      </div>

      {tab === 'fight' && (
        <div className="campaign-fight">
          {!data.active ? (
            <>
              <div className="campaign-boss-card">
                <div className="campaign-boss-icon">{ch?.icon}</div>
                <div className="campaign-boss-name">{ch?.name}</div>
                <div className="campaign-boss-mechanic">
                  {MECHANIC_ICON[ch?.mechanic]} {ch?.mechanicDesc}
                </div>
                <div className="campaign-boss-reward">
                  {t('story_reward', { rewards: Object.entries(ch?.reward || {}).filter(([k]) => k !== 'gems').map(([k, v]) => `${k}: +${v}`).join(' • ') + (ch?.reward?.gems ? ` • 💎 ${ch.reward.gems}` : '') })}
                </div>
              </div>
              <button className="campaign-start-btn" onClick={start} disabled={loading}>
                {t('story_start_btn', { n: ch?.id })}
              </button>
            </>
          ) : (
            <>
              <div className="campaign-active-boss">
                <div className="campaign-boss-icon-big">{ch?.icon}</div>
                <div className="campaign-boss-name">{ch?.name}</div>
                <div className="campaign-mechanic-badge">
                  {MECHANIC_ICON[ch?.mechanic]} {ch?.mechanicDesc}
                </div>
              </div>
              <div className="campaign-hp-wrap">
                <div className="campaign-hp-bar">
                  <div className="campaign-hp-fill" style={{ width: `${hpPct}%` }} />
                </div>
                <div className="campaign-hp-text">
                  {data.bossHp.toLocaleString()} / {data.bossMaxHp.toLocaleString()} HP
                </div>
              </div>
              <button
                ref={tapBtnRef}
                className="campaign-tap-btn"
                onClick={() => tapBoss(50)}
                disabled={loading}
              >
                {t('story_attack')}
              </button>
              <button className="campaign-abandon-btn" onClick={abandon}>{t('story_abandon')}</button>
            </>
          )}
        </div>
      )}

      {tab === 'chapters' && (
        <div className="campaign-chapters">
          {data.allChapters.map(c => (
            <div key={c.id} className={`campaign-ch-row ${c.completed ? 'done' : ''} ${!c.unlocked ? 'locked' : ''}`}>
              <span className="campaign-ch-icon">{c.icon}</span>
              <div className="campaign-ch-info">
                <div className="campaign-ch-name">{c.id}. {c.name}</div>
                <div className="campaign-ch-mech">{MECHANIC_ICON[c.mechanic]} {c.mechanicDesc}</div>
              </div>
              <div className="campaign-ch-status">
                {c.completed ? '✅' : c.unlocked ? '🔓' : '🔒'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
