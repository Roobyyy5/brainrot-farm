import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';

const CIRCLE_LIFETIME = 1200;
const PERFECT_WINDOW = 120;
const GOOD_WINDOW = 280;
const SESSION_MS = 30000;
const SPAWN_INTERVAL = 800;

let nextId = 0;

export default function RhythmTap() {
  const [view, setView] = useState('menu'); // menu | playing | result
  const [data, setData] = useState(null);
  const [circles, setCircles] = useState([]);
  const [stats, setStats] = useState({ perfect: 0, good: 0, miss: 0, score: 0, streak: 0 });
  const [timeLeft, setTimeLeft] = useState(SESSION_MS / 1000);
  const [result, setResult] = useState(null);
  const [flash, setFlash] = useState(null);
  const sessionRef = useRef(null);
  const statsRef = useRef(stats);
  statsRef.current = stats;

  useEffect(() => { api.rhythmtap.status().then(setData).catch(() => {}); }, []);

  const endSession = useCallback(async () => {
    clearInterval(sessionRef.current?.timer);
    clearInterval(sessionRef.current?.spawner);
    setView('result');
    const s = statsRef.current;
    try {
      const res = await api.rhythmtap.submit(s.score, s.perfect, s.good, s.miss);
      setResult(res);
      api.rhythmtap.status().then(setData).catch(() => {});
    } catch (_) { setResult({ accuracy: 0, gems: 0, grade: 'C' }); }
  }, []);

  const startSession = useCallback(() => {
    const fresh = { perfect: 0, good: 0, miss: 0, score: 0, streak: 0 };
    setStats(fresh);
    statsRef.current = fresh;
    setCircles([]);
    setTimeLeft(SESSION_MS / 1000);
    setResult(null);
    setView('playing');

    let remaining = SESSION_MS / 1000;
    const timer = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) endSession();
    }, 1000);

    const spawner = setInterval(() => {
      const x = 10 + Math.random() * 80;
      const y = 10 + Math.random() * 70;
      const spawnedAt = Date.now();
      setCircles(prev => [...prev.slice(-7), { id: nextId++, x, y, spawnedAt }]);
    }, SPAWN_INTERVAL);

    sessionRef.current = { timer, spawner };

    // auto-miss stale circles
    const missChecker = setInterval(() => {
      const now = Date.now();
      setCircles(prev => {
        const alive = prev.filter(c => now - c.spawnedAt < CIRCLE_LIFETIME + 200);
        const missed = prev.filter(c => now - c.spawnedAt >= CIRCLE_LIFETIME && !c.hit);
        if (missed.length > 0) {
          setStats(s => {
            const ns = { ...s, miss: s.miss + missed.length, streak: 0 };
            statsRef.current = ns;
            return ns;
          });
        }
        return alive.filter(c => !c.missed);
      });
    }, 200);

    sessionRef.current.missChecker = missChecker;
    return () => { clearInterval(timer); clearInterval(spawner); clearInterval(missChecker); };
  }, [endSession]);

  useEffect(() => () => {
    if (sessionRef.current) {
      clearInterval(sessionRef.current.timer);
      clearInterval(sessionRef.current.spawner);
      clearInterval(sessionRef.current.missChecker);
    }
  }, []);

  const tapCircle = (circleId, spawnedAt) => {
    const elapsed = Date.now() - spawnedAt;
    const targetMs = CIRCLE_LIFETIME / 2;
    const delta = Math.abs(elapsed - targetMs);

    let rating, points;
    if (delta <= PERFECT_WINDOW) { rating = 'perfect'; points = 300; }
    else if (delta <= GOOD_WINDOW) { rating = 'good'; points = 150; }
    else { rating = 'good'; points = 50; }

    setCircles(prev => prev.filter(c => c.id !== circleId));
    setFlash(rating);
    setTimeout(() => setFlash(null), 400);

    setStats(s => {
      const newStreak = s.streak + 1;
      const streakBonus = newStreak >= 5 ? 1.5 : 1;
      const ns = {
        ...s,
        [rating]: s[rating] + 1,
        score: Math.floor(s.score + points * streakBonus),
        streak: newStreak,
      };
      statsRef.current = ns;
      return ns;
    });
  };

  const total = stats.perfect + stats.good + stats.miss;
  const accuracy = total > 0 ? Math.round(((stats.perfect + stats.good) / total) * 100) : 0;

  if (!data) return null;

  return (
    <div className="rhythm-panel">
      <div className="rhythm-header">🎵 Rhythm Tap</div>

      {view === 'menu' && (
        <>
          <div className="rhythm-desc">
            Тап по колах у потрібний момент — Perfect = ×3, Good = ×1.5, серія 5+ дає бонус ×1.5
          </div>
          {data.best && (
            <div className="rhythm-best">
              🏆 Мій рекорд: <b>{data.best.score.toLocaleString()}</b> pts — {parseFloat(data.best.accuracy).toFixed(1)}% accuracy
            </div>
          )}
          <button className="rhythm-start-btn" onClick={startSession}>▶ Почати (30с)</button>

          {data.leaderboard?.length > 0 && (
            <div className="rhythm-lb">
              <div className="rhythm-lb-title">🏅 Top Players</div>
              {data.leaderboard.slice(0, 10).map(r => (
                <div key={r.rank} className={`rhythm-lb-row ${r.isMe ? 'me' : ''}`}>
                  <span className="rhythm-lb-rank">{r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}</span>
                  <span className="rhythm-lb-name">{r.username}</span>
                  <span className="rhythm-lb-score">{r.score.toLocaleString()}</span>
                  <span className="rhythm-lb-acc">{r.accuracy.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'playing' && (
        <div className="rhythm-game">
          <div className="rhythm-hud">
            <span className="rhythm-hud-time">⏱ {timeLeft}s</span>
            <span className="rhythm-hud-score">{stats.score.toLocaleString()}</span>
            <span className="rhythm-hud-streak">🔥 ×{stats.streak}</span>
          </div>
          {flash && <div className={`rhythm-flash rhythm-flash--${flash}`}>{flash === 'perfect' ? 'PERFECT!' : 'GOOD'}</div>}
          <div className="rhythm-field">
            {circles.map(c => {
              const age = Math.min(1, (Date.now() - c.spawnedAt) / CIRCLE_LIFETIME);
              return (
                <div
                  key={c.id}
                  className="rhythm-circle"
                  style={{ left: `${c.x}%`, top: `${c.y}%`, opacity: 1 - age * 0.6 }}
                  onClick={() => tapCircle(c.id, c.spawnedAt)}
                >
                  <div className="rhythm-circle-ring" style={{ transform: `scale(${1 + age * 0.5})` }} />
                  <div className="rhythm-circle-dot" />
                </div>
              );
            })}
          </div>
          <div className="rhythm-acc-bar">
            <span className="rhythm-stat green">✅ {stats.perfect}</span>
            <span className="rhythm-stat yellow">⭕ {stats.good}</span>
            <span className="rhythm-stat red">❌ {stats.miss}</span>
            <span className="rhythm-stat">{accuracy}%</span>
          </div>
        </div>
      )}

      {view === 'result' && result && (
        <div className="rhythm-result">
          <div className="rhythm-result-grade" style={{ color: result.grade === 'S+' ? '#f5c344' : result.grade === 'S' ? '#10b981' : '#888' }}>
            {result.grade}
          </div>
          <div className="rhythm-result-score">{stats.score.toLocaleString()} pts</div>
          <div className="rhythm-result-acc">{result.accuracy.toFixed(1)}% accuracy</div>
          {result.gems > 0 && <div className="rhythm-result-gems">+{result.gems} 💎</div>}
          <div className="rhythm-result-stats">
            <span className="rhythm-stat green">✅ {stats.perfect} Perfect</span>
            <span className="rhythm-stat yellow">⭕ {stats.good} Good</span>
            <span className="rhythm-stat red">❌ {stats.miss} Miss</span>
          </div>
          <button className="rhythm-start-btn" onClick={startSession}>🔄 Знову</button>
          <button className="rhythm-back-btn" onClick={() => setView('menu')}>← Меню</button>
        </div>
      )}
    </div>
  );
}
