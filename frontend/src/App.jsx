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
import GemShop from './components/GemShop';
import SkillTree from './components/SkillTree';
import BattlePass from './components/BattlePass';
import LoginStreak from './components/LoginStreak';
import DailyShop from './components/DailyShop';
import Guilds from './components/Guilds';
import TapDuel from './components/TapDuel';
import Pets from './components/Pets';
import WorldMap from './components/WorldMap';
import ProfilePage from './components/ProfilePage';
import ComboLeaderboard from './components/ComboLeaderboard';
import GuildWars from './components/GuildWars';
import WeeklyEvent from './components/WeeklyEvent';
import Tournament from './components/Tournament';
import PrestigeShop from './components/PrestigeShop';
import BossRush from './components/BossRush';
import Inventory from './components/Inventory';
import StatsDashboard from './components/StatsDashboard';
import Friends from './components/Friends';
import GuildChat from './components/GuildChat';
import TapRush from './components/TapRush';
import WorldBoss from './components/WorldBoss';
import GuildRaid from './components/GuildRaid';
import Wardrobe from './components/Wardrobe';
import ChallengeBoard from './components/ChallengeBoard';
import Crafting from './components/Crafting';
import SeasonLeaderboard from './components/SeasonLeaderboard';
import ReferralLeaderboard from './components/ReferralLeaderboard';

const TABS = [
  { id: 'home',  icon: '🏠', label: 'Home' },
  { id: 'tap',   icon: '🧠', label: 'Tap' },
  { id: 'cards', icon: '🃏', label: 'Cards' },
  { id: 'boost', icon: '⚡', label: 'Boost' },
  { id: 'club',  icon: '🏰', label: 'Club' },
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
  const handleGemsChanged = (delta) => setUser((u) => u ? { ...u, gems: Math.max(0, (u.gems || 0) + delta) } : u);

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
          <WeeklyEvent event={user?._weeklyEvent} />
          <FarmButton user={user} onFarmed={setUser} onAchievements={handleAchievements} />
          <DailyReward user={user} onClaimed={setUser} onAchievements={handleAchievements} />
          <Referral user={user} />
          <Achievements refreshKey={achievementsRefreshKey} />
          <Leaderboard currentUserId={user?.telegram_id} />
        </>
      )}

      {tab === 'tap' && (
        <>
          <TapRush />
          <TapGame user={user} onCoinsEarned={handleCoinsEarned} onAchievements={handleAchievements} />
          <BossRush />
          <WorldBoss />
        </>
      )}

      {tab === 'cards' && (
        <PassiveCards userCoins={user?.coins || 0} onCoinsSpent={handleCoinsSpent} />
      )}

      {tab === 'boost' && (
        <>
          <Wardrobe />
          <ChallengeBoard />
          <Inventory />
          <Crafting />
          <Pets />
          <WorldMap />
          <LoginStreak onEarned={handleCoinsEarned} onGemsChanged={handleGemsChanged} />
          <DailyShop onGemsChanged={handleGemsChanged} />
          <GemShop onGemsChanged={handleGemsChanged} onCoinsChanged={handleCoinsEarned} />
          <WheelSpin onEarned={handleCoinsEarned} />
          <TapperMissions onEarned={handleCoinsEarned} />
          <SkillTree />
          <BattlePass onGemsChanged={handleGemsChanged} />
          <PrestigeShop />
          <UpgradeShop userCoins={user?.coins || 0} onCoinsSpent={handleCoinsSpent} />
        </>
      )}

      {tab === 'club' && (
        <>
          <GuildWars />
          <GuildRaid />
          <Guilds onGemsChanged={handleGemsChanged} currentUsername={user?.username} />
          <GuildChat currentUsername={user?.username} />
          <TapDuel currentUserId={user?.telegram_id} />
          <Friends />
        </>
      )}

      {tab === 'board' && (
        <>
          <SeasonLeaderboard />
          <Tournament />
          <StatsDashboard />
          <ReferralLeaderboard />
          <ProfilePage currentUserId={user?.telegram_id} />
          <ComboLeaderboard />
          <TapLeaderboard currentUserId={user?.telegram_id} />
          <Leaderboard currentUserId={user?.telegram_id} />
        </>
      )}
    </div>
  );
}
