import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useWebSocket } from '../useWebSocket';
import { useT } from '../context/LangContext';

export default function WorldEvents() {
  const t = useT();
  const [events, setEvents] = useState([]);
  const [flash, setFlash] = useState(null);
  const timersRef = useRef({});

  const load = () => api.worldevents.list().then(d => setEvents(d.events || [])).catch(() => {});

  useEffect(() => { load(); }, []);

  useWebSocket({
    rooms: ['global'],
    onMessage: (msg) => {
      if (msg.type === 'world_event') {
        const ev = msg.event;
        setEvents(prev => {
          const filtered = prev.filter(e => e.key !== ev.key);
          return [{ ...ev, remainingMs: ev.endsAt - Date.now() }, ...filtered];
        });
        setFlash(ev);
        setTimeout(() => setFlash(null), 5000);
      }
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setEvents(prev => prev
        .map(e => ({ ...e, remainingMs: Math.max(0, e.endsAt - Date.now()) }))
        .filter(e => e.remainingMs > 0)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (events.length === 0 && !flash) return null;

  const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  };

  return (
    <>
      {flash && (
        <div className="worldevent-flash">
          <span className="worldevent-flash-icon">{flash.icon}</span>
          <div className="worldevent-flash-content">
            <div className="worldevent-flash-name">{t('we_flash_title', { name: flash.name })}</div>
            <div className="worldevent-flash-desc">{flash.desc}</div>
          </div>
        </div>
      )}

      {events.length > 0 && (
        <div className="worldevent-panel">
          <div className="worldevent-header">{t('we_header')}</div>
          {events.map(ev => (
            <div key={ev.id} className="worldevent-card">
              <span className="worldevent-icon">{ev.icon}</span>
              <div className="worldevent-info">
                <div className="worldevent-name">{ev.name}</div>
                <div className="worldevent-timer">⏳ {fmt(ev.remainingMs)}</div>
              </div>
              <div className="worldevent-effect">{effectLabel(ev.effect, ev.value)}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function effectLabel(effect, value) {
  switch (effect) {
    case 'tapMult':     return `×${value} Tap`;
    case 'noComboDecay': return '♾ Combo';
    case 'gemFreq':     return `1/${value} Gems`;
    case 'autoCrit':    return '100% Crit';
    case 'regenMult':   return `×${value} Regen`;
    case 'masteryMult': return `×${value} XP`;
    default:            return `×${value}`;
  }
}
