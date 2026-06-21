import { useEffect, useState } from 'react';
import { api } from './api';
import { initTelegram, getStartParam } from './telegram';
import Header from './components/Header';
import Onboarding from './components/Onboarding';
import Balance from './components/Balance';
import FarmButton from './components/FarmButton';
import DailyReward from './components/DailyReward';
import Referral from './components/Referral';
import Leaderboard from './components/Leaderboard';
import Achievements from './components/Achievements';
import AchievementToast from './components/AchievementToast';

export default function App() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [achievementQueue, setAchievementQueue] = useState([]);
  const [achievementsRefreshKey, setAchievementsRefreshKey] = useState(0);

  useEffect(() => {
    initTelegram();
    const ref = getStartParam();
    api
      .register(ref)
      .then((data) => setUser(data.user))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAchievements = (unlocked) => {
    setAchievementQueue((q) => [...q, ...unlocked]);
    setAchievementsRefreshKey((k) => k + 1);
  };

  const dismissAchievementToast = () => {
    setAchievementQueue((q) => q.slice(1));
  };

  if (loading) return <div className="loading-screen">Loading brainrot...</div>;
  if (error) return <div className="error-screen">Error: {error}</div>;

  return (
    <div className="app">
      <Header user={user} />
      <Onboarding />
      <AchievementToast achievement={achievementQueue[0] || null} onDone={dismissAchievementToast} />
      <Balance user={user} />
      <FarmButton user={user} onFarmed={setUser} onAchievements={handleAchievements} />
      <DailyReward onClaimed={setUser} onAchievements={handleAchievements} />
      <Referral user={user} />
      <Achievements refreshKey={achievementsRefreshKey} />
      <Leaderboard currentUserId={user?.telegram_id} />
    </div>
  );
}
