import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useT } from '../context/LangContext';

export default function WeatherSystem() {
  const t = useT();
  const [data, setData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    api.weather.status().then(d => {
      setData(d);
      setTimeLeft(Math.max(0, Math.ceil(d.timeLeftMs / 1000)));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!data?.endsAt) return;
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((data.endsAt - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) clearInterval(timerRef.current);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [data?.endsAt]);

  if (!data) return null;

  const hrs = Math.floor(timeLeft / 3600);
  const mins = Math.floor((timeLeft % 3600) / 60);
  const secs = timeLeft % 60;

  return (
    <div className="weather-panel" style={{ '--weather-color': data.color }}>
      <div className="weather-top">
        <span className="weather-icon">{data.icon}</span>
        <div className="weather-info">
          <div className="weather-name">{data.name}</div>
          <div className="weather-desc">{data.desc}</div>
        </div>
        <div className="weather-timer">
          {hrs > 0 && `${hrs}${t('weather_hr')} `}{String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
        </div>
      </div>
      <div className="weather-tag">{t('weather_tag')}</div>
    </div>
  );
}
