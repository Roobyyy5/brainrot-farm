import { useEffect, useState } from 'react';
import { useT } from '../context/LangContext';

const STORAGE_KEY = 'brainrot_onboarding_seen';

const STEP_KEYS = [
  { emoji: '🧠', key: 'onboarding_step1' },
  { emoji: '🎁', key: 'onboarding_step2' },
  { emoji: '🔗', key: 'onboarding_step3' },
  { emoji: '💪', key: 'onboarding_step4' },
];

export default function Onboarding() {
  const t = useT();
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
    if (step < STEP_KEYS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;
  const current = STEP_KEYS[step];

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-emoji">{current.emoji}</div>
        <div className="onboarding-text">{t(current.key)}</div>
        <div className="onboarding-dots">
          {STEP_KEYS.map((_, i) => (
            <span key={i} className={i === step ? 'onboarding-dot active' : 'onboarding-dot'} />
          ))}
        </div>
        <div className="onboarding-actions">
          <button className="onboarding-skip" onClick={dismiss}>
            {t('onboarding_skip')}
          </button>
          <button className="onboarding-next" onClick={next}>
            {step < STEP_KEYS.length - 1 ? t('onboarding_next') : t('onboarding_start')}
          </button>
        </div>
      </div>
    </div>
  );
}
