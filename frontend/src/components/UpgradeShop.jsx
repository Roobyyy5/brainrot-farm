import { useState, useEffect } from 'react';
import { api } from '../api';

export default function UpgradeShop({ userCoins, onCoinsSpent }) {
  const [upgrades, setUpgrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);

  useEffect(() => {
    api.tapper.upgrades()
      .then((d) => setUpgrades(d.upgrades))
      .finally(() => setLoading(false));
  }, []);

  const handleBuy = async (type, cost) => {
    if (buying) return;
    setBuying(type);
    try {
      const res = await api.tapper.upgrade(type);
      setUpgrades(res.upgrades);
      onCoinsSpent?.(cost);
    } catch (err) {
      alert(err.message || 'Cannot upgrade');
    } finally {
      setBuying(null);
    }
  };

  if (loading) return <div className="tap-loading">Loading upgrades...</div>;

  return (
    <div className="upgrade-shop">
      <h3 className="upgrade-shop-title">⚡ Upgrade Shop</h3>
      <div className="upgrade-list">
        {upgrades.map((upg) => (
          <div key={upg.type} className={`upgrade-card${upg.isMaxed ? ' upgrade-card--maxed' : ''}`}>
            <div className="upgrade-icon">{upg.icon}</div>
            <div className="upgrade-info">
              <div className="upgrade-name">{upg.label}</div>
              <div className="upgrade-desc">{upg.description}</div>
              <div className="upgrade-effect">
                {upg.currentEffect} {upg.unit}
                {!upg.isMaxed && (
                  <span className="upgrade-effect-next"> → {upg.nextEffect} {upg.unit}</span>
                )}
              </div>
              <div className="upgrade-level-dots">
                {Array.from({ length: upg.maxLevel }).map((_, i) => (
                  <span
                    key={i}
                    className={`upgrade-dot${i < upg.currentLevel ? ' upgrade-dot--filled' : ''}`}
                  />
                ))}
              </div>
            </div>
            <div className="upgrade-action">
              {upg.isMaxed ? (
                <span className="upgrade-maxed-badge">MAX</span>
              ) : (
                <button
                  className="upgrade-buy-btn"
                  onClick={() => handleBuy(upg.type, upg.cost)}
                  disabled={!!buying || userCoins < upg.cost}
                >
                  {buying === upg.type ? '...' : (
                    <>🪙 {upg.cost?.toLocaleString()}</>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
