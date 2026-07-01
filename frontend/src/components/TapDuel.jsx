import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function TapDuel({ currentUserId }) {
  const [duels, setDuels] = useState([]);
  const [activeDuel, setActiveDuel] = useState(null);
  const [secsLeft, setSecsLeft] = useState(0);
  const [myBp, setMyBp] = useState(0);
  const [challengeUsername, setChallengeUsername] = useState('');
  const [stakeGems, setStakeGems] = useState(5);
  const [acting, setActing] = useState(false);
  const tapRef = useRef(0);
  const intervalRef = useRef(null);

  const loadDuels = async () => {
    const res = await api.duels.list();
    setDuels(res.duels);
    const active = res.duels.find((d) => d.status === 'active');
    if (active) enterDuel(active);
  };

  useEffect(() => { loadDuels(); }, []);

  const enterDuel = (duel) => {
    setActiveDuel(duel);
    const secs = Math.max(0, Math.ceil((Number(duel.ends_at) - Date.now()) / 1000));
    setSecsLeft(secs);
    setMyBp(currentUserId === duel.challenger_id ? Number(duel.challenger_bp) : Number(duel.opponent_bp));
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      setSecsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          // flush pending taps then resolve
          if (tapRef.current > 0) {
            api.duels.tap(duel.id, tapRef.current).catch(() => {});
            tapRef.current = 0;
          }
          api.duels.resolve(duel.id).catch(() => {}).finally(loadDuels);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const handleTapDuel = () => {
    if (!activeDuel || secsLeft === 0) return;
    tapRef.current += 1;
    setMyBp((b) => b + 1);
    if (tapRef.current % 5 === 0) {
      api.duels.tap(activeDuel.id, 5).catch(() => {});
      tapRef.current = 0;
    }
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch {}
  };

  const handleChallenge = async (e) => {
    e.preventDefault();
    if (acting) return;
    setActing(true);
    try {
      await api.duels.challenge(challengeUsername, stakeGems);
      setChallengeUsername('');
      loadDuels();
    } catch (err) { alert(err.message); }
    finally { setActing(false); }
  };

  const handleAccept = async (duelId) => {
    setActing(true);
    try {
      const res = await api.duels.accept(duelId);
      loadDuels();
      if (res.endsAt) {
        const d = duels.find((d) => d.id === duelId);
        if (d) enterDuel({ ...d, status: 'active', ends_at: res.endsAt, challenger_bp: 0, opponent_bp: 0 });
      }
    } catch (err) { alert(err.message); }
    finally { setActing(false); }
  };

  const handleDecline = async (duelId) => {
    setActing(true);
    try { await api.duels.decline(duelId); loadDuels(); } catch (err) { alert(err.message); }
    finally { setActing(false); }
  };

  if (activeDuel && secsLeft > 0) {
    return (
      <div className="duel-active">
        <div className="duel-timer">⚔️ {secsLeft}s</div>
        <div className="duel-score">You: {myBp} BP</div>
        <div className="duel-tap-area" onClick={handleTapDuel}>
          <div className="duel-brain">🧠</div>
          <div className="duel-tap-hint">TAP!</div>
        </div>
        <div className="duel-stake">💎 {activeDuel.stake_gems * 2} gems pot</div>
      </div>
    );
  }

  const pendingForMe = duels.filter((d) => d.status === 'pending' && d.opponent_id === currentUserId);
  const myPending = duels.filter((d) => d.status === 'pending' && d.challenger_id === currentUserId);
  const finished = duels.filter((d) => d.status === 'finished').slice(0, 3);

  return (
    <div className="duel-section">
      <div className="duel-header">⚔️ Tap Duels</div>

      <form className="duel-challenge-form" onSubmit={handleChallenge}>
        <input
          className="duel-input"
          placeholder="@username to challenge"
          value={challengeUsername}
          onChange={(e) => setChallengeUsername(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12 }}>Stake:</span>
          <input
            type="number" min={3} max={50} value={stakeGems}
            onChange={(e) => setStakeGems(Math.max(3, Math.min(50, parseInt(e.target.value) || 5)))}
            className="duel-stake-input"
          />
          <span style={{ fontSize: 12 }}>💎</span>
          <button type="submit" className="duel-challenge-btn" disabled={acting || !challengeUsername}>
            {acting ? '...' : 'Challenge'}
          </button>
        </div>
      </form>

      {pendingForMe.length > 0 && (
        <div className="duel-pending-section">
          <div className="duel-sub-title">📨 Challenges received</div>
          {pendingForMe.map((d) => (
            <div key={d.id} className="duel-row">
              <span>{d.challenger_name} challenged you · 💎{d.stake_gems}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="duel-accept-btn" onClick={() => handleAccept(d.id)} disabled={acting}>Accept</button>
                <button className="duel-decline-btn" onClick={() => handleDecline(d.id)} disabled={acting}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {myPending.length > 0 && (
        <div className="duel-pending-section">
          <div className="duel-sub-title">⏳ Waiting for response</div>
          {myPending.map((d) => (
            <div key={d.id} className="duel-row">
              <span>Challenged {d.opponent_name} · 💎{d.stake_gems}</span>
            </div>
          ))}
        </div>
      )}

      {finished.length > 0 && (
        <div className="duel-pending-section">
          <div className="duel-sub-title">📜 Recent Results</div>
          {finished.map((d) => {
            const iWon = d.winner_id === currentUserId;
            const isCh = d.challenger_id === currentUserId;
            return (
              <div key={d.id} className={`duel-row${iWon ? ' duel-row--won' : ' duel-row--lost'}`}>
                <span>
                  {isCh ? `vs ${d.opponent_name}` : `vs ${d.challenger_name}`}
                </span>
                <span>
                  {d.winner_id ? (iWon ? `🏆 +${d.stake_gems}💎` : `❌ -${d.stake_gems}💎`) : '🤝 Tie'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
