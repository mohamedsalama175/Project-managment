import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useProjectStore } from '../../stores/useProjectStore';
import { ThemeMode } from '../../types';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useProjectStore();

  const options: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
    { mode: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
    { mode: 'system', label: 'Auto', icon: <Laptop className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="inline-flex p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-900/80 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.15),inset_-2px_-2px_4px_rgba(255,255,255,0.7)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.05)] border border-slate-300/40 dark:border-slate-800">
      {options.map((opt) => {
        const isActive = theme === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            onClick={() => setTheme(opt.mode)}
            title={`Switch to ${opt.label} Mode`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all duration-150 ${
              isActive
                ? 'clay-card text-emerald-600 dark:text-emerald-400 font-bold scale-[1.02]'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {opt.icon}
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
