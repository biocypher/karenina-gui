import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg transition-all duration-200 hover:scale-110 
                 bg-white/80 dark:bg-slate-800/80 
                 text-slate-700 dark:text-slate-300 
                 hover:bg-white dark:hover:bg-slate-700
                 border border-slate-200 dark:border-slate-600
                 shadow-sm hover:shadow-md
                 backdrop-blur-sm"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
    </button>
  );
};
