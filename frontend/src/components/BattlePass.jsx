import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

const REWARD_ICON = { coins: '💰', gems: '💎', energy_refill: '⚡', skill_points: '🧪', '2x_boost': '🔥', skin: '🎨' };

export default function BattlePass({ onGemsChanged }) {
  const t = useT();
  const [data, setData] = useState(null);
  const [claiming, setClaiming] = useState(null);
  const [buying, setBuying] = useState(false);

  const load = () => api.battlepass.status().then(setData);
  useEffect(() => { load(); }, []);

  const handleClaim = async (level, premium) => {
    const key = `${level}_${premium ? 'p' : 'f'}`;
    if (claiming) return;
    setClaiming(key);
    try {
      await api.battlepass.claim(level, premium);
      load();
    } catch (err) { alert(err.message || t('upgrade_err')); }
    finally { setClaiming(null); }
  };

  const handleBuyPremium = async () => {
    if (buying) return;
    setBuying(true);
    try {
      await api.battlepass.buyPremium();
      onGemsChanged?.(-data.premiumCost);
      load();
    } catch (err) { alert(err.message || t('upgrade_err')); }
    finally { setBuying(false); }
  };

  if (!data) return <div className="tap-loading">{t('bp_loading')}</div>;

  const xpPct = Math.min(100, ((data.xp % 500) / 500) * 100);

  return (
    <div className="bp-section">
      <div className="bp-header">
        <span className="bp-title">{t('bp_title')}</span>
        <div className="bp-level-badge">{t('bp_level', { n: data.level })}</div>
      </div>

      <div className="bp-xp-bar">
        <div className="bp-xp-fill" style={{ width: `${xpPct}%` }} />
      </div>
      <div className="bp-xp-label">{t('bp_xp_label', { cur: data.xp % 500, max: 500 })}</div>

      {!data.premium && (
        <button className="bp-premium-btn" onClick={handleBuyPremium} disabled={buying}>
          {buying ? '...' : t('bp_premium', { n: data.premiumCost })}
        </button>
      )}
      {data.premium && <div className="bp-premium-active">{t('bp_premium_active')}</div>}

      <div className="bp-levels">
        {data.levels.filter((l) => l.free || l.premium).map((lvl) => (
          <div key={lvl.level} className={`bp-level-row${lvl.unlocked ? ' bp-level-row--unlocked' : ''}`}>
            <span className="bp-level-num">{t('bp_level', { n: lvl.level })}</span>
            {lvl.free && (
              <div className={`bp-reward${lvl.free.claimed ? ' bp-reward--claimed' : ''}`}>
                <span>{REWARD_ICON[lvl.free.type] || '🎁'}</span>
                <span className="bp-reward-label">
                  {lvl.free.amount ? `${lvl.free.amount}` : lvl.free.skin ? (t('bp_reward_skin') || lvl.free.skin) : (t('bp_reward_type_' + lvl.free.type) || lvl.free.type)}
                </span>
                {lvl.free.canClaim && (
                  <button className="bp-claim-btn" onClick={() => handleClaim(lvl.level, false)}
                    disabled={!!claiming}>
                    {claiming === `${lvl.level}_f` ? '...' : t('bp_claim')}
                  </button>
                )}
                {lvl.free.claimed && <span className="bp-claimed-tag">✓</span>}
              </div>
            )}
            {lvl.premium && (
              <div className={`bp-reward bp-reward--premium${lvl.premium.claimed ? ' bp-reward--claimed' : ''}${!data.premium ? ' bp-reward--locked' : ''}`}>
                <span>⭐ {REWARD_ICON[lvl.premium.type] || '🎁'}</span>
                <span className="bp-reward-label">
                  {lvl.premium.amount ? `${lvl.premium.amount}` : lvl.premium.skin ? (t('bp_reward_skin') || lvl.premium.skin) : (t('bp_reward_type_' + lvl.premium.type) || lvl.premium.type)}
                </span>
                {lvl.premium.canClaim && (
                  <button className="bp-claim-btn" onClick={() => handleClaim(lvl.level, true)}
                    disabled={!!claiming}>
                    {claiming === `${lvl.level}_p` ? '...' : t('bp_claim')}
                  </button>
                )}
                {lvl.premium.claimed && <span className="bp-claimed-tag">✓</span>}
                {!data.premium && !lvl.premium.claimed && <span className="bp-locked-tag">🔒</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
