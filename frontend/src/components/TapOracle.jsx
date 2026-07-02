import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function TapOracle() {
  const [data, setData] = useState(null);
  const [view, setView] = useState('main'); // main | shop
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
      <div className="oracle-header">🔮 Tap Oracle</div>

      {view === 'main' && (
        <>
          <div className="oracle-coins-row">
            <span className="oracle-coins">🪙 {data.coins} Oracle Coins</span>
            <button className="oracle-shop-btn" onClick={() => setView('shop')}>🛒 Магазин</button>
          </div>

          {ch && !ch.completed ? (
            <div className="oracle-challenge">
              <div className="oracle-ch-header">
                <span className="oracle-ch-icon">{ch.icon}</span>
                <span className="oracle-ch-name">{ch.name}</span>
                <span className="oracle-ch-timer">⏳ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2,'0')}</span>
              </div>
              <div className="oracle-ch-desc">{ch.desc}</div>
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
              <div className="oracle-completed-text">Виклик виконано!</div>
              <button className="oracle-claim-btn" onClick={() => act(() => api.oracle.claim(), r => `+${r.coins} 🪙 Oracle Coins!`)} disabled={loading}>
                Забрати нагороду
              </button>
            </div>
          ) : (
            <div className="oracle-empty">
              <div className="oracle-empty-icon">🔮</div>
              <div className="oracle-empty-text">Oracle чекає на тебе</div>
              <button className="oracle-request-btn" onClick={() => act(() => api.oracle.request())} disabled={loading}>
                🔮 Отримати виклик
              </button>
            </div>
          )}

          {!ch && data.canRequest && (
            <button className="oracle-request-btn" onClick={() => act(() => api.oracle.request())} disabled={loading}>
              🔮 Отримати виклик
            </button>
          )}
        </>
      )}

      {view === 'shop' && (
        <div className="oracle-shop">
          <div className="oracle-shop-header">
            <button className="oracle-back-btn" onClick={() => setView('main')}>← Назад</button>
            <span className="oracle-coins">🪙 {data.coins}</span>
          </div>
          {data.shop?.map(item => (
            <div key={item.key} className={`oracle-shop-item ${item.owned ? 'owned' : ''}`}>
              <span className="oracle-shop-icon">{item.icon}</span>
              <div className="oracle-shop-info">
                <div className="oracle-shop-name">{item.name}</div>
                <div className="oracle-shop-cost">🪙 {item.cost} Oracle Coins</div>
              </div>
              {item.owned
                ? <span className="oracle-shop-owned">✅</span>
                : <button
                    className="oracle-shop-buy-btn"
                    onClick={() => act(() => api.oracle.buy(item.key), () => 'Куплено!')}
                    disabled={loading || data.coins < item.cost}
                  >Купити</button>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
