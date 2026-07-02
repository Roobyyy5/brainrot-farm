import { useState, useEffect } from 'react';
import { api } from '../api';

export default function ClanBracket() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('bracket');

  const load = () => api.clanbracket.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const act = async (fn) => { setLoading(true); try { await fn(); load(); } catch (err) { alert(err.message); } finally { setLoading(false); } };

  const myGuildId = data?.myGuildId;
  const bracket = data?.bracket;
  const entries = data?.entries || [];
  const matches = data?.matches || [];
  const registered = entries.some(e => e.guild_id === myGuildId);

  const roundNumbers = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);

  if (!data) return null;

  return (
    <div className="clanbracket-panel">
      <div className="clanbracket-header">🏆 Clan War Bracket</div>

      {!myGuildId && (
        <div className="clanbracket-noguild">Join a guild to participate in Clan Bracket Tournaments!</div>
      )}

      {myGuildId && (
        <>
          <div className="clanbracket-tabs">
            <button className={tab === 'bracket' ? 'active' : ''} onClick={() => setTab('bracket')}>Bracket</button>
            <button className={tab === 'info' ? 'active' : ''} onClick={() => setTab('info')}>Info</button>
          </div>

          {tab === 'info' && (
            <div className="clanbracket-info">
              <p>🏆 Win bracket matches by dealing more total tap damage than the enemy guild.</p>
              <p>⚔️ Each match lasts 48 hours. The guild with more BP wins.</p>
              <p>💎 Winner: 200 gems each | Finalist: 100 gems | Semifinal: 50 gems</p>
              {!bracket && !registered && (
                <button className="clanbracket-btn" onClick={() => act(api.clanbracket.register)} disabled={loading || !myGuildId}>
                  📋 Register My Guild
                </button>
              )}
              {bracket?.status === 'open' && registered && !loading && (
                <button className="clanbracket-btn clanbracket-btn--start" onClick={() => act(api.clanbracket.start)} disabled={loading}>
                  🚀 Start Tournament (need 2+ guilds)
                </button>
              )}
            </div>
          )}

          {tab === 'bracket' && (
            <>
              {!bracket && (
                <div className="clanbracket-empty">
                  No bracket this week yet.
                  {!registered && myGuildId && (
                    <button className="clanbracket-btn" style={{ marginTop: 10 }} onClick={() => act(api.clanbracket.register)} disabled={loading}>
                      📋 Register Guild
                    </button>
                  )}
                  {registered && <div style={{ marginTop: 8, color: 'var(--text-dim)', fontSize: '0.78rem' }}>✅ Registered! Waiting for more guilds...</div>}
                </div>
              )}

              {bracket && (
                <>
                  <div className={`clanbracket-status clanbracket-status--${bracket.status}`}>
                    {bracket.status === 'open' ? '⏳ Registration Open' : bracket.status === 'active' ? '⚔️ Tournament Active' : '✅ Completed'}
                  </div>

                  {bracket.status === 'active' && (
                    <button className="clanbracket-tap-btn" onClick={() => act(() => api.clanbracket.tap(50))} disabled={loading}>
                      ⚔️ Contribute 50 Taps
                    </button>
                  )}

                  {roundNumbers.map(round => (
                    <div key={round} className="clanbracket-round">
                      <div className="clanbracket-round-label">Round {round}</div>
                      {matches.filter(m => m.round === round).map(m => (
                        <div key={m.id} className={`clanbracket-match ${m.settled ? 'settled' : ''}`}>
                          <div className={`clanbracket-guild ${m.winner_id === m.guild_a_id ? 'winner' : ''} ${m.guild_a_id === myGuildId ? 'mine' : ''}`}>
                            {m.guild_a_id === myGuildId ? '⭐ ' : ''}{m.guild_a_name}
                            <span className="clanbracket-score">{Number(m.score_a).toLocaleString()}</span>
                          </div>
                          <span className="clanbracket-vs">VS</span>
                          <div className={`clanbracket-guild ${m.winner_id === m.guild_b_id ? 'winner' : ''} ${m.guild_b_id === myGuildId ? 'mine' : ''}`}>
                            {m.guild_b_id ? (m.guild_b_id === myGuildId ? '⭐ ' : '') + m.guild_b_name : 'BYE'}
                            {m.guild_b_id && <span className="clanbracket-score">{Number(m.score_b).toLocaleString()}</span>}
                          </div>
                          {!m.settled && m.ends_at && (
                            <div className="clanbracket-match-time">
                              Ends: {new Date(Number(m.ends_at)).toLocaleDateString()}
                              {Number(m.ends_at) < Date.now() && (
                                <button className="clanbracket-settle-btn" onClick={() => act(() => api.clanbracket.settle(m.id))} disabled={loading}>
                                  Settle
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
