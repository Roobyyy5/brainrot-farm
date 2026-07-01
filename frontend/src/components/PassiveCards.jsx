import { useState, useEffect } from 'react';
import { api } from '../api';

const CATEGORY_META = {
  tech:    { label: '🔬 Tech',    color: '#00e5ff' },
  finance: { label: '💰 Finance', color: '#f5c344' },
  social:  { label: '🌐 Social',  color: '#ff4fa3' },
};

export default function PassiveCards({ userCoins, onCoinsSpent }) {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('tech');
  const [buying, setBuying] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => api.cards.list().then(setData).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleBuy = async (key, cost) => {
    if (buying) return;
    setBuying(key);
    try {
      await api.cards.buy(key);
      onCoinsSpent?.(cost);
      load();
    } catch (err) {
      alert(err.message || 'Cannot buy');
    } finally {
      setBuying(null);
    }
  };

  if (loading) return <div className="tap-loading">Loading cards...</div>;
  if (!data) return null;

  const categories = ['tech', 'finance', 'social'];
  const filtered = data.cards.filter((c) => c.category === activeTab);

  return (
    <div className="cards-section">
      <div className="cards-header">
        <div className="cards-income-badge">
          <span className="cards-income-value">+{data.totalPerHour.toLocaleString()}</span>
          <span className="cards-income-label">BP/hr passive</span>
        </div>
        {data.referralBoostPct > 0 && (
          <span className="cards-ref-boost">+{data.referralBoostPct}% referral bonus</span>
        )}
      </div>

      <div className="cards-tabs">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`cards-tab${activeTab === cat ? ' cards-tab--active' : ''}`}
            style={activeTab === cat ? { borderColor: CATEGORY_META[cat].color, color: CATEGORY_META[cat].color } : {}}
            onClick={() => setActiveTab(cat)}
          >
            {CATEGORY_META[cat].label}
          </button>
        ))}
      </div>

      <div className="cards-grid">
        {filtered.map((card) => {
          const canAfford = userCoins >= (card.cost || 0);
          return (
            <div
              key={card.key}
              className={`card-item${card.isOwned ? ' card-item--owned' : ''}${card.isMaxed ? ' card-item--maxed' : ''}`}
            >
              <div className="card-icon">{card.icon}</div>
              <div className="card-name">{card.name}</div>
              <div className="card-desc">{card.description}</div>

              {card.isOwned && (
                <div className="card-level-dots">
                  {Array.from({ length: Math.min(card.level, 5) }).map((_, i) => (
                    <span key={i} className="card-dot card-dot--filled" />
                  ))}
                  {card.level > 5 && <span className="card-lvl-text">Lv{card.level}</span>}
                </div>
              )}

              <div className="card-income">
                {card.isOwned ? (
                  <>
                    <span className="card-income-now">+{card.incomePerHour}/hr</span>
                    {!card.isMaxed && (
                      <span className="card-income-next"> → +{card.nextIncomePerHour}/hr</span>
                    )}
                  </>
                ) : (
                  <span className="card-income-none">+{card.nextIncomePerHour}/hr</span>
                )}
              </div>

              {card.isMaxed ? (
                <span className="card-maxed">MAX ✓</span>
              ) : (
                <button
                  className={`card-buy-btn${!canAfford ? ' card-buy-btn--broke' : ''}`}
                  onClick={() => handleBuy(card.key, card.cost)}
                  disabled={!!buying || !canAfford}
                >
                  {buying === card.key ? '...' : `🪙 ${card.cost?.toLocaleString()}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
