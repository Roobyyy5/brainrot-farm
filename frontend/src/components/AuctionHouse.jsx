import { useState, useEffect } from 'react';
import { api } from '../api';

const ITEM_ICONS = { tap_shard: '🔷', energy_crystal: '💠', combo_dust: '✨', prestige_essence: '🌀' };
const ITEM_NAMES = { tap_shard: 'Tap Shard', energy_crystal: 'Energy Crystal', combo_dust: 'Combo Dust', prestige_essence: 'Prestige Essence' };

export default function AuctionHouse() {
  const [data, setData] = useState(null);
  const [view, setView] = useState('market'); // market | list | mylistings
  const [form, setForm] = useState({ itemType: 'tap_shard', quantity: 10, priceGems: 5 });
  const [loading, setLoading] = useState(false);

  const load = () => api.auction.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const act = async (fn, msg) => {
    setLoading(true);
    try { const r = await fn(); if (msg) alert(msg(r)); await load(); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;

  const ing = data.myIngredients || {};
  const timeLeft = (expiresAt) => {
    const ms = expiresAt - Date.now();
    if (ms <= 0) return 'Expired';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}г ${m}хв`;
  };

  return (
    <div className="auction-panel">
      <div className="auction-header">🏪 Auction House</div>

      <div className="auction-tabs">
        {['market', 'list', 'mylistings'].map(v => (
          <button key={v} className={`auction-tab ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
            {v === 'market' ? '🛒 Маркет' : v === 'list' ? '➕ Виставити' : '📋 Мої лоти'}
          </button>
        ))}
      </div>

      {view === 'market' && (
        <div className="auction-market">
          <div className="auction-gems-row">
            <span className="auction-gems">💎 {data.myGems} gems</span>
          </div>
          {data.auctions.length === 0 && (
            <div className="auction-empty">Ринок порожній. Виставляй свої інгредієнти!</div>
          )}
          {data.auctions.map(a => (
            <div key={a.id} className="auction-item">
              <span className="auction-item-icon">{ITEM_ICONS[a.itemType] || '📦'}</span>
              <div className="auction-item-info">
                <div className="auction-item-name">{ITEM_NAMES[a.itemType]} ×{a.quantity}</div>
                <div className="auction-item-seller">від {a.sellerName} • {timeLeft(a.expiresAt)}</div>
              </div>
              <div className="auction-item-right">
                <div className="auction-item-price">💎 {a.priceGems}</div>
                {!a.isMe && (
                  <button
                    className="auction-buy-btn"
                    disabled={loading || data.myGems < a.priceGems}
                    onClick={() => act(() => api.auction.buy(a.id), r => `Куплено ${r.quantity}× ${r.itemType}!`)}
                  >
                    Купити
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'list' && (
        <div className="auction-list-form">
          {!data.canList && (
            <div className="auction-limit-msg">⚠️ Ліміт активних лотів: {data.maxActive}</div>
          )}
          <div className="auction-form-field">
            <label className="auction-form-label">Інгредієнт</label>
            <select className="auction-select" value={form.itemType} onChange={e => setForm(f => ({ ...f, itemType: e.target.value }))}>
              {data.itemTypes.map(t => (
                <option key={t.key} value={t.key}>
                  {ITEM_NAMES[t.key]} (є: {ing[t.key] || 0})
                </option>
              ))}
            </select>
          </div>
          <div className="auction-form-field">
            <label className="auction-form-label">Кількість</label>
            <input
              type="number" min="1" max="1000"
              className="auction-input-num"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
            />
          </div>
          <div className="auction-form-field">
            <label className="auction-form-label">Ціна (gems)</label>
            <input
              type="number" min="1" max="10000"
              className="auction-input-num"
              value={form.priceGems}
              onChange={e => setForm(f => ({ ...f, priceGems: parseInt(e.target.value) || 1 }))}
            />
          </div>
          <div className="auction-form-summary">
            Продаєш: {form.quantity}× {ITEM_NAMES[form.itemType]} за {form.priceGems} 💎
            <br />
            Комісія 5%: отримаєш {Math.floor(form.priceGems * 0.95)} 💎
          </div>
          <button
            className="auction-submit-btn"
            disabled={loading || !data.canList}
            onClick={() => act(
              () => api.auction.list(form.itemType, form.quantity, form.priceGems),
              () => 'Лот виставлено!'
            )}
          >
            Виставити на 24 год
          </button>
        </div>
      )}

      {view === 'mylistings' && (
        <div className="auction-mylistings">
          {data.myListings.length === 0 && <div className="auction-empty">Немає лотів</div>}
          {data.myListings.map(l => (
            <div key={l.id} className={`auction-mylot ${l.status}`}>
              <span className="auction-item-icon">{ITEM_ICONS[l.item_type] || '📦'}</span>
              <div className="auction-mylot-info">
                <div className="auction-mylot-name">{ITEM_NAMES[l.item_type]} ×{l.quantity}</div>
                <div className={`auction-mylot-status ${l.status}`}>
                  {l.status === 'active' ? '🟢 Активний' : l.status === 'sold' ? `✅ Продано → ${l.buyer_name}` : l.status === 'expired' ? '⏰ Прострочено' : '❌ Скасовано'}
                </div>
              </div>
              <div className="auction-mylot-right">
                <div className="auction-mylot-price">💎 {l.price_gems}</div>
                {l.status === 'active' && (
                  <button className="auction-cancel-btn" disabled={loading} onClick={() => act(() => api.auction.cancel(l.id), () => 'Скасовано')}>
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
