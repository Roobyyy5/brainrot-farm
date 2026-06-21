import { useEffect, useState } from 'react';
import { api } from '../api';
import { haptic, shareLink } from '../telegram';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || 'YourBotUsername';
const MINI_APP_SHORT_NAME = import.meta.env.VITE_MINI_APP_SHORT_NAME || '';

export default function Referral({ user }) {
  const [info, setInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.referral().then(setInfo).catch(() => {});
  }, [user]);

  if (!info) return null;

  const appPath = MINI_APP_SHORT_NAME ? `/${MINI_APP_SHORT_NAME}` : '';
  const link = `https://t.me/${BOT_USERNAME}${appPath}?startapp=${info.referralCode}`;

  const handleCopy = () => {
    haptic('light');
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = () => {
    haptic('light');
    const level = user?.level || 'NPC';
    shareLink(link, `I'm a ${level} on Brainrot Farm with ${user?.coins?.toLocaleString() || 0} points 🧠 Join me and farm braincells!`);
  };

  return (
    <div className="referral-section">
      <div className="referral-title">Invite Friends, Become Gigachad</div>
      <div className="referral-link" onClick={handleCopy}>
        {link}
      </div>
      {copied && <div className="referral-copied">Copied!</div>}
      <button className="referral-share-button" onClick={handleShare}>
        📤 Share with friends
      </button>
      <div className="referral-stats">
        Total: {info.totalReferrals} · Active: {info.activeReferrals}
      </div>
    </div>
  );
}
