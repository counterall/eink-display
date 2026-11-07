import { Moon, Sun } from 'lucide-react';
import IconButton from './IconButton';
import { THEME_TEXT, pick } from './i18n';

export default function DisplayModeToggle({ theme, language, onToggle }) {
  const dark = theme === 'dark';
  const t = pick(THEME_TEXT, language);
  return <div className="theme-toggle">
    <IconButton icon={dark ? Sun : Moon} label={t.label} title={dark ? t.light : t.dark} pressed={dark} onClick={onToggle} />
  </div>;
}
