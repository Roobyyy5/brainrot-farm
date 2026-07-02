import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function ClanBracket() {
  const t = useT();
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
      <div className="clanbracket-header">{t('bracket_title')}</div>

      {!myGuildId && (
        <div className="clanbracket-noguild">{t('bracket_join_guild')}</div>
      )}

      {myGuildId && (
        <>
          <div className="clanbracket-tabs">
            <button className={tab === 'bracket' ? 'active' : ''} onClick={() => setTab('bracket')}>{t('bracket_tab_bracket')}</button>
            <button className={tab === 'info' ? 'active' : ''} onClick={() => setTab('info')}>{t('bracket_tab_info')}</button>
          </div>

          {tab === 'info' && (
            <div className="clanbracket-info">
              <p>{t('bracket_info_1')}</p>
              <p>{t('bracket_info_2')}</p>
              <p>{t('bracket_info_3')}</p>
              {!bracket && !registered && (
                <button className="clanbracket-btn" onClick={() => act(api.clanbracket.register)} disabled={loading || !myGuildId}>
                  {t('bracket_register')}
                </button>
              )}
              {bracket?.status === 'open' && registered && !loading && (
                <button className="clanbracket-btn clanbracket-btn--start" onClick={() => act(api.clanbracket.start)} disabled={loading}>
                  {t('bracket_start')}
                </button>
              )}
            </div>
          )}

          {tab === 'bracket' && (
            <>
              {!bracket && (
                <div className="clanbracket-empty">
                  {t('bracket_no_bracket')}
                  {!registered && myGuildId && (
                    <button className="clanbracket-btn" style={{ marginTop: 10 }} onClick={() => act(api.clanbracket.register)} disabled={loading}>
                      {t('bracket_register_guild')}
                    </button>
                  )}
                  {registered && <div style={{ marginTop: 8, color: 'var(--text-dim)', fontSize: '0.78rem' }}>{t('bracket_registered')}</div>}
                </div>
              )}

              {bracket && (
                <>
                  <div className={`clanbracket-status clanbracket-status--${bracket.status}`}>
                    {bracket.status === 'open' ? t('bracket_status_open') : bracket.status === 'active' ? t('bracket_status_active') : t('bracket_status_done')}
                  </div>

                  {bracket.status === 'active' && (
                    <button className="clanbracket-tap-btn" onClick={() => act(() => api.clanbracket.tap(50))} disabled={loading}>
                      {t('bracket_tap_btn')}
                    </button>
                  )}

                  {roundNumbers.map(round => (
                    <div key={round} className="clanbracket-round">
                      <div className="clanbracket-round-label">{t('bracket_round', { n: round })}</div>
                      {matches.filter(m => m.round === round).map(m => (
                        <div key={m.id} className={`clanbracket-match ${m.settled ? 'settled' : ''}`}>
                          <div className={`clanbracket-guild ${m.winner_id === m.guild_a_id ? 'winner' : ''} ${m.guild_a_id === myGuildId ? 'mine' : ''}`}>
                            {m.guild_a_id === myGuildId ? '⭐ ' : ''}{m.guild_a_name}
                            <span className="clanbracket-score">{Number(m.score_a).toLocaleString()}</span>
                          </div>
                          <span className="clanbracket-vs">VS</span>
                          <div className={`clanbracket-guild ${m.winner_id === m.guild_b_id ? 'winner' : ''} ${m.guild_b_id === myGuildId ? 'mine' : ''}`}>
                            {m.guild_b_id ? (m.guild_b_id === myGuildId ? '⭐ ' : '') + m.guild_b_name : t('bracket_bye')}
                            {m.guild_b_id && <span className="clanbracket-score">{Number(m.score_b).toLocaleString()}</span>}
                          </div>
                          {!m.settled && m.ends_at && (
                            <div className="clanbracket-match-time">
                              {t('bracket_ends', { date: new Date(Number(m.ends_at)).toLocaleDateString() })}
                              {Number(m.ends_at) < Date.now() && (
                                <button className="clanbracket-settle-btn" onClick={() => act(() => api.clanbracket.settle(m.id))} disabled={loading}>
                                  {t('bracket_settle')}
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
