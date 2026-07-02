import { useEffect } from 'react';
import { useT } from '../context/LangContext';

export default function AchievementToast({ achievement, onDone }) {
  const t = useT();

  useEffect(() => {
    if (!achievement) return;
    const timer = setTimeout(onDone, 3200);
    return () => clearTimeout(timer);
  }, [achievement, onDone]);

  if (!achievement) return null;

  return (
    <div className="achievement-toast">
      <span className="achievement-toast-emoji">{achievement.emoji}</span>
      <div>
        <div className="achievement-toast-title">{t('ach_toast_title')}</div>
        <div className="achievement-toast-name">
          {achievement.name} · +{achievement.reward}
        </div>
      </div>
    </div>
  );
}
