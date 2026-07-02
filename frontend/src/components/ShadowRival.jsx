import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

const CHALLENGE_DURATION = 30;

export default function ShadowRival() {
  const t = useT();
  const [data, setData] = useState(null);
  const [view, setView] = useState('menu');
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
    ? t('rival_cd_long', { h: Math.floor(cooldownSec / 3600), m: Math.floor((cooldownSec % 3600) / 60) })
    : t('rival_cd_short', { m: Math.floor(cooldownSec / 60), s: cooldownSec % 60 });

  return (
    <div className="rival-panel">
      <div className="rival-header">{t('rival_header')}</div>

      {view === 'menu' && (
        <>
          <div className="rival-card">
            <div className="rival-icon">{data.rival.icon}</div>
            <div className="rival-info">
              <div className="rival-name">{data.rival.name}</div>
              <div className="rival-lvl">{t('rival_level', { n: data.rival.level })}</div>
              <div className="rival-score">{t('rival_score', { n: data.rival.score.toLocaleString() })}</div>
            </div>
          </div>

          <div className="rival-record">
            <span className="rival-wins">{t('rival_wins', { n: data.wins })}</span>
            <span className="rival-losses">{t('rival_losses', { n: data.losses })}</span>
            <span className="rival-shards">{t('rival_shards', { n: data.shards })}</span>
          </div>

          <div className="rival-reward-preview">
            {t('rival_reward', { win: data.shardRewardWin, loss: data.shardRewardLoss })}
          </div>

          {data.canChallenge ? (
            <button className="rival-challenge-btn" onClick={startChallenge}>{t('rival_challenge_btn')}</button>
          ) : (
            <div className="rival-cooldown">{t('rival_cooldown', { time: cooldownStr })}</div>
          )}

          <button className="rival-upgrades-btn" onClick={() => setView('upgrades')}>{t('rival_upgrades_btn')}</button>
        </>
      )}

      {view === 'challenge' && (
        <div className="rival-challenge">
          <div className="rival-ch-timer">{timeLeft}s</div>
          <div className="rival-ch-score">{t('challenge_taps', { n: taps })}</div>
          <div className="rival-ch-vs">vs {data.rival.icon} {data.rival.name}</div>
          <button
            className="rival-tap-btn"
            onClick={() => setTaps(v => v + 1)}
          >
            {t('rival_tap_btn')}
          </button>
          <button className="rival-give-up" onClick={endChallenge} disabled={loading}>{t('rival_finish')}</button>
        </div>
      )}

      {view === 'result' && result && (
        <div className="rival-result">
          <div className={`rival-result-banner ${result.won ? 'won' : 'lost'}`}>
            {result.won ? t('rival_win_banner') : t('rival_loss_banner')}
          </div>
          <div className="rival-result-scores">
            <div>{t('rival_my_score', { n: result.myScore })}</div>
            <div>{t('rival_rival_score', { n: result.rivalScore })}</div>
          </div>
          <div className="rival-result-shards">{t('rival_shards_gained', { n: result.shards })}</div>
          {result.levelUp && <div className="rival-levelup">{t('rival_level_up', { n: result.newLevel })}</div>}
          <button className="rival-challenge-btn" onClick={() => setView('menu')}>{t('challenge_back_btn')}</button>
        </div>
      )}

      {view === 'upgrades' && <RivalUpgrades shards={data.shards} onBack={() => { setView('menu'); load(); }} t={t} />}
    </div>
  );
}

function RivalUpgrades({ shards, onBack, t }) {
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
      <div className="rival-upg-shards">{t('rival_shards', { n: data.shards })}</div>
      {data.upgrades.map(u => (
        <div key={u.key} className={`rival-upg-card ${u.owned ? 'owned' : ''}`}>
          <div className="rival-upg-name">{u.name}</div>
          <div className="rival-upg-cost">🔮 {u.cost}</div>
          {u.owned
            ? <span className="rival-upg-owned">✅</span>
            : <button className="rival-upg-btn" onClick={() => buy(u.key)} disabled={loading || data.shards < u.cost}>{t('rival_buy')}</button>
          }
        </div>
      ))}
      <button className="rival-back-btn" onClick={onBack}>{t('challenge_back_btn')}</button>
    </div>
  );
}
