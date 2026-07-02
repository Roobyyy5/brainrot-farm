import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function DailyShop({ onGemsChanged }) {
  const t = useT();
  const [data, setData] = useState(null);
  const [buying, setBuying] = useState(null);
  const [lootResult, setLootResult] = useState(null);

  const load = () => api.dailyshop.status().then(setData);
  useEffect(() => { load(); }, []);

  const handleBuy = async (itemKey, cost) => {
    if (buying) return;
    setBuying(itemKey);
    try {
      const res = await api.dailyshop.buy(itemKey);
      onGemsChanged?.(-cost);
      if (res.lootResult) setLootResult(res.lootResult);
      load();
    } catch (err) { alert(err.message || t('upgrade_err')); }
    finally { setBuying(null); }
  };

  const msLeft = data ? data.refreshesAt - Date.now() : 0;
  const hoursLeft = Math.max(0, Math.floor(msLeft / 3_600_000));
  const minsLeft = Math.max(0, Math.floor((msLeft % 3_600_000) / 60_000));

  if (!data) return <div className="tap-loading">{t('dshop_loading')}</div>;

  return (
    <div className="daily-shop-section">
      <div className="daily-shop-header">
        <span className="daily-shop-title">{t('dshop_title')}</span>
        <span className="daily-shop-timer">🕐 {hoursLeft}h {minsLeft}m</span>
      </div>
      <div className="daily-shop-gems">{t('gems_balance', { n: data.gems })}</div>

      {lootResult && (
        <div className="loot-result" onClick={() => setLootResult(null)}>
          <div className="loot-result-label">🎁</div>
          <div className="loot-result-prize">{lootResult.label}</div>
        </div>
      )}

      <div className="daily-shop-items">
        {data.items.map((item) => (
          <div key={item.key} className={`ds-item${item.purchased ? ' ds-item--bought' : ''}`}>
            <span className="ds-item-icon">{item.icon}</span>
            <div className="ds-item-info">
              <div className="ds-item-name">{item.name}</div>
            </div>
            {item.purchased ? (
              <span className="ds-item-bought">✓</span>
            ) : (
              <button
                className="ds-buy-btn"
                onClick={() => handleBuy(item.key, item.cost)}
                disabled={!!buying || !item.canAfford}
              >
                {buying === item.key ? '...' : `💎 ${item.cost}`}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
