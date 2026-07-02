import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

const CHALLENGE_DURATION = 30;

export default function ShadowRival() {
  const [data, setData] = useState(null);
  const [view, setView] = useState('menu'); // menu | challenge | result | upgrades
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_DURATION);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const load = () => api.shadowrival.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const startChallenge = () => {
    setTaps(0);
    setTimeLeft(CHALLENGE_DURATION);
    setView('challenge');

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          endChallenge();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const endChallenge = async () => {
    clearInterval(timerRef.current);
    const myScore = taps;
    setLoading(true);
    try {
      const res = await api.shadowrival.challenge(myScore);
      setResult(res);
      setView('result');
      load();
    } catch (err) { alert(err.message); setView('menu'); }
    finally { setLoading(false); }
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  if (!data) return null;

  const cooldownSec = Math.ceil(data.cooldownMs / 1000);
  const cooldownStr = cooldownSec > 3600
    ? `${Math.floor(cooldownSec / 3600)}г ${Math.floor((cooldownSec % 3600) / 60)}хв`
    : `${Math.floor(cooldownSec / 60)}хв ${cooldownSec % 60}с`;

  return (
    <div className="rival-panel">
      <div className="rival-header">👻 AI Shadow Rival</div>

      {view === 'menu' && (
        <>
          <div className="rival-card">
            <div className="rival-icon">{data.rival.icon}</div>
            <div className="rival-info">
              <div className="rival-name">{data.rival.name}</div>
              <div className="rival-lvl">Рівень {data.rival.level} / 5</div>
              <div className="rival-score">Rival score: {data.rival.score.toLocaleString()}</div>
            </div>
          </div>

          <div className="rival-record">
            <span className="rival-wins">✅ {data.wins} перемог</span>
            <span className="rival-losses">❌ {data.losses} поразок</span>
            <span className="rival-shards">🔮 {data.shards} shards</span>
          </div>

          <div className="rival-reward-preview">
            Перемога: <b>+{data.shardRewardWin} 🔮</b> · Поразка: <b>+{data.shardRewardLoss} 🔮</b>
          </div>

          {data.canChallenge ? (
            <button className="rival-challenge-btn" onClick={startChallenge}>⚔️ Кинути виклик (30с)</button>
          ) : (
            <div className="rival-cooldown">⏳ Наступний виклик через {cooldownStr}</div>
          )}

          <button className="rival-upgrades-btn" onClick={() => setView('upgrades')}>🔮 Шард-апгрейди</button>
        </>
      )}

      {view === 'challenge' && (
        <div className="rival-challenge">
          <div className="rival-ch-timer">{timeLeft}с</div>
          <div className="rival-ch-score">{taps} тапів</div>
          <div className="rival-ch-vs">vs {data.rival.icon} {data.rival.name}</div>
          <button
            className="rival-tap-btn"
            onClick={() => setTaps(t => t + 1)}
          >
            👆 ТАП!
          </button>
          <button className="rival-give-up" onClick={endChallenge} disabled={loading}>Завершити</button>
        </div>
      )}

      {view === 'result' && result && (
        <div className="rival-result">
          <div className={`rival-result-banner ${result.won ? 'won' : 'lost'}`}>
            {result.won ? '🏆 ПЕРЕМОГА!' : '💀 ПОРАЗКА'}
          </div>
          <div className="rival-result-scores">
            <div>Ти: <b>{result.myScore}</b> тапів</div>
            <div>Rival: <b>{result.rivalScore}</b> тапів</div>
          </div>
          <div className="rival-result-shards">+{result.shards} 🔮 shards</div>
          {result.levelUp && <div className="rival-levelup">⬆ Rival leveled up to {result.newLevel}!</div>}
          <button className="rival-challenge-btn" onClick={() => setView('menu')}>← Назад</button>
        </div>
      )}

      {view === 'upgrades' && <RivalUpgrades shards={data.shards} onBack={() => { setView('menu'); load(); }} />}
    </div>
  );
}

function RivalUpgrades({ shards, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { api.shadowrival.upgrades().then(setData).catch(() => {}); }, []);

  const buy = async (key) => {
    setLoading(true);
    try { await api.shadowrival.upgrade(key); api.shadowrival.upgrades().then(setData); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return <div className="rival-loading">...</div>;

  return (
    <div className="rival-upg-panel">
      <div className="rival-upg-shards">🔮 {data.shards} shards</div>
      {data.upgrades.map(u => (
        <div key={u.key} className={`rival-upg-card ${u.owned ? 'owned' : ''}`}>
          <div className="rival-upg-name">{u.name}</div>
          <div className="rival-upg-cost">🔮 {u.cost}</div>
          {u.owned
            ? <span className="rival-upg-owned">✅</span>
            : <button className="rival-upg-btn" onClick={() => buy(u.key)} disabled={loading || data.shards < u.cost}>Купити</button>
          }
        </div>
      ))}
      <button className="rival-back-btn" onClick={onBack}>← Назад</button>
    </div>
  );
}
