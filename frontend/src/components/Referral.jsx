import { useEffect, useState } from 'react';
import { api } from '../api';
import { haptic, shareLink } from '../telegram';
import { useT } from '../context/LangContext';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || 'YourBotUsername';
const MINI_APP_SHORT_NAME = import.meta.env.VITE_MINI_APP_SHORT_NAME || '';

export default function Referral({ user }) {
  const t = useT();
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
    shareLink(link, t('ref_share_text', { level, coins: (user?.coins || 0).toLocaleString() }));
  };

  return (
    <div className="referral-section">
      <div className="referral-title">{t('ref_title')}</div>
      <div className="referral-link" onClick={handleCopy}>
        {link}
      </div>
      {copied && <div className="referral-copied">{t('ref_copied')}</div>}
      <button className="referral-share-button" onClick={handleShare}>
        {t('ref_share')}
      </button>
      <div className="referral-stats">
        {t('ref_stats', { t: info.totalReferrals, a: info.activeReferrals })}
      </div>
    </div>
  );
}
