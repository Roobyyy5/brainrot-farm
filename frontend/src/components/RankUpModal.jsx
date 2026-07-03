import { useEffect } from 'react';
import { useT } from '../context/LangContext';

export default function RankUpModal({ rank, onClose }) {
  const t = useT();

  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!rank) return null;

  return (
    <div className="rankup-overlay" onClick={onClose}>
      <div className="rankup-modal">
        <div className="rankup-emoji">{rank.emoji}</div>
        <div className="rankup-label">{t('rank_up')}</div>
        <div className="rankup-name" style={{ color: rank.color }}>{(() => { const k = 'trank_' + (rank.name || '').toLowerCase(); const v = t(k); return v === k ? rank.name : v; })()}</div>
        <div className="rankup-sub">{t('rank_up_sub')}</div>
      </div>
    </div>
  );
}
