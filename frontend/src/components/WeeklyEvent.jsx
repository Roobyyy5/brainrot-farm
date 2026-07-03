import { useT } from '../context/LangContext';

export default function WeeklyEvent({ event }) {
  const t = useT();
  if (!event) return null;
  const evName = (ev) => { const k = 'weekly_ev_' + ev.key + '_name'; const v = t(k); return v === k ? ev.name : v; };
  const evDesc = (ev) => { const k = 'weekly_ev_' + ev.key + '_desc'; const v = t(k); return v === k ? ev.desc : v; };
  return (
    <div className="weekly-event-banner">
      <span className="we-icon">{event.icon}</span>
      <div className="we-text">
        <div className="we-name">{evName(event)}</div>
        <div className="we-desc">{evDesc(event)}</div>
      </div>
      <div className="we-badge">{t('weekly_event_title')}</div>
    </div>
  );
}
