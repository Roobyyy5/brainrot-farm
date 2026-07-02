import { useT } from '../context/LangContext';

export default function WeeklyEvent({ event }) {
  const t = useT();
  if (!event) return null;
  return (
    <div className="weekly-event-banner">
      <span className="we-icon">{event.icon}</span>
      <div className="we-text">
        <div className="we-name">{event.name}</div>
        <div className="we-desc">{event.desc}</div>
      </div>
      <div className="we-badge">{t('weekly_event_title')}</div>
    </div>
  );
}
