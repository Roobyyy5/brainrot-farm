import { useState, useEffect } from 'react';
import { api } from '../api';

export default function PrestigeShop() {
  const [data, setData] = useState(null);
  const [buying, setBuying] = useState(null);

  const load = () => api.prestigeshop.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleBuy = async (upgradeKey) => {
    if (buying) return;
    setBuying(upgradeKey);
    try {
      await api.prestigeshop.buy(upgradeKey);
      await load();
    } catch (err) { alert(err.message); }
    finally { setBuying(null); }
  };

  if (!data) return null;
  if (data.prestige < 1) return null; // only show after first prestige

  return (
    <div className="pshop-section">
      <div className="pshop-header">✨ Prestige Shop</div>
      <div className="pshop-tokens">💠 {data.prestigeTokens} prestige token{data.prestigeTokens !== 1 ? 's' : ''}</div>
      <div className="pshop-sub">Permanent upgrades that survive prestige resets.</div>
      <div className="pshop-list">
        {data.items.map(item => (
          <div key={item.key} className={`pshop-item${item.isMaxed ? ' pshop-item--maxed' : ''}`}>
            <div className="pshop-item-icon">{item.icon}</div>
            <div className="pshop-item-info">
              <div className="pshop-item-name">{item.name}</div>
              <div className="pshop-item-desc">{item.desc}</div>
              <div className="pshop-item-level">
                {'◆'.repeat(item.currentLevel)}{'◇'.repeat(item.maxLevel - item.currentLevel)}
                {' '}Lv.{item.currentLevel}/{item.maxLevel}
              </div>
            </div>
            {item.isMaxed ? (
              <div className="pshop-maxed-badge">MAX</div>
            ) : (
              <button
                className="pshop-buy-btn"
                onClick={() => handleBuy(item.key)}
                disabled={!item.canUpgrade || buying === item.key}
              >
                {buying === item.key ? '...' : `💠${item.cost}`}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
