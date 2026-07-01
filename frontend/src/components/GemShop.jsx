import { useState, useEffect } from 'react';
import { api } from '../api';

const SKIN_EMOJIS = {
  default:      '🧠',
  prestige1:    '⭐🧠',
  prestige2:    '💫🧠',
  prestige3:    '🌟🧠',
  skin_fire:    '🔥🧠',
  skin_diamond: '💎🧠',
  skin_crown:   '👑🧠',
};

export default function GemShop({ onGemsChanged, onCoinsChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const [equipping, setEquipping] = useState(null);
  const [tab, setTab] = useState('shop');

  const load = () => api.gemshop.status().then(setData).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleBuy = async (key, cost, type) => {
    if (buying) return;
    setBuying(key);
    try {
      const res = await api.gemshop.buy(key);
      onGemsChanged?.(-cost);
      if (res.bonusCoins) onCoinsChanged?.(res.bonusCoins);
      load();
    } catch (err) {
      alert(err.message || 'Cannot buy');
    } finally {
      setBuying(null);
    }
  };

  const handleEquip = async (skinKey) => {
    if (equipping) return;
    setEquipping(skinKey);
    try {
      await api.gemshop.equipSkin(skinKey);
      load();
    } catch (err) {
      alert(err.message || 'Cannot equip');
    } finally {
      setEquipping(null);
    }
  };

  if (loading) return <div className="tap-loading">Loading Gem Shop...</div>;
  if (!data) return null;

  const boostSecondsLeft = data.activeBoostExpiresAt
    ? Math.max(0, Math.floor((data.activeBoostExpiresAt - Date.now()) / 1000))
    : 0;

  return (
    <div className="gemshop-section">
      <div className="gemshop-header">
        <span className="gemshop-title">💎 Gem Shop</span>
        <span className="gemshop-balance">💎 {data.gems} gems</span>
      </div>

      {boostSecondsLeft > 0 && (
        <div className="gemshop-boost-active">
          🔥 2× Tap Boost active — {Math.floor(boostSecondsLeft / 60)}m {boostSecondsLeft % 60}s left
        </div>
      )}

      <div className="gemshop-tabs">
        <button className={`gemshop-tab${tab === 'shop' ? ' gemshop-tab--active' : ''}`} onClick={() => setTab('shop')}>
          🛒 Shop
        </button>
        <button className={`gemshop-tab${tab === 'skins' ? ' gemshop-tab--active' : ''}`} onClick={() => setTab('skins')}>
          🎨 Skins
        </button>
      </div>

      {tab === 'shop' && (
        <div className="gemshop-items">
          {data.items.map((item) => (
            <div key={item.key} className={`gemshop-item${item.owned ? ' gemshop-item--owned' : ''}`}>
              <span className="gemshop-item-icon">{item.icon}</span>
              <div className="gemshop-item-info">
                <div className="gemshop-item-name">{item.name}</div>
                <div className="gemshop-item-desc">{item.description}</div>
              </div>
              {item.owned ? (
                <span className="gemshop-item-owned">✓ Owned</span>
              ) : (
                <button
                  className="gemshop-buy-btn"
                  onClick={() => handleBuy(item.key, item.cost, item.type)}
                  disabled={!!buying || !item.canAfford}
                >
                  {buying === item.key ? '...' : `💎 ${item.cost}`}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'skins' && (
        <div className="skins-grid">
          {data.skins.map((skin) => (
            <div
              key={skin.key}
              className={`skin-card${skin.unlocked ? ' skin-card--unlocked' : ''}${data.selectedSkin === skin.key ? ' skin-card--selected' : ''}`}
            >
              <div className="skin-emoji">{SKIN_EMOJIS[skin.key] || '🧠'}</div>
              <div className="skin-name">{skin.name}</div>
              <div className="skin-unlock-hint">
                {!skin.unlocked && skin.unlock === 'gem_shop' && '(buy in shop)'}
                {!skin.unlocked && skin.unlock === 'prestige' && `(prestige ${skin.minPrestige})`}
              </div>
              {skin.unlocked && data.selectedSkin !== skin.key && (
                <button
                  className="skin-equip-btn"
                  onClick={() => handleEquip(skin.key)}
                  disabled={equipping === skin.key}
                >
                  {equipping === skin.key ? '...' : 'Equip'}
                </button>
              )}
              {data.selectedSkin === skin.key && (
                <span className="skin-active">Active ✓</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
