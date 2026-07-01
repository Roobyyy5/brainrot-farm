import { useState, useEffect } from 'react';
import { api } from '../api';

const REWARD_ICON = { coins: '💰', gems: '💎', energy_refill: '⚡', skill_points: '🧪', '2x_boost': '🔥', skin: '🎨' };

export default function BattlePass({ onGemsChanged }) {
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
    } catch (err) { alert(err.message || 'Cannot claim'); }
    finally { setClaiming(null); }
  };

  const handleBuyPremium = async () => {
    if (buying) return;
    setBuying(true);
    try {
      await api.battlepass.buyPremium();
      onGemsChanged?.(-data.premiumCost);
      load();
    } catch (err) { alert(err.message || 'Cannot buy premium'); }
    finally { setBuying(false); }
  };

  if (!data) return <div className="tap-loading">Loading Battle Pass...</div>;

  const xpPct = Math.min(100, ((data.xp % 500) / 500) * 100);

  return (
    <div className="bp-section">
      <div className="bp-header">
        <span className="bp-title">🎫 Battle Pass</span>
        <div className="bp-level-badge">Lv.{data.level}</div>
      </div>

      <div className="bp-xp-bar">
        <div className="bp-xp-fill" style={{ width: `${xpPct}%` }} />
      </div>
      <div className="bp-xp-label">{data.xp % 500}/{500} XP to next level</div>

      {!data.premium && (
        <button className="bp-premium-btn" onClick={handleBuyPremium} disabled={buying}>
          {buying ? '...' : `⭐ Go Premium — 💎${data.premiumCost}`}
        </button>
      )}
      {data.premium && <div className="bp-premium-active">⭐ Premium Active</div>}

      <div className="bp-levels">
        {data.levels.filter((l) => l.free || l.premium).map((lvl) => (
          <div key={lvl.level} className={`bp-level-row${lvl.unlocked ? ' bp-level-row--unlocked' : ''}`}>
            <span className="bp-level-num">Lv.{lvl.level}</span>
            {lvl.free && (
              <div className={`bp-reward${lvl.free.claimed ? ' bp-reward--claimed' : ''}`}>
                <span>{REWARD_ICON[lvl.free.type] || '🎁'}</span>
                <span className="bp-reward-label">
                  {lvl.free.amount ? `${lvl.free.amount}` : lvl.free.skin || lvl.free.type}
                </span>
                {lvl.free.canClaim && (
                  <button className="bp-claim-btn" onClick={() => handleClaim(lvl.level, false)}
                    disabled={!!claiming}>
                    {claiming === `${lvl.level}_f` ? '...' : 'Claim'}
                  </button>
                )}
                {lvl.free.claimed && <span className="bp-claimed-tag">✓</span>}
              </div>
            )}
            {lvl.premium && (
              <div className={`bp-reward bp-reward--premium${lvl.premium.claimed ? ' bp-reward--claimed' : ''}${!data.premium ? ' bp-reward--locked' : ''}`}>
                <span>⭐ {REWARD_ICON[lvl.premium.type] || '🎁'}</span>
                <span className="bp-reward-label">
                  {lvl.premium.amount ? `${lvl.premium.amount}` : lvl.premium.skin || lvl.premium.type}
                </span>
                {lvl.premium.canClaim && (
                  <button className="bp-claim-btn" onClick={() => handleClaim(lvl.level, true)}
                    disabled={!!claiming}>
                    {claiming === `${lvl.level}_p` ? '...' : 'Claim'}
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
