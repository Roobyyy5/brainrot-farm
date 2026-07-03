import { useT } from '../context/LangContext';
import LanguageSwitcher from './LanguageSwitcher';

export default function Header() {
  const t = useT();
  return (
    <div className="header-bar">
      <div className="header-logo">
        <span className="header-logo-emoji">🧠</span>
      </div>
      <div className="header-text">
        <div className="header-title">Brainrot Farm</div>
        <div className="header-subtitle">{t('header_sub')}</div>
      </div>
      <LanguageSwitcher />
    </div>
  );
}
