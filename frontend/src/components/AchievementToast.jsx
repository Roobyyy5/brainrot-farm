import { useEffect } from 'react';

export default function AchievementToast({ achievement, onDone }) {
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
        <div className="achievement-toast-title">Achievement unlocked!</div>
        <div className="achievement-toast-name">
          {achievement.name} · +{achievement.reward}
        </div>
      </div>
    </div>
  );
}
