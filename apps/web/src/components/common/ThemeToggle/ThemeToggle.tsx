import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { cn } from '../../../utils/cn';

interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isSidebarOpen?: boolean;
}

export default function ThemeToggle({ isSidebarOpen = true, className, ...props }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle Theme"
      className={cn(
        "w-full flex items-center justify-center gap-3 px-3 py-2 mt-auto rounded-md bg-muted hover:bg-accent text-foreground transition-colors text-sm font-medium cursor-pointer",
        className
      )}
      {...props}
    >
      {isDark ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
      {isSidebarOpen && <span className="truncate whitespace-nowrap">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
    </button>
  );
}
