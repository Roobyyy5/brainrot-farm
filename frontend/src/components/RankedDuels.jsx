import { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../api';
import { useWebSocket } from '../useWebSocket';
import { useT } from '../context/LangContext';

export default function RankedDuels() {
  const t = useT();
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
      <div className="ranked-header">{t('duels_title')}</div>

      <div className="ranked-tabs">
        <button className={tab === 'me' ? 'active' : ''} onClick={() => setTab('me')}>{t('ranked_my_rank')}</button>
        <button className={tab === 'lb' ? 'active' : ''} onClick={() => { setTab('lb'); loadLb(); }}>{t('ranked_leaderboard')}</button>
      </div>

      {tab === 'me' && (
        <>
          <div className="ranked-profile">
            <span className="ranked-league-icon">{leagueIcon(data.league)}</span>
            <div>
              <div className="ranked-league-name">{t('league_' + data.league.toLowerCase())}</div>
              <div className="ranked-elo">{data.elo} ELO</div>
              <div className="ranked-wl">{t('ranked_wl', { w: data.wins, l: data.losses })}</div>
            </div>
          </div>

          <div className="ranked-leagues-preview">
            {(data.leagues || []).map(l => (
              <div key={l.name} className={`ranked-league-row ${data.league === l.name ? 'current' : ''}`}>
                <span>{l.icon} {t('league_' + l.name.toLowerCase())}</span>
                <span>{l.minElo}+ ELO</span>
                <span>💎 {l.gemReward}/{t('common_season')}</span>
              </div>
            ))}
          </div>

          {!duel && (
            <button className="ranked-find-btn" onClick={findMatch} disabled={loading}>
              {loading ? t('ranked_searching') : t('ranked_find')}
            </button>
          )}

          {duel?.status === 'pending' && (
            <div className="ranked-waiting">
              <div className="ranked-wait-spinner">⏳</div>
              <div>{t('ranked_waiting')}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 4 }}>
                {t('ranked_matching', { n: data.matchmakingRange || 150 })}
              </div>
            </div>
          )}

          {duel?.status === 'active' && (
            <div className="ranked-duel-active">
              <div className="ranked-duel-timer">{timeLeft}s</div>
              <div className="ranked-duel-label">{t('ranked_battle')}</div>
              <div className="ranked-live-scores">
                <div className="ranked-live-score ranked-live-score--me">
                  <span>{t('ranked_you')}</span>
                  <span className="ranked-live-bp">{myBP.toLocaleString()}</span>
                </div>
                <span className="ranked-vs">VS</span>
                <div className="ranked-live-score ranked-live-score--op">
                  <span>{t('ranked_opponent')}</span>
                  <span className="ranked-live-bp">{opBP.toLocaleString()}</span>
                </div>
              </div>
              <button className="ranked-tap-btn" onClick={tapDuel}>{t('ranked_tap')}</button>
              <div className={`ranked-lead-indicator ${myBP >= opBP ? 'winning' : 'losing'}`}>
                {myBP > opBP ? t('ranked_winning') : myBP === opBP ? t('ranked_tied') : t('ranked_behind')}
              </div>
            </div>
          )}

          {duel?.status === 'completed' && (
            <div className="ranked-result">
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>
                {duel.winner_id ? t('ranked_victory') : t('ranked_defeat')}
              </div>
              <button className="ranked-find-btn" onClick={() => { setMyBP(0); setOpBP(0); load(); }}>
                {t('ranked_play_again')}
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
              <span className="ranked-lb-wl">{t('ranked_wl', { w: r.wins, l: r.losses })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
