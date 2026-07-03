import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

const ITEM_ICONS = { tap_shard: '🔷', energy_crystal: '💠', combo_dust: '✨', prestige_essence: '🌀' };
const ITEM_NAMES = { tap_shard: 'Tap Shard', energy_crystal: 'Energy Crystal', combo_dust: 'Combo Dust', prestige_essence: 'Prestige Essence' };

export default function AuctionHouse() {
  const t = useT();
  const [data, setData] = useState(null);
  const [view, setView] = useState('market');
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
    if (ms <= 0) return t('auction_expired');
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const statusLabel = (l) => {
    if (l.status === 'active')    return t('auction_status_active');
    if (l.status === 'sold')      return t('auction_status_sold', { name: l.buyer_name });
    if (l.status === 'expired')   return t('auction_status_expired');
    return t('auction_status_cancelled');
  };

  const tabLabel = (v) => {
    if (v === 'market')     return t('auction_tab_market');
    if (v === 'list')       return t('auction_tab_list');
    return t('auction_tab_my');
  };

  return (
    <div className="auction-panel">
      <div className="auction-header">{t('auction_header')}</div>

      <div className="auction-tabs">
        {['market', 'list', 'mylistings'].map(v => (
          <button key={v} className={`auction-tab ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
            {tabLabel(v)}
          </button>
        ))}
      </div>

      {view === 'market' && (
        <div className="auction-market">
          <div className="auction-gems-row">
            <span className="auction-gems">{t('gems_balance', { n: data.myGems })}</span>
          </div>
          {data.auctions.length === 0 && (
            <div className="auction-empty">{t('auction_empty')}</div>
          )}
          {data.auctions.map(a => (
            <div key={a.id} className="auction-item">
              <span className="auction-item-icon">{ITEM_ICONS[a.itemType] || '📦'}</span>
              <div className="auction-item-info">
                <div className="auction-item-name">{ITEM_NAMES[a.itemType]} ×{a.quantity}</div>
                <div className="auction-item-seller">{t('auction_seller', { name: a.sellerName, time: timeLeft(a.expiresAt) })}</div>
              </div>
              <div className="auction-item-right">
                <div className="auction-item-price">💎 {a.priceGems}</div>
                {!a.isMe && (
                  <button
                    className="auction-buy-btn"
                    disabled={loading || data.myGems < a.priceGems}
                    onClick={() => act(() => api.auction.buy(a.id), r => t('auction_bought_alert', { n: r.quantity, item: r.itemType }))}
                  >
                    {t('auction_buy_btn')}
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
            <div className="auction-limit-msg">{t('auction_limit_msg', { n: data.maxActive })}</div>
          )}
          <div className="auction-form-field">
            <label className="auction-form-label">{t('auction_ing_label')}</label>
            <select className="auction-select" value={form.itemType} onChange={e => setForm(f => ({ ...f, itemType: e.target.value }))}>
              {data.itemTypes.map(it => (
                <option key={it.key} value={it.key}>
                  {ITEM_NAMES[it.key]} {t('auction_have', { n: ing[it.key] || 0 })}
                </option>
              ))}
            </select>
          </div>
          <div className="auction-form-field">
            <label className="auction-form-label">{t('auction_qty_label')}</label>
            <input
              type="number" min="1" max="1000"
              className="auction-input-num"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
            />
          </div>
          <div className="auction-form-field">
            <label className="auction-form-label">{t('auction_price_label')}</label>
            <input
              type="number" min="1" max="10000"
              className="auction-input-num"
              value={form.priceGems}
              onChange={e => setForm(f => ({ ...f, priceGems: parseInt(e.target.value) || 1 }))}
            />
          </div>
          <div className="auction-form-summary">
            {t('auction_sell_summary', { n: form.quantity, item: ITEM_NAMES[form.itemType], price: form.priceGems })}
            <br />
            {t('auction_fee', { n: Math.floor(form.priceGems * 0.95) })}
          </div>
          <button
            className="auction-submit-btn"
            disabled={loading || !data.canList}
            onClick={() => act(
              () => api.auction.list(form.itemType, form.quantity, form.priceGems),
              () => t('auction_listed_alert')
            )}
          >
            {t('auction_list_btn')}
          </button>
        </div>
      )}

      {view === 'mylistings' && (
        <div className="auction-mylistings">
          {data.myListings.length === 0 && <div className="auction-empty">{t('auction_no_listings')}</div>}
          {data.myListings.map(l => (
            <div key={l.id} className={`auction-mylot ${l.status}`}>
              <span className="auction-item-icon">{ITEM_ICONS[l.item_type] || '📦'}</span>
              <div className="auction-mylot-info">
                <div className="auction-mylot-name">{ITEM_NAMES[l.item_type]} ×{l.quantity}</div>
                <div className={`auction-mylot-status ${l.status}`}>{statusLabel(l)}</div>
              </div>
              <div className="auction-mylot-right">
                <div className="auction-mylot-price">💎 {l.price_gems}</div>
                {l.status === 'active' && (
                  <button className="auction-cancel-btn" disabled={loading} onClick={() => act(() => api.auction.cancel(l.id), () => t('auction_cancel_alert'))}>
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
