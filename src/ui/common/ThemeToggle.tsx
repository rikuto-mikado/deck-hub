import { useTheme } from '@/app/theme';
import { IconButton } from './Button';
import { IconMoon, IconSun } from './icons';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <IconButton label={`Switch to ${next} mode`} onClick={() => setTheme(next)} className={className}>
      {theme === 'dark' ? <IconSun /> : <IconMoon />}
    </IconButton>
  );
}
