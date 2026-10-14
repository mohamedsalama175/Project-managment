import React, { useState, useEffect } from 'react';
import { useProjectStore, hydrateIndexedDB } from './stores/useProjectStore';
import { useAuthStore } from './stores/useAuthStore';
import { apiClient, ApiOnboardingProgress } from './api/client';
import { Navbar } from './components/layout/Navbar';
import { PlannerView } from './views/PlannerView';
import { ConfigView } from './views/ConfigView';
import { DashboardView } from './views/DashboardView';
import { PeopleView } from './views/PeopleView';
import { FinancialsView } from './views/FinancialsView';
import { InstallView } from './views/InstallView';
import { SignInView } from './views/auth/SignInView';
import { UsersListView } from './views/users/UsersListView';
import { RolesListView } from './views/roles/RolesListView';
import { CreateRoleView } from './views/roles/CreateRoleView';
import { OfflineQueueBanner } from './components/pwa/OfflineQueueBanner';
import { PwaInstallBanner } from './components/pwa/PwaInstallBanner';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { RiskRegisterModal } from './components/risks/RiskRegisterModal';
import { WeeklyReportModal } from './components/reports/WeeklyReportModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SampleDataBanner } from './components/common/SampleDataBanner';
import { OnboardingWizardModal } from './components/onboarding/OnboardingWizardModal';

if (typeof window !== 'undefined') {
  (window as any).useAuthStore = useAuthStore;
  (window as any).useProjectStore = useProjectStore;
}

export const App: React.FC = () => {
  const { activeView, theme, projects } = useProjectStore();
  const { checkAuth, isAuthenticated } = useAuthStore();
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [isMobileRisksOpen, setIsMobileRisksOpen] = useState(false);
  const [isMobileReportOpen, setIsMobileReportOpen] = useState(false);
  const [onboardingProgress, setOnboardingProgress] = useState<ApiOnboardingProgress | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Check first-run system installation & hydrate session
  useEffect(() => {
    hydrateIndexedDB(projects);
    checkAuth();

    apiClient
      .getSystemStatus()
      .then((status) => {
        setIsInstalled(status.installed);
        if (!status.installed && typeof window !== 'undefined') {
          window.history.replaceState(null, '', '/install');
        }
      })
      .catch(() => {
        setIsInstalled(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check onboarding progress and sync backend users into DeliverOps store when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      apiClient
        .getOnboardingProgress()
        .then((res) => {
          if (res.data) {
            setOnboardingProgress(res.data);
            if (!res.data.is_completed) {
              setIsOnboardingOpen(true);
            }
          }
        })
        .catch(() => {
          // Ignore if guest or endpoint error
        });

      apiClient
        .getUsers()
        .then((res) => {
          if (res.data && res.data.length > 0) {
            useProjectStore.getState().syncTeamMembersFromBackend(res.data);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

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

  const isInstallRoute =
    isInstalled === false ||
    (typeof window !== 'undefined' &&
      (window.location.pathname === '/install' || window.location.hash === '#/install'));

  if (isInstallRoute) {
    return (
      <ErrorBoundary>
        <InstallView
          onInstalled={() => {
            setIsInstalled(true);
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', '/');
            }
            checkAuth();
          }}
        />
      </ErrorBoundary>
    );
  }

  // Authentication Gateway: Only authenticated users can access the system
  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <SignInView />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#eef2f5] dark:bg-[#11161b] text-slate-800 dark:text-slate-100 flex flex-col transition-colors selection:bg-emerald-500/20 selection:text-emerald-800 dark:selection:text-emerald-300">
        {/* Offline Queue State Indicator */}
        <OfflineQueueBanner />

        {/* Top Persistent Claymorphic Navbar */}
        <Navbar />

        {/* Sample Data Mode Alert Banner */}
        <SampleDataBanner />

        {/* Main Application Content Body */}
        <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
          {activeView === 'planner' && <PlannerView />}
          {activeView === 'team' && <PeopleView />}
          {activeView === 'financials' && <FinancialsView />}
          {activeView === 'config' && <ConfigView />}
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'users' && <PeopleView initialTab="users" />}
          {activeView === 'roles' && <RolesListView />}
          {activeView === 'create-role' && <CreateRoleView />}
        </main>

        {/* PWA Home Screen Install Banner */}
        <PwaInstallBanner />

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

        {/* Onboarding Wizard Modal */}
        <OnboardingWizardModal
          isOpen={isOnboardingOpen}
          initialProgress={onboardingProgress}
          onClose={() => setIsOnboardingOpen(false)}
        />
      </div>
    </ErrorBoundary>
  );
};

export default App;
