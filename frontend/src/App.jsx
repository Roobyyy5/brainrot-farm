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

export default function App() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initTelegram();
    const ref = getStartParam();
    api
      .register(ref)
      .then((data) => setUser(data.user))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen">Loading brainrot...</div>;
  if (error) return <div className="error-screen">Error: {error}</div>;

  return (
    <div className="app">
      <Header user={user} />
      <Onboarding />
      <Balance user={user} />
      <FarmButton user={user} onFarmed={setUser} />
      <DailyReward onClaimed={setUser} />
      <Referral user={user} />
      <Leaderboard currentUserId={user?.telegram_id} />
    </div>
  );
}
