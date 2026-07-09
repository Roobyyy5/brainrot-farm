import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';
import { toastError, toastSuccess } from '../toast';

const DIFF_COLOR = { easy: '#34d399', medium: '#f59e0b', hard: '#ef4444', legend: '#a78bfa' };

export default function TapChallenge() {
  const t = useT();
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
    } catch (err) { toastError(err.message); }
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
          toastSuccess(t('challenge_done', { n: result.gemsEarned }));
        } else {
          toastSuccess(t('challenge_timeout'));
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
      <div className="tapchallenge-header">{t('challenge_title')}</div>

      <div className="tapchallenge-tabs">
        <button className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}>{t('challenge_tab_list')}</button>
        {activeRun && <button className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>{t('challenge_tab_active')}</button>}
        {tab === 'lb' && <button className="active">{t('challenge_tab_lb')}</button>}
      </div>

      {tab === 'list' && (
        <div className="tapchallenge-list">
          {(data.challenges || []).map(c => (
            <div key={c.key} className="tapchallenge-card">
              <div className="tapchallenge-card-top">
                <span className="tapchallenge-icon">{c.icon}</span>
                <div className="tapchallenge-info">
                  <div className="tapchallenge-name">{(() => { const k = 'challenge_' + c.key + '_name'; const v = t(k); return v === k ? c.name : v; })()}</div>
                  <div className="tapchallenge-desc">{(() => { const k = 'challenge_' + c.key + '_desc'; const v = t(k); return v === k ? c.desc : v; })()}</div>
                  {c.myRecord && (
                    <div className="tapchallenge-record">
                      {t('challenge_best', { n: c.myRecord.bestTaps.toLocaleString() })}
                      {c.myRecord.bestTimeMs && t('challenge_best_time', { n: (c.myRecord.bestTimeMs / 1000).toFixed(1) })}
                    </div>
                  )}
                </div>
                <div className="tapchallenge-card-right">
                  <span className="tapchallenge-diff" style={{ color: DIFF_COLOR[c.difficulty] }}>{t('diff_' + c.difficulty)}</span>
                  <span className="tapchallenge-gems">💎 {c.rewardGems}</span>
                </div>
              </div>
              <div className="tapchallenge-card-actions">
                <button className="tapchallenge-start-btn" onClick={() => startChallenge(c.key)} disabled={loading || !!activeRun}>
                  {activeRun ? t('challenge_finish_first') : t('challenge_start_btn')}
                </button>
                <button className="tapchallenge-lb-btn" onClick={() => showLb(c.key)}>
                  {t('challenge_records_btn')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'active' && activeRun && cfg && (
        <div className="tapchallenge-active">
          <div className="tapchallenge-active-name">{cfg.icon} {(() => { const k = 'challenge_' + (activeRun?.challengeKey || '') + '_name'; const v = t(k); return v === k ? cfg.name : v; })()}</div>
          <div className={`tapchallenge-timer ${timeLeft <= 5 ? 'danger' : ''}`}>{timeLeft}s</div>
          <div className="tapchallenge-taps">{t('challenge_taps', { n: tapsDone.toLocaleString() })}{cfg.tapTarget ? ` / ${cfg.tapTarget.toLocaleString()}` : ''}</div>
          {cfg.tapTarget && (
            <div className="tapchallenge-progress-bar">
              <div className="tapchallenge-progress-fill" style={{ width: `${Math.min(100, tapsDone / cfg.tapTarget * 100)}%` }} />
            </div>
          )}
          <button className="tapchallenge-tap-btn" onClick={tapChallenge}>{t('challenge_tap_btn')}</button>
          <button className="tapchallenge-abandon-btn" onClick={abandon}>{t('challenge_abandon_btn')}</button>
        </div>
      )}

      {tab === 'lb' && (
        <div className="tapchallenge-lb">
          <div className="tapchallenge-lb-title">
            {t('challenge_lb_title', { name: data.challenges?.find(c => c.key === lbKey)?.name || '' })}
          </div>
          {lb.length === 0 && <div className="tapchallenge-lb-empty">{t('challenge_lb_empty')}</div>}
          {lb.map(r => (
            <div key={r.rank} className="tapchallenge-lb-row">
              <span className="tapchallenge-lb-rank">#{r.rank}</span>
              <span className="tapchallenge-lb-name">{r.username}</span>
              <span className="tapchallenge-lb-taps">{t('challenge_taps', { n: r.bestTaps.toLocaleString() })}</span>
              {r.bestTimeMs && <span className="tapchallenge-lb-time">{(r.bestTimeMs / 1000).toFixed(1)}s</span>}
            </div>
          ))}
          <button className="tapchallenge-back-btn" onClick={() => setTab('list')}>{t('challenge_back_btn')}</button>
        </div>
      )}
    </div>
  );
}
