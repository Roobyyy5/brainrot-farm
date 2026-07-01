import { useEffect } from 'react';

export default function RankUpModal({ rank, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  if (!rank) return null;

  return (
    <div className="rankup-overlay" onClick={onClose}>
      <div className="rankup-modal">
        <div className="rankup-emoji">{rank.emoji}</div>
        <div className="rankup-label">RANK UP!</div>
        <div className="rankup-name" style={{ color: rank.color }}>{rank.name}</div>
        <div className="rankup-sub">You've reached a new rank!</div>
      </div>
    </div>
  );
}
