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
import TapGame from './components/TapGame';
import UpgradeShop from './components/UpgradeShop';
import TapLeaderboard from './components/TapLeaderboard';
import PassiveCards from './components/PassiveCards';
import WheelSpin from './components/WheelSpin';
import TapperMissions from './components/TapperMissions';

const TABS = [
  { id: 'home',  icon: '🏠', label: 'Home' },
  { id: 'tap',   icon: '🧠', label: 'Tap' },
  { id: 'cards', icon: '🃏', label: 'Cards' },
  { id: 'boost', icon: '⚡', label: 'Boost' },
  { id: 'board', icon: '🏆', label: 'Board' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('home');
  const [achievementQueue, setAchievementQueue] = useState([]);
  const [achievementsRefreshKey, setAchievementsRefreshKey] = useState(0);

  useEffect(() => {
    initTelegram();
    const ref = getStartParam();
    api.register(ref)
      .then((data) => setUser(data.user))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAchievements = (unlocked) => {
    setAchievementQueue((q) => [...q, ...unlocked]);
    setAchievementsRefreshKey((k) => k + 1);
  };

  const dismissAchievementToast = () => setAchievementQueue((q) => q.slice(1));
  const handleCoinsEarned = (amount) => setUser((u) => u ? { ...u, coins: u.coins + amount } : u);
  const handleCoinsSpent = (amount) => setUser((u) => u ? { ...u, coins: Math.max(0, u.coins - amount) } : u);

  if (loading) return <div className="loading-screen">Loading brainrot...</div>;
  if (error)   return <div className="error-screen">Error: {error}</div>;

  return (
    <div className="app">
      <Header />
      <Onboarding />
      <AchievementToast achievement={achievementQueue[0] || null} onDone={dismissAchievementToast} />
      <Balance user={user} />

      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? ' tab-btn--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-btn-icon">{t.icon}</span>
            <span className="tab-btn-label">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'home' && (
        <>
          <FarmButton user={user} onFarmed={setUser} onAchievements={handleAchievements} />
          <DailyReward user={user} onClaimed={setUser} onAchievements={handleAchievements} />
          <Referral user={user} />
          <Achievements refreshKey={achievementsRefreshKey} />
          <Leaderboard currentUserId={user?.telegram_id} />
        </>
      )}

      {tab === 'tap' && (
        <TapGame user={user} onCoinsEarned={handleCoinsEarned} onAchievements={handleAchievements} />
      )}

      {tab === 'cards' && (
        <PassiveCards userCoins={user?.coins || 0} onCoinsSpent={handleCoinsSpent} />
      )}

      {tab === 'boost' && (
        <>
          <WheelSpin onEarned={handleCoinsEarned} />
          <TapperMissions onEarned={handleCoinsEarned} />
          <UpgradeShop userCoins={user?.coins || 0} onCoinsSpent={handleCoinsSpent} />
        </>
      )}

      {tab === 'board' && (
        <>
          <TapLeaderboard currentUserId={user?.telegram_id} />
          <Leaderboard currentUserId={user?.telegram_id} />
        </>
      )}
    </div>
  );
}
