import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useWebSocket } from '../useWebSocket';

export default function CoopRaid() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [activeLobby, setActiveLobby] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  const load = () => api.coopraid.list().then(d => {
    setData(d);
    if (d.myLobby) {
      setActiveLobby(d.myLobby);
      setView('raid');
    }
  }).catch(() => {});

  useEffect(() => { load(); }, []);

  useWebSocket({
    rooms: activeLobby ? [`coopraid:${activeLobby.lobbyId}`] : [],
    onMessage: (msg) => {
      if (msg.type === 'raid_hp') {
        setActiveLobby(prev => prev ? { ...prev, hp: msg.hp } : prev);
      }
      if (msg.type === 'raid_started') {
        setActiveLobby(prev => prev ? { ...prev, status: 'active', endsAt: msg.endsAt, hp: msg.hp, maxHp: msg.maxHp } : prev);
      }
      if (msg.type === 'raid_cleared') {
        setActiveLobby(prev => prev ? { ...prev, hp: 0 } : prev);
        load();
      }
      if (msg.type === 'member_joined') {
        load();
      }
    },
  });

  useEffect(() => {
    if (!activeLobby?.endsAt) return;
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((activeLobby.endsAt - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) { clearInterval(timerRef.current); load(); }
    }, 500);
    return () => clearInterval(timerRef.current);
  }, [activeLobby?.endsAt]);

  const act = async (fn) => { setLoading(true); try { await fn(); await load(); } catch (err) { alert(err.message); } finally { setLoading(false); } };

  const create = async (bossKey) => {
    setLoading(true);
    try {
      const r = await api.coopraid.create(bossKey);
      setActiveLobby({ lobbyId: r.lobbyId, bossKey, hp: data.bossDefs.find(b => b.key === bossKey)?.hp || 0, maxHp: data.bossDefs.find(b => b.key === bossKey)?.hp || 0, status: 'waiting' });
      setView('raid');
      await load();
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const tap = async () => {
    if (!activeLobby) return;
    try {
      const r = await api.coopraid.tap(activeLobby.lobbyId, 25);
      setActiveLobby(prev => prev ? { ...prev, hp: r.newHp } : prev);
      if (r.lootEarned) { alert('💥 Boss defeated! Loot distributed!'); load(); }
    } catch (err) { alert(err.message); }
  };

  if (!data) return null;

  const hpPct = activeLobby?.maxHp > 0 ? (activeLobby.hp / activeLobby.maxHp * 100).toFixed(1) : 0;

  return (
    <div className="coopraid-panel">
      <div className="coopraid-header">👥 Cooperative Raid</div>

      {view === 'raid' && activeLobby ? (
        <div className="coopraid-active">
          <div className="coopraid-boss-name">
            {data.bossDefs?.find(b => b.key === activeLobby.bossKey)?.icon} {activeLobby.bossKey?.replace(/_/g, ' ').toUpperCase()}
          </div>
          <div className="coopraid-hp-bar">
            <div className="coopraid-hp-fill" style={{ width: `${hpPct}%` }} />
          </div>
          <div className="coopraid-hp-text">{(activeLobby.hp || 0).toLocaleString()} HP — {hpPct}%</div>

          {activeLobby.status === 'waiting' && (
            <div className="coopraid-waiting">
              <div className="coopraid-waiting-label">⏳ Waiting for players...</div>
              <button className="coopraid-start-btn" onClick={() => act(() => api.coopraid.start(activeLobby.lobbyId))} disabled={loading}>
                🚀 Start Raid
              </button>
            </div>
          )}

          {activeLobby.status === 'active' && (
            <>
              <div className="coopraid-timer">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</div>
              <button className="coopraid-tap-btn" onClick={tap} disabled={loading || activeLobby.hp <= 0}>
                ⚔️ ATTACK! (×25 taps)
              </button>
            </>
          )}

          <button className="coopraid-leave-btn" onClick={() => act(() => api.coopraid.leave(activeLobby.lobbyId))}>
            ← Leave Raid
          </button>
        </div>
      ) : (
        <>
          <div className="coopraid-create-title">Create a Raid</div>
          <div className="coopraid-boss-list">
            {(data.bossDefs || []).map(boss => (
              <div key={boss.key} className="coopraid-boss-card">
                <span className="coopraid-boss-icon">{boss.icon}</span>
                <div className="coopraid-boss-info">
                  <div className="coopraid-boss-name-sm">{boss.name}</div>
                  <div className="coopraid-boss-stats">{(boss.hp / 1_000_000).toFixed(0)}M HP • {boss.maxPlayers}p • {boss.durationMs / 60000}min</div>
                  <div className="coopraid-boss-loot">💎 {boss.loot.gems} + {boss.loot.topBonus} top bonus</div>
                </div>
                <button className="coopraid-create-btn" onClick={() => create(boss.key)} disabled={loading}>
                  Create
                </button>
              </div>
            ))}
          </div>

          {data.lobbies?.length > 0 && (
            <>
              <div className="coopraid-lobbies-title">Open Lobbies</div>
              {data.lobbies.map(l => {
                const def = data.bossDefs?.find(b => b.key === l.bossKey);
                return (
                  <div key={l.id} className="coopraid-lobby-row">
                    <span>{def?.icon} {l.creatorName}</span>
                    <span className="coopraid-lobby-boss">{def?.name}</span>
                    <span className="coopraid-lobby-members">{l.memberCount}/{def?.maxPlayers}</span>
                    <button className="coopraid-join-btn" onClick={() => act(() => api.coopraid.join(l.id))} disabled={loading}>
                      Join
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </>
      )}
    </div>
  );
}
