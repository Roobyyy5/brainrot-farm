import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

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
  const t = useT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const [equipping, setEquipping] = useState(null);
  const [tab, setTab] = useState('shop');

  const load = () => api.gemshop.status().then(setData).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleBuy = async (key, cost) => {
    if (buying) return;
    setBuying(key);
    try {
      const res = await api.gemshop.buy(key);
      onGemsChanged?.(-cost);
      if (res.bonusCoins) onCoinsChanged?.(res.bonusCoins);
      load();
    } catch (err) {
      alert(err.message || t('upgrade_err'));
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
      alert(err.message || t('upgrade_err'));
    } finally {
      setEquipping(null);
    }
  };

  if (loading) return <div className="tap-loading">{t('gems_loading')}</div>;
  if (!data) return null;

  const boostSecondsLeft = data.activeBoostExpiresAt
    ? Math.max(0, Math.floor((data.activeBoostExpiresAt - Date.now()) / 1000))
    : 0;

  return (
    <div className="gemshop-section">
      <div className="gemshop-header">
        <span className="gemshop-title">{t('gems_title')}</span>
        <span className="gemshop-balance">{t('gems_balance', { n: data.gems })}</span>
      </div>

      {boostSecondsLeft > 0 && (
        <div className="gemshop-boost-active">
          {t('gems_boost_active', { m: Math.floor(boostSecondsLeft / 60), s: boostSecondsLeft % 60 })}
        </div>
      )}

      <div className="gemshop-tabs">
        <button className={`gemshop-tab${tab === 'shop' ? ' gemshop-tab--active' : ''}`} onClick={() => setTab('shop')}>
          {t('gems_tab_shop')}
        </button>
        <button className={`gemshop-tab${tab === 'skins' ? ' gemshop-tab--active' : ''}`} onClick={() => setTab('skins')}>
          {t('gems_tab_skins')}
        </button>
      </div>

      {tab === 'shop' && (
        <div className="gemshop-items">
          {data.items.map((item) => (
            <div key={item.key} className={`gemshop-item${item.owned ? ' gemshop-item--owned' : ''}`}>
              <span className="gemshop-item-icon">{item.icon}</span>
              <div className="gemshop-item-info">
                <div className="gemshop-item-name">{t('gemshop_' + item.key + '_name')}</div>
                <div className="gemshop-item-desc">{t('gemshop_' + item.key + '_desc')}</div>
              </div>
              {item.owned ? (
                <span className="gemshop-item-owned">{t('gems_owned')}</span>
              ) : (
                <button
                  className="gemshop-buy-btn"
                  onClick={() => handleBuy(item.key, item.cost)}
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
              <div className="skin-name">{t(skin.key + '_name')}</div>
              <div className="skin-unlock-hint">
                {!skin.unlocked && skin.unlock === 'gem_shop' && t('gems_buy_shop')}
                {!skin.unlocked && skin.unlock === 'prestige' && t('gems_prestige_n', { n: skin.minPrestige })}
              </div>
              {skin.unlocked && data.selectedSkin !== skin.key && (
                <button
                  className="skin-equip-btn"
                  onClick={() => handleEquip(skin.key)}
                  disabled={equipping === skin.key}
                >
                  {equipping === skin.key ? '...' : t('gems_equip')}
                </button>
              )}
              {data.selectedSkin === skin.key && (
                <span className="skin-active">{t('gems_active')}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
