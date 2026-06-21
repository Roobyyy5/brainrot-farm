import { useEffect, useState } from 'react';
import { api } from '../api';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || 'YourBotUsername';

export default function Referral({ user }) {
  const [info, setInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.referral().then(setInfo).catch(() => {});
  }, [user]);

  if (!info) return null;

  const link = `https://t.me/${BOT_USERNAME}?startapp=${info.referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="referral-section">
      <div className="referral-title">Invite Friends, Become Gigachad</div>
      <div className="referral-link" onClick={handleCopy}>
        {link}
      </div>
      {copied && <div className="referral-copied">Copied!</div>}
      <div className="referral-stats">
        Total: {info.totalReferrals} · Active: {info.activeReferrals}
      </div>
    </div>
  );
}
