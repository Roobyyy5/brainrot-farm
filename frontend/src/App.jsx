import { useEffect, useState } from 'react';
import { api } from './api';
import { useT, useSetDetectedLang } from './context/LangContext';
import { initTelegram, getStartParam } from './telegram';
import ErrorBoundary from './components/ErrorBoundary';
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
import ActiveAbilities from './components/ActiveAbilities';
import Ascension from './components/Ascension';
import Artifacts from './components/Artifacts';
import RankedDuels from './components/RankedDuels';
import MasteryPanel from './components/MasteryPanel';
import ClanBracket from './components/ClanBracket';
import TapChallenge from './components/TapChallenge';
import SeasonNarrative from './components/SeasonNarrative';
import GuildSkillTree from './components/GuildSkillTree';
import WorldEvents from './components/WorldEvents';
import BuildPresets from './components/BuildPresets';
import BossEcosystem from './components/BossEcosystem';
import QuestBoard from './components/QuestBoard';
import CoopRaid from './components/CoopRaid';
import RelicsPanel from './components/RelicsPanel';
import DivisionLeague from './components/DivisionLeague';
import SynergyBadges from './components/SynergyBadges';
import AchievementGallery from './components/AchievementGallery';
import RhythmTap from './components/RhythmTap';
import ShadowRival from './components/ShadowRival';
import TerritoryMap from './components/TerritoryMap';
import TapAlchemy from './components/TapAlchemy';
import StoryMode from './components/StoryMode';
import GlobalBoss from './components/GlobalBoss';
import TapGauntlet from './components/TapGauntlet';
import CardFusion from './components/CardFusion';
import GuildForge from './components/GuildForge';
import TapOracle from './components/TapOracle';
import Championship from './components/Championship';
import NeuralTree from './components/NeuralTree';
import WeatherSystem from './components/WeatherSystem';
import MentorSystem from './components/MentorSystem';
import AuctionHouse from './components/AuctionHouse';
import Constellation from './components/Constellation';
import TapStreakCalendar from './components/TapStreakCalendar';
import GuildOlympics from './components/GuildOlympics';
import Toast from './components/Toast';
import WalletPage from './components/WalletPage';

const TAB_IDS = [
  { id: 'home',   icon: '🏠', key: 'tab_home'   },
  { id: 'tap',    icon: '🧠', key: 'tab_tap'    },
  { id: 'cards',  icon: '🃏', key: 'tab_cards'  },
  { id: 'boost',  icon: '⚡', key: 'tab_boost'  },
  { id: 'club',   icon: '🏰', key: 'tab_club'   },
  { id: 'board',  icon: '🏆', key: 'tab_board'  },
  { id: 'wallet', icon: '💰', key: 'tab_wallet' },
];

export default function App() {
  const t = useT();
  const setDetectedLang = useSetDetectedLang();
  const [user, setUser] = useState(null);
  const [botUsername, setBotUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('home');
  const [achievementQueue, setAchievementQueue] = useState([]);
  const [achievementsRefreshKey, setAchievementsRefreshKey] = useState(0);

  useEffect(() => {
    initTelegram();
    const ref = getStartParam();
    api.register(ref)
      .then((data) => {
        setUser(data.user);
        if (data.tg_lang) setDetectedLang(data.tg_lang);
        if (data.bot_username) setBotUsername(data.bot_username);
      })
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

  if (loading) return <div className="loading-screen">{t('loading')}</div>;
  if (error)   return <div className="error-screen">⚠️ {error}</div>;

  return (
    <div className="app">
      <Header />
      <Onboarding />
      <AchievementToast achievement={achievementQueue[0] || null} onDone={dismissAchievementToast} />
      <Balance user={user} />

      <div className="tab-bar">
        {TAB_IDS.map((tb) => (
          <button
            key={tb.id}
            className={`tab-btn${tab === tb.id ? ' tab-btn--active' : ''}`}
            onClick={() => setTab(tb.id)}
          >
            <span className="tab-btn-icon">{tb.icon}</span>
            <span className="tab-btn-label">{t(tb.key)}</span>
          </button>
        ))}
      </div>

      <ErrorBoundary key={tab}>
      {tab === 'home' && (
        <>
          <WeatherSystem />
          <TapStreakCalendar />
          <WeeklyEvent event={user?._weeklyEvent} />
          <FarmButton user={user} onFarmed={setUser} onAchievements={handleAchievements} />
          <DailyReward user={user} onClaimed={setUser} onAchievements={handleAchievements} />
          <Referral user={user} botUsername={botUsername} />
          <Achievements refreshKey={achievementsRefreshKey} />
          <Leaderboard currentUserId={user?.telegram_id} />
        </>
      )}

      {tab === 'tap' && (
        <>
          <TapGame user={user} onCoinsEarned={handleCoinsEarned} onAchievements={handleAchievements} />
          <GlobalBoss />
          <WorldEvents />
          <QuestBoard />
          <RhythmTap />
          <TapGauntlet />
          <StoryMode />
          <SeasonNarrative />
          <TapRush />
          <ActiveAbilities />
          <TapChallenge />
          <BossEcosystem />
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
          <Ascension />
          <Artifacts />
          <MasteryPanel />
          <BuildPresets />
          <NeuralTree />
          <Constellation />
          <TapAlchemy />
          <TapOracle />
          <CardFusion />
          <SynergyBadges />
          <RelicsPanel />
          <UpgradeShop userCoins={user?.coins || 0} onCoinsSpent={handleCoinsSpent} />
        </>
      )}

      {tab === 'club' && (
        <>
          <GuildOlympics />
          <MentorSystem />
          <AuctionHouse />
          <GuildSkillTree />
          <GuildForge />
          <TerritoryMap />
          <ClanBracket />
          <CoopRaid />
          <ShadowRival />
          <GuildWars />
          <GuildRaid />
          <Guilds onGemsChanged={handleGemsChanged} currentUsername={user?.username} />
          <GuildChat currentUsername={user?.username} />
          <RankedDuels />
          <TapDuel currentUserId={user?.telegram_id} />
          <Friends />
        </>
      )}

      {tab === 'board' && (
        <>
          <Championship />
          <DivisionLeague />
          <AchievementGallery />
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

      {tab === 'wallet' && <WalletPage />}
      </ErrorBoundary>
      <Toast />
    </div>
  );
}
