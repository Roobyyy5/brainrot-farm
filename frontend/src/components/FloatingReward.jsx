export default function FloatingReward({ reward }) {
  if (!reward) return null;
  return <div className="floating-reward">+{reward}</div>;
}
