import React, { useEffect } from 'react';
import { useProjectStore, hydrateIndexedDB } from './stores/useProjectStore';
import { Navbar } from './components/layout/Navbar';
import { PlannerView } from './views/PlannerView';
import { ConfigView } from './views/ConfigView';
import { DashboardView } from './views/DashboardView';

export const App: React.FC = () => {
  const { activeView, theme, projects } = useProjectStore();

  // Hydrate IndexedDB from localStorage projects on first load
  useEffect(() => {
    hydrateIndexedDB(projects);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize and synchronize dark mode class on html root
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Listener for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (useProjectStore.getState().theme === 'system') {
        if (e.matches) root.classList.add('dark');
        else root.classList.remove('dark');
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme]);

  return (
    <div className="min-h-screen bg-[#eef2f5] dark:bg-[#11161b] text-slate-800 dark:text-slate-100 flex flex-col transition-colors selection:bg-emerald-500/20 selection:text-emerald-800 dark:selection:text-emerald-300">
      {/* Top Persistent Claymorphic Navbar */}
      <Navbar />

      {/* Main Application Content Body */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeView === 'planner' && <PlannerView />}
        {activeView === 'config' && <ConfigView />}
        {activeView === 'dashboard' && <DashboardView />}
      </main>
    </div>
  );
};

export default App;
