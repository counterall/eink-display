import { Moon, Sun } from 'lucide-react';
import IconButton from './IconButton';

const TEXT = {
  zh: { label: '深色模式', dark: '切换为深色模式', light: '切换为浅色模式' },
  en: { label: 'Dark mode', dark: 'Switch to dark mode', light: 'Switch to light mode' },
};

export default function DisplayModeToggle({ theme, language, onToggle }) {
  const dark = theme === 'dark';
  const t = TEXT[language === 'zh' ? 'zh' : 'en'];
  return <div className="theme-toggle">
    <IconButton icon={dark ? Sun : Moon} label={t.label} title={dark ? t.light : t.dark} pressed={dark} onClick={onToggle} />
  </div>;
}
