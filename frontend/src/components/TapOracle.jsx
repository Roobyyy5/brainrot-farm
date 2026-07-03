import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function TapOracle() {
  const t = useT();
  const [data, setData] = useState(null);
  const [view, setView] = useState('main');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  const load = () => api.oracle.status().then(d => {
    setData(d);
    if (d.challenge?.expiresAt) {
      setTimeLeft(Math.max(0, Math.ceil((d.challenge.expiresAt - Date.now()) / 1000)));
    }
  }).catch(() => {});

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!data?.challenge?.expiresAt) return;
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((data.challenge.expiresAt - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) { clearInterval(timerRef.current); load(); }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [data?.challenge?.expiresAt]);

  const act = async (fn, msg) => {
    setLoading(true);
    try { const r = await fn(); if (msg) alert(msg(r)); await load(); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;

  const ch = data.challenge;
  const progPct = ch ? Math.min(100, (ch.progress / ch.target) * 100) : 0;

  return (
    <div className="oracle-panel">
      <div className="oracle-header">{t('oracle_header')}</div>

      {view === 'main' && (
        <>
          <div className="oracle-coins-row">
            <span className="oracle-coins">{t('oracle_coins', { n: data.coins })}</span>
            <button className="oracle-shop-btn" onClick={() => setView('shop')}>{t('oracle_shop_btn')}</button>
          </div>

          {ch && !ch.completed ? (
            <div className="oracle-challenge">
              <div className="oracle-ch-header">
                <span className="oracle-ch-icon">{ch.icon}</span>
                <span className="oracle-ch-name">{(() => { const k = 'oracle_ch_' + (ch.key||'') + '_name'; const v = t(k); return v === k ? ch.name : v; })()}</span>
                <span className="oracle-ch-timer">⏳ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2,'0')}</span>
              </div>
              <div className="oracle-ch-desc">{(() => { const k = 'oracle_ch_' + (ch.key||'') + '_desc'; const v = t(k); return v === k ? ch.desc : v; })()}</div>
              <div className="oracle-ch-progress-bar">
                <div className="oracle-ch-progress-fill" style={{ width: `${progPct}%` }} />
              </div>
              <div className="oracle-ch-progress-text">
                {ch.progress.toLocaleString()} / {ch.target.toLocaleString()}
              </div>
            </div>
          ) : ch?.completed ? (
            <div className="oracle-completed">
              <div className="oracle-completed-icon">✅</div>
              <div className="oracle-completed-text">{t('oracle_completed')}</div>
              <button className="oracle-claim-btn" onClick={() => act(() => api.oracle.claim(), r => t('oracle_claim_alert', { n: r.coins }))} disabled={loading}>
                {t('oracle_claim_btn')}
              </button>
            </div>
          ) : (
            <div className="oracle-empty">
              <div className="oracle-empty-icon">🔮</div>
              <div className="oracle-empty-text">{t('oracle_empty')}</div>
              <button className="oracle-request-btn" onClick={() => act(() => api.oracle.request())} disabled={loading}>
                {t('oracle_request_btn')}
              </button>
            </div>
          )}

          {!ch && data.canRequest && (
            <button className="oracle-request-btn" onClick={() => act(() => api.oracle.request())} disabled={loading}>
              {t('oracle_request_btn')}
            </button>
          )}
        </>
      )}

      {view === 'shop' && (
        <div className="oracle-shop">
          <div className="oracle-shop-header">
            <button className="oracle-back-btn" onClick={() => setView('main')}>{t('oracle_back_btn')}</button>
            <span className="oracle-coins">{t('oracle_coins', { n: data.coins })}</span>
          </div>
          {data.shop?.map(item => (
            <div key={item.key} className={`oracle-shop-item ${item.owned ? 'owned' : ''}`}>
              <span className="oracle-shop-icon">{item.icon}</span>
              <div className="oracle-shop-info">
                <div className="oracle-shop-name">{(() => { const k = 'oracle_' + item.key + '_name'; const v = t(k); return v === k ? item.name : v; })()}</div>
                <div className="oracle-shop-cost">{t('oracle_coins', { n: item.cost })}</div>
              </div>
              {item.owned
                ? <span className="oracle-shop-owned">✅</span>
                : <button
                    className="oracle-shop-buy-btn"
                    onClick={() => act(() => api.oracle.buy(item.key), () => t('oracle_bought'))}
                    disabled={loading || data.coins < item.cost}
                  >{t('oracle_buy_btn')}</button>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
