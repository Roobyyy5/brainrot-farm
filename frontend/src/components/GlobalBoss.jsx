import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useWebSocket } from '../useWebSocket';
import { useT } from '../context/LangContext';

export default function GlobalBoss() {
  const t = useT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  const load = () => api.globalboss.status().then(d => {
    setData(d);
    if (d.event?.endsAt) {
      setTimeLeft(Math.max(0, Math.ceil((d.event.endsAt - Date.now()) / 1000)));
    }
  }).catch(() => {});

  useEffect(() => { load(); }, []);

  useWebSocket({
    rooms: ['global'],
    onMessage: (msg) => {
      if (msg.type === 'global_boss_hp') {
        setData(prev => prev?.event ? {
          ...prev,
          event: { ...prev.event, currentHp: msg.currentHp },
        } : prev);
      }
      if (msg.type === 'global_boss_defeated' || msg.type === 'global_boss_spawned') {
        load();
      }
    },
  });

  useEffect(() => {
    if (!data?.event?.endsAt) return;
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((data.event.endsAt - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) { clearInterval(timerRef.current); load(); }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [data?.event?.endsAt]);

  const tap = async () => {
    setLoading(true);
    try {
      const r = await api.globalboss.tap(50);
      setData(prev => prev?.event ? {
        ...prev,
        event: { ...prev.event, currentHp: r.newHp },
        myDamage: (prev.myDamage || 0) + r.damage,
      } : prev);
      if (r.defeated) { alert(t('gboss_defeated')); load(); }
      if (r.newMilestones?.length > 0) { load(); }
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!data) return null;

  const hours = Math.floor(timeLeft / 3600);
  const mins  = Math.floor((timeLeft % 3600) / 60);
  const secs  = timeLeft % 60;

  if (!data.active) {
    return (
      <div className="globalboss-panel">
        <div className="globalboss-header">{t('gboss_header')}</div>
        <div className="globalboss-inactive">
          <div className="globalboss-next-icon">{data.nextBoss?.icon}</div>
          <div className="globalboss-next-name">{t('gboss_next', { name: data.nextBoss?.name })}</div>
          <div className="globalboss-next-sub">{t('gboss_schedule')}</div>
        </div>
      </div>
    );
  }

  const ev = data.event;
  const hpPct = ev.maxHp > 0 ? (ev.currentHp / ev.maxHp) * 100 : 0;

  return (
    <div className="globalboss-panel" style={{ borderColor: ev.color }}>
      <div className="globalboss-header">{t('gboss_header_active')}</div>

      <div className="globalboss-boss" style={{ color: ev.color }}>
        <span className="globalboss-icon">{ev.icon}</span>
        <span className="globalboss-name">{ev.name}</span>
      </div>

      <div className="globalboss-hp-wrap">
        <div className="globalboss-hp-bar">
          <div className="globalboss-hp-fill" style={{ width: `${hpPct}%`, background: ev.color }} />
        </div>
        <div className="globalboss-hp-text">
          {(ev.currentHp / 1_000_000).toFixed(1)}M / {(ev.maxHp / 1_000_000).toFixed(1)}M HP
        </div>
      </div>

      <div className="globalboss-milestones">
        {ev.milestones.map(ms => {
          const hit = ev.milestonesHit?.includes(ms.pct);
          const nowPct = 100 - hpPct;
          const reached = nowPct >= ms.pct;
          return (
            <div key={ms.pct} className={`globalboss-ms ${hit ? 'hit' : reached ? 'reached' : ''}`}>
              <div className="globalboss-ms-mark" style={{ left: `${ms.pct}%` }}>
                <span>{ms.pct}%</span>
                <span className="globalboss-ms-gem">+{ms.reward.gems}💎</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="globalboss-stats">
        <div>{t('gboss_participants', { n: ev.participants })}</div>
        <div>{t('gboss_my_dmg', { n: (data.myDamage || 0).toLocaleString() })}</div>
        <div>{t('gboss_timer', { h: hours, m: String(mins).padStart(2,'0'), s: String(secs).padStart(2,'0') })}</div>
      </div>

      <button className="globalboss-tap-btn" onClick={tap} disabled={loading} style={{ background: `linear-gradient(135deg, ${ev.color}88, ${ev.color})` }}>
        {t('gboss_attack')}
      </button>

      {data.topDamage?.length > 0 && (
        <div className="globalboss-lb">
          <div className="globalboss-lb-title">{t('gboss_lb_title')}</div>
          {data.topDamage.slice(0, 5).map(r => (
            <div key={r.rank} className={`globalboss-lb-row ${r.isMe ? 'me' : ''}`}>
              <span>{r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank-1] : `#${r.rank}`}</span>
              <span className="globalboss-lb-name">{r.username}</span>
              <span className="globalboss-lb-dmg">{(r.damage / 1000).toFixed(0)}k</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
