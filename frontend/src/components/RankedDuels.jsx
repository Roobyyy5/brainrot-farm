import { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../api';
import { useWebSocket } from '../useWebSocket';

export default function RankedDuels() {
  const [data, setData] = useState(null);
  const [lb, setLb] = useState([]);
  const [tab, setTab] = useState('me');
  const [loading, setLoading] = useState(false);
  const [myBP, setMyBP] = useState(0);
  const [opBP, setOpBP] = useState(0);
  const timerRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const load = () => api.rankedduels.me().then(d => { setData(d); }).catch(() => {});
  const loadLb = () => api.rankedduels.leaderboard().then(d => setLb(d.leaderboard || [])).catch(() => {});

  useEffect(() => { load(); loadLb(); }, []);

  const duelId = data?.activeDuel?.id;
  const rooms = useMemo(() => duelId ? [`duel:${duelId}`] : [], [duelId]);

  useWebSocket({
    rooms,
    onMessage: (msg) => {
      if (msg.type === 'duel_score') {
        setMyBP(msg.myBP);
        setOpBP(msg.opBP);
      }
    },
  });

  useEffect(() => {
    if (!data?.activeDuel || data.activeDuel.status !== 'active') {
      clearInterval(timerRef.current);
      return;
    }
    const duel = data.activeDuel;
    const tick = () => {
      const left = Math.max(0, Math.ceil((Number(duel.ends_at) - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(timerRef.current);
        api.rankedduels.settle(duel.id).catch(() => {}).finally(load);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => clearInterval(timerRef.current);
  }, [data?.activeDuel?.status, data?.activeDuel?.id]);

  const findMatch = async () => {
    setLoading(true);
    try { await api.rankedduels.find(); load(); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const tapDuel = async () => {
    try { await api.rankedduels.tap(10); }
    catch { /* ignore */ }
  };

  const leagueIcon = (league) => ({ Rookie: '🔘', Bronze: '🥉', Silver: '🥈', Gold: '🥇', Legend: '🏆' }[league] || '🔘');

  if (!data) return null;
  const duel = data.activeDuel;

  return (
    <div className="ranked-panel">
      <div className="ranked-header">⚔️ Ranked Duels</div>

      <div className="ranked-tabs">
        <button className={tab === 'me' ? 'active' : ''} onClick={() => setTab('me')}>My Rank</button>
        <button className={tab === 'lb' ? 'active' : ''} onClick={() => { setTab('lb'); loadLb(); }}>Leaderboard</button>
      </div>

      {tab === 'me' && (
        <>
          <div className="ranked-profile">
            <span className="ranked-league-icon">{leagueIcon(data.league)}</span>
            <div>
              <div className="ranked-league-name">{data.league}</div>
              <div className="ranked-elo">{data.elo} ELO</div>
              <div className="ranked-wl">W {data.wins} / L {data.losses}</div>
            </div>
          </div>

          <div className="ranked-leagues-preview">
            {(data.leagues || []).map(l => (
              <div key={l.name} className={`ranked-league-row ${data.league === l.name ? 'current' : ''}`}>
                <span>{l.icon} {l.name}</span>
                <span>{l.minElo}+ ELO</span>
                <span>💎 {l.gemReward}/season</span>
              </div>
            ))}
          </div>

          {!duel && (
            <button className="ranked-find-btn" onClick={findMatch} disabled={loading}>
              {loading ? 'Searching...' : '⚔️ Find Match'}
            </button>
          )}

          {duel?.status === 'pending' && (
            <div className="ranked-waiting">
              <div className="ranked-wait-spinner">⏳</div>
              <div>Looking for opponent...</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 4 }}>
                Matching ±{data.matchmakingRange || 150} ELO
              </div>
            </div>
          )}

          {duel?.status === 'active' && (
            <div className="ranked-duel-active">
              <div className="ranked-duel-timer">{timeLeft}s</div>
              <div className="ranked-duel-label">🔴 RANKED BATTLE</div>
              <div className="ranked-live-scores">
                <div className="ranked-live-score ranked-live-score--me">
                  <span>YOU</span>
                  <span className="ranked-live-bp">{myBP.toLocaleString()}</span>
                </div>
                <span className="ranked-vs">VS</span>
                <div className="ranked-live-score ranked-live-score--op">
                  <span>OPPONENT</span>
                  <span className="ranked-live-bp">{opBP.toLocaleString()}</span>
                </div>
              </div>
              <button className="ranked-tap-btn" onClick={tapDuel}>💥 TAP!</button>
              <div className={`ranked-lead-indicator ${myBP >= opBP ? 'winning' : 'losing'}`}>
                {myBP > opBP ? '🏆 Winning!' : myBP === opBP ? '🤝 Tied' : '💀 Behind!'}
              </div>
            </div>
          )}

          {duel?.status === 'completed' && (
            <div className="ranked-result">
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>
                {duel.winner_id ? '🏆 Victory!' : '💀 Defeat'}
              </div>
              <button className="ranked-find-btn" onClick={() => { setMyBP(0); setOpBP(0); load(); }}>
                Play Again
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'lb' && (
        <div className="ranked-lb">
          {lb.map(r => (
            <div key={r.rank} className="ranked-lb-row">
              <span className="ranked-lb-rank">#{r.rank}</span>
              <span className="ranked-lb-icon">{leagueIcon(r.league)}</span>
              <span className="ranked-lb-name">{r.username}</span>
              <span className="ranked-lb-elo">{r.elo}</span>
              <span className="ranked-lb-wl">{r.wins}W/{r.losses}L</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
