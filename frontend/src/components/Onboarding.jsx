import { useEffect, useState } from 'react';

const STORAGE_KEY = 'brainrot_onboarding_seen';

const STEPS = [
  { emoji: '🧠', text: 'Tap Farm Braincells every 5 minutes to earn Brainrot Points.' },
  { emoji: '🎁', text: 'Claim your Daily Reward — streaks earn bigger bonuses.' },
  { emoji: '🔗', text: 'Invite friends with your link — get +100 instantly, +200 when they farm.' },
  { emoji: '💪', text: 'Climb the ranks: NPC → Sigma → Gigachad. Top the leaderboard!' },
];

export default function Onboarding() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;
  const current = STEPS[step];

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-emoji">{current.emoji}</div>
        <div className="onboarding-text">{current.text}</div>
        <div className="onboarding-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={i === step ? 'onboarding-dot active' : 'onboarding-dot'} />
          ))}
        </div>
        <div className="onboarding-actions">
          <button className="onboarding-skip" onClick={dismiss}>
            Skip
          </button>
          <button className="onboarding-next" onClick={next}>
            {step < STEPS.length - 1 ? 'Next' : "Let's go"}
          </button>
        </div>
      </div>
    </div>
  );
}
