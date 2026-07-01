export default function OfflineModal({ bp, onClose }) {
  return (
    <div className="offline-overlay">
      <div className="offline-modal">
        <div className="offline-icon">🤖</div>
        <h3 className="offline-title">Welcome Back!</h3>
        <p className="offline-desc">Auto Brain worked while you were offline</p>
        <div className="offline-reward">+{bp.toLocaleString()} BP</div>
        <p className="offline-credited">Already added to your balance!</p>
        <button className="offline-btn" onClick={onClose}>Awesome!</button>
      </div>
    </div>
  );
}
