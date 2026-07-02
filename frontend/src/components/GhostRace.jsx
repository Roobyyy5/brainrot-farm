import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function GhostRace({ challengeKey, totalTaps, timelineRef, onClose }) {
  const t = useT();
  const [data, setData] = useState(null);
  const [racing, setRacing] = useState(false);
  const [ghostPos, setGhostPos] = useState(0);
  const [myPos, setMyPos] = useState(0);
  const animRef = useRef(null);
  const startRef = useRef(0);

  useEffect(() => {
    if (!challengeKey) return;
    api.ghostrace.get(challengeKey).then(setData).catch(() => {});
  }, [challengeKey]);

  useEffect(() => {
    if (!racing || !data?.ghost?.timeline?.length) return;
    const timeline = data.ghost.timeline;
    startRef.current = Date.now();

    animRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const ghostTaps = interpolateTimeline(timeline, elapsed);
      const maxGhostTaps = timeline[timeline.length - 1]?.[1] || 1;
      setGhostPos(Math.min(100, ghostTaps / maxGhostTaps * 100));
      setMyPos(Math.min(100, totalTaps / maxGhostTaps * 100));
    }, 100);

    return () => clearInterval(animRef.current);
  }, [racing, data, totalTaps]);

  const startRace = () => setRacing(true);

  if (!data) return null;
  const ghost = data.ghost;

  return (
    <div className="ghostrace-panel">
      <div className="ghostrace-header">
        {t('ghost_title')}
        {onClose && <button className="ghostrace-close" onClick={onClose}>✕</button>}
      </div>

      {!ghost ? (
        <div className="ghostrace-noghost">{t('ghost_no_ghost')}</div>
      ) : (
        <>
          <div className="ghostrace-ghost-info">
            {t('ghost_racing_vs', { name: ghost.username, n: ghost.totalTaps.toLocaleString() })}
          </div>

          {racing && (
            <div className="ghostrace-tracks">
              <div className="ghostrace-track">
                <span className="ghostrace-label">👻 {ghost.username}</span>
                <div className="ghostrace-bar">
                  <div className="ghostrace-fill ghost" style={{ width: `${ghostPos}%` }} />
                </div>
                <span className="ghostrace-pct">{ghostPos.toFixed(0)}%</span>
              </div>
              <div className="ghostrace-track">
                <span className="ghostrace-label">{t('ghost_you')}</span>
                <div className="ghostrace-bar">
                  <div className="ghostrace-fill you" style={{ width: `${myPos}%` }} />
                </div>
                <span className="ghostrace-pct">{myPos.toFixed(0)}%</span>
              </div>
              <div className={`ghostrace-status ${myPos > ghostPos ? 'winning' : 'losing'}`}>
                {myPos > ghostPos ? t('ghost_ahead') : t('ghost_behind')}
              </div>
            </div>
          )}

          {!racing && (
            <button className="ghostrace-start-btn" onClick={startRace}>
              {t('ghost_race_btn')}
            </button>
          )}

          <div className="ghostrace-lb">
            <div className="ghostrace-lb-title">{t('ghost_lb_title')}</div>
            {(data.leaderboard || []).map(r => (
              <div key={r.rank} className="ghostrace-lb-row">
                <span className="ghostrace-lb-rank">#{r.rank}</span>
                <span className="ghostrace-lb-name">{r.username}</span>
                <span className="ghostrace-lb-taps">{r.totalTaps.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function interpolateTimeline(timeline, elapsedMs) {
  if (!timeline?.length) return 0;
  for (let i = 0; i < timeline.length; i++) {
    if (timeline[i][0] >= elapsedMs) {
      if (i === 0) return timeline[0][1];
      const [t0, v0] = timeline[i - 1];
      const [t1, v1] = timeline[i];
      const frac = (elapsedMs - t0) / (t1 - t0);
      return Math.floor(v0 + frac * (v1 - v0));
    }
  }
  return timeline[timeline.length - 1][1];
}
