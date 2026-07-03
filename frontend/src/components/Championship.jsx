import { useState, useEffect } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function Championship() {
  const t = useT();
  const [data, setData] = useState(null);

  const load = () => api.championship.status().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  if (!data) return null;

  const statusLabel = {
    qualifying: t('champ_status_qualifying'),
    bracket:    t('champ_status_bracket'),
    ended:      t('champ_status_ended'),
  };

  const me = data.me;
  const qualified = me?.qualified && data.topPlayers?.find(p => p.isMe)?.rank <= data.bracketSize;

  return (
    <div className="champ-panel">
      <div className="champ-header">{t('champ_header')}</div>
      <div className="champ-month">{data.monthKey} • {statusLabel[data.status] || data.status}</div>

      <div className="champ-my-card">
        <div className="champ-my-score">
          <span className="champ-my-score-label">{t('champ_my_score_label')}</span>
          <span className="champ-my-score-val">{(me?.score || 0).toLocaleString()}</span>
        </div>
        <div className={`champ-my-status ${qualified ? 'qualified' : ''}`}>
          {qualified ? t('champ_qualified') : t('champ_top_n', { n: data.bracketSize })}
        </div>
      </div>

      {data.status === 'bracket' && data.bracket?.matches && (
        <div className="champ-bracket">
          <div className="champ-bracket-title">{t('champ_round_of', { n: data.bracket.matches.length * 2 })}</div>
          {data.bracket.matches.slice(0, 8).map(m => (
            <div key={m.id} className="champ-match">
              <span className={`champ-match-player ${m.winner === m.p1 ? 'winner' : ''}`}>{t('champ_player1')}</span>
              <span className="champ-match-vs">{t('champ_vs')}</span>
              <span className={`champ-match-player ${m.winner === m.p2 ? 'winner' : ''}`}>{t('champ_player2')}</span>
              {m.score1 !== null && <span className="champ-match-score">{m.score1} : {m.score2}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="champ-prizes">
        <div className="champ-prizes-title">{t('champ_prizes_title')}</div>
        {data.prizes?.map(p => (
          <div key={p.place} className="champ-prize-row">
            <span className="champ-prize-place">{p.place === 1 ? '🥇' : p.place === 2 ? '🥈' : '🥉'}</span>
            <span className="champ-prize-title">{p.title}</span>
            <span className="champ-prize-gems">💎 {p.gems}</span>
          </div>
        ))}
        {data.topNRewards?.map(r => (
          <div key={r.label} className="champ-prize-row dim">
            <span className="champ-prize-place">🎖</span>
            <span className="champ-prize-title">{r.label}</span>
            <span className="champ-prize-gems">💎 {r.gems}</span>
          </div>
        ))}
      </div>

      <div className="champ-lb">
        <div className="champ-lb-title">{t('champ_lb_title')}</div>
        {data.topPlayers?.slice(0, 20).map(r => (
          <div key={r.rank} className={`champ-lb-row ${r.isMe ? 'me' : ''} ${r.qualified ? 'qualified' : ''}`}>
            <span className="champ-lb-rank">{r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank-1] : `#${r.rank}`}</span>
            <span className="champ-lb-name">{r.username}</span>
            <span className="champ-lb-score">{(r.score / 1000).toFixed(0)}k</span>
            {r.qualified && <span className="champ-lb-q">✅</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
