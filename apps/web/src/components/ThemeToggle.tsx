import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface ThemeToggleProps {
  isSidebarOpen?: boolean;
}

export default function ThemeToggle({ isSidebarOpen = true }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title="Toggle Theme"
      className="w-full flex items-center justify-center gap-3 px-3 py-2 mt-auto rounded-md bg-muted hover:bg-accent text-foreground transition-colors text-sm font-medium"
    >
      {isDark ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
      {isSidebarOpen && <span className="truncate">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
    </button>
  );
}
