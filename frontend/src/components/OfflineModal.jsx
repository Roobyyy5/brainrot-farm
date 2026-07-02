import { useT } from '../context/LangContext';

export default function OfflineModal({ bp, onClose }) {
  const t = useT();
  return (
    <div className="offline-overlay">
      <div className="offline-modal">
        <div className="offline-icon">🤖</div>
        <h3 className="offline-title">{t('offline_title')}</h3>
        <p className="offline-desc">{t('offline_desc')}</p>
        <div className="offline-reward">+{bp.toLocaleString()} BP</div>
        <p className="offline-credited">{t('offline_added')}</p>
        <button className="offline-btn" onClick={onClose}>{t('offline_btn')}</button>
      </div>
    </div>
  );
}
