export default function Header({ user }) {
  return (
    <div className="header-bar">
      <div className="header-logo">
        <span className="header-logo-emoji">🧠</span>
      </div>
      <div className="header-text">
        <div className="header-title">Brainrot Farm</div>
        <div className="header-subtitle">Farm. Flex. Recruit NPCs.</div>
      </div>
      {user && <div className="header-coins">{user.coins.toLocaleString()} 🪙</div>}
    </div>
  );
}
