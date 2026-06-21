export default function Balance({ user }) {
  if (!user) return null;
  return (
    <div className="balance-card">
      <div className="balance-label">Brainrot Points</div>
      <div className="balance-value">{user.coins.toLocaleString()}</div>
      <div className="balance-level">Rank: {user.level}</div>
    </div>
  );
}
