import React, { useState, useEffect } from 'react';
import { useProjectStore, hydrateIndexedDB } from './stores/useProjectStore';
import { Navbar } from './components/layout/Navbar';
import { PlannerView } from './views/PlannerView';
import { ConfigView } from './views/ConfigView';
import { DashboardView } from './views/DashboardView';
import { PeopleView } from './views/PeopleView';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { RiskRegisterModal } from './components/risks/RiskRegisterModal';
import { WeeklyReportModal } from './components/reports/WeeklyReportModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export const App: React.FC = () => {
  const { activeView, theme, projects } = useProjectStore();
  const [isMobileRisksOpen, setIsMobileRisksOpen] = useState(false);
  const [isMobileReportOpen, setIsMobileReportOpen] = useState(false);

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
    <ErrorBoundary>
      <div className="min-h-screen bg-[#eef2f5] dark:bg-[#11161b] text-slate-800 dark:text-slate-100 flex flex-col transition-colors selection:bg-emerald-500/20 selection:text-emerald-800 dark:selection:text-emerald-300">
        {/* Top Persistent Claymorphic Navbar */}
        <Navbar />

        {/* Main Application Content Body */}
        <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
          {activeView === 'planner' && <PlannerView />}
          {activeView === 'team' && <PeopleView />}
          {activeView === 'config' && <ConfigView />}
          {activeView === 'dashboard' && <DashboardView />}
        </main>

        {/* Mobile Floating Bottom Dock (< 768px) */}
        <MobileBottomNav
          onOpenRisks={() => setIsMobileRisksOpen(true)}
          onOpenReport={() => setIsMobileReportOpen(true)}
        />

        {/* Mobile Triggered Modals */}
        <RiskRegisterModal
          isOpen={isMobileRisksOpen}
          onClose={() => setIsMobileRisksOpen(false)}
        />
        <WeeklyReportModal
          isOpen={isMobileReportOpen}
          onClose={() => setIsMobileReportOpen(false)}
        />
      </div>
    </ErrorBoundary>
  );
};

export default App;
