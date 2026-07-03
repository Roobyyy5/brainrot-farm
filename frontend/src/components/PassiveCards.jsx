import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

const CATEGORY_META = {
  tech:    { icon: '🔬', color: '#00e5ff' },
  finance: { icon: '💰', color: '#f5c344' },
  social:  { icon: '🌐', color: '#ff4fa3' },
};

export default function PassiveCards({ userCoins, onCoinsSpent }) {
  const t = useT();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('tech');
  const [buying, setBuying] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => api.cards.list().then(setData).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const cardName = (card) => { const k = 'card_' + card.key + '_name'; const v = t(k); return v === k ? card.name : v; };
  const cardDesc = (card) => { const k = 'card_' + card.key + '_desc'; const v = t(k); return v === k ? card.description : v; };

  const handleBuy = async (key, cost) => {
    if (buying) return;
    setBuying(key);
    try {
      await api.cards.buy(key);
      onCoinsSpent?.(cost);
      load();
    } catch (err) {
      alert(err.message || t('upgrade_err'));
    } finally {
      setBuying(null);
    }
  };

  if (loading) return <div className="tap-loading">{t('cards_loading')}</div>;
  if (!data) return null;

  const categories = ['tech', 'finance', 'social'];
  const filtered = data.cards.filter((c) => c.category === activeTab);

  return (
    <div className="cards-section">
      <div className="cards-header">
        <div className="cards-income-badge">
          <span className="cards-income-value">+{data.totalPerHour.toLocaleString()}</span>
          <span className="cards-income-label">{t('cards_bp_hr')}</span>
        </div>
        {data.referralBoostPct > 0 && (
          <span className="cards-ref-boost">{t('cards_ref_bonus', { n: data.referralBoostPct })}</span>
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
            {CATEGORY_META[cat].icon} {t('card_cat_' + cat)}
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
              <div className="card-name">{cardName(card)}</div>
              <div className="card-desc">{cardDesc(card)}</div>

              {card.isOwned && (
                <div className="card-level-dots">
                  {Array.from({ length: Math.min(card.level, 5) }).map((_, i) => (
                    <span key={i} className="card-dot card-dot--filled" />
                  ))}
                  {card.level > 5 && <span className="card-lvl-text">{t('cards_lv', { n: card.level })}</span>}
                </div>
              )}

              <div className="card-income">
                {card.isOwned ? (
                  <>
                    <span className="card-income-now">+{card.incomePerHour}{t('hr_suffix')}</span>
                    {!card.isMaxed && (
                      <span className="card-income-next"> → +{card.nextIncomePerHour}{t('hr_suffix')}</span>
                    )}
                  </>
                ) : (
                  <span className="card-income-none">+{card.nextIncomePerHour}{t('hr_suffix')}</span>
                )}
              </div>

              {card.isMaxed ? (
                <span className="card-maxed">{t('cards_max')}</span>
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
