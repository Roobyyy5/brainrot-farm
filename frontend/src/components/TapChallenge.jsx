import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

const DIFF_COLOR = { easy: '#34d399', medium: '#f59e0b', hard: '#ef4444', legend: '#a78bfa' };

export default function TapChallenge() {
  const [data, setData] = useState(null);
  const [activeRun, setActiveRun] = useState(null);
  const [tab, setTab] = useState('list');
  const [lbKey, setLbKey] = useState(null);
  const [lb, setLb] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [tapsDone, setTapsDone] = useState(0);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const timeLimitRef = useRef(0);

  const load = () => api.tapchallenge.list().then(d => {
    setData(d);
    if (d.activeRun) {
      setActiveRun(d.activeRun);
      setTapsDone(Number(d.activeRun.taps_done));
    }
  }).catch(() => {});

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!activeRun) { clearInterval(timerRef.current); return; }
    startedAtRef.current = Number(activeRun.started_at);
    const cfg = data?.challenges?.find(c => c.key === activeRun.challenge_key);
    if (!cfg) return;
    timeLimitRef.current = cfg.timeLimit * 1000;
    const tick = () => {
      const left = Math.max(0, Math.ceil((startedAtRef.current + timeLimitRef.current - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) { clearInterval(timerRef.current); load(); }
    };
    tick();
    timerRef.current = setInterval(tick, 250);
    return () => clearInterval(timerRef.current);
  }, [activeRun?.started_at]);

  const startChallenge = async (key) => {
    setLoading(true);
    try {
      await api.tapchallenge.start(key);
      await load();
      setTab('active');
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const tapChallenge = async () => {
    try {
      const result = await api.tapchallenge.tap(20);
      setTapsDone(result.tapsDone || 0);
      if (result.status !== 'active') {
        clearInterval(timerRef.current);
        setActiveRun(null);
        setTab('list');
        await load();
        if (result.status === 'completed') {
          alert(`✅ Challenge complete! +${result.gemsEarned} 💎`);
        } else {
          alert('⏰ Time\'s up! Try again.');
        }
      }
    } catch { /* ignore */ }
  };

  const abandon = async () => {
    await api.tapchallenge.abandon();
    setActiveRun(null);
    setTab('list');
    await load();
  };

  const showLb = async (key) => {
    setLbKey(key);
    const d = await api.tapchallenge.leaderboard(key).catch(() => ({ leaderboard: [] }));
    setLb(d.leaderboard || []);
    setTab('lb');
  };

  if (!data) return null;
  const cfg = activeRun ? data.challenges?.find(c => c.key === activeRun.challenge_key) : null;

  return (
    <div className="tapchallenge-panel">
      <div className="tapchallenge-header">⚡ Tap Challenges</div>

      <div className="tapchallenge-tabs">
        <button className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}>Challenges</button>
        {activeRun && <button className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>▶ Active</button>}
        {tab === 'lb' && <button className="active">Leaderboard</button>}
      </div>

      {tab === 'list' && (
        <div className="tapchallenge-list">
          {(data.challenges || []).map(c => (
            <div key={c.key} className="tapchallenge-card">
              <div className="tapchallenge-card-top">
                <span className="tapchallenge-icon">{c.icon}</span>
                <div className="tapchallenge-info">
                  <div className="tapchallenge-name">{c.name}</div>
                  <div className="tapchallenge-desc">{c.desc}</div>
                  {c.myRecord && (
                    <div className="tapchallenge-record">
                      Best: {c.myRecord.bestTaps.toLocaleString()} taps
                      {c.myRecord.bestTimeMs && ` in ${(c.myRecord.bestTimeMs / 1000).toFixed(1)}s`}
                    </div>
                  )}
                </div>
                <div className="tapchallenge-card-right">
                  <span className="tapchallenge-diff" style={{ color: DIFF_COLOR[c.difficulty] }}>{c.difficulty}</span>
                  <span className="tapchallenge-gems">💎 {c.rewardGems}</span>
                </div>
              </div>
              <div className="tapchallenge-card-actions">
                <button className="tapchallenge-start-btn" onClick={() => startChallenge(c.key)} disabled={loading || !!activeRun}>
                  {activeRun ? 'Finish current first' : '▶ Start'}
                </button>
                <button className="tapchallenge-lb-btn" onClick={() => showLb(c.key)}>
                  🏆 Records
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'active' && activeRun && cfg && (
        <div className="tapchallenge-active">
          <div className="tapchallenge-active-name">{cfg.icon} {cfg.name}</div>
          <div className={`tapchallenge-timer ${timeLeft <= 5 ? 'danger' : ''}`}>{timeLeft}s</div>
          <div className="tapchallenge-taps">{tapsDone.toLocaleString()} taps{cfg.tapTarget ? ` / ${cfg.tapTarget.toLocaleString()}` : ''}</div>
          {cfg.tapTarget && (
            <div className="tapchallenge-progress-bar">
              <div className="tapchallenge-progress-fill" style={{ width: `${Math.min(100, tapsDone / cfg.tapTarget * 100)}%` }} />
            </div>
          )}
          <button className="tapchallenge-tap-btn" onClick={tapChallenge}>💥 TAP! (×20)</button>
          <button className="tapchallenge-abandon-btn" onClick={abandon}>✕ Abandon</button>
        </div>
      )}

      {tab === 'lb' && (
        <div className="tapchallenge-lb">
          <div className="tapchallenge-lb-title">
            🏆 {data.challenges?.find(c => c.key === lbKey)?.name} — Records
          </div>
          {lb.length === 0 && <div className="tapchallenge-lb-empty">No records yet. Be the first!</div>}
          {lb.map(r => (
            <div key={r.rank} className="tapchallenge-lb-row">
              <span className="tapchallenge-lb-rank">#{r.rank}</span>
              <span className="tapchallenge-lb-name">{r.username}</span>
              <span className="tapchallenge-lb-taps">{r.bestTaps.toLocaleString()} taps</span>
              {r.bestTimeMs && <span className="tapchallenge-lb-time">{(r.bestTimeMs / 1000).toFixed(1)}s</span>}
            </div>
          ))}
          <button className="tapchallenge-back-btn" onClick={() => setTab('list')}>← Back</button>
        </div>
      )}
    </div>
  );
}
