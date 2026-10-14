import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FolderKanban,
  Settings,
  LayoutGrid,
  ChevronDown,
  Plus,
  DollarSign,
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  Calendar,
  Sparkles,
  CheckCircle,
  XCircle,
  Users,
  ShieldAlert,
  FileText,
  UserCheck,
  Key,
  LogIn,
  Building,
  UserPlus,
  Compass,
  Search,
  ShieldCheck,
  ListTodo,
  ArrowDownUp,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { useProjectStore } from '../../stores/useProjectStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAuth } from '../../hooks/useAuth';
import { ThemeMode } from '../../types';
import { NewProjectModal } from './NewProjectModal';
import { TemplatePickerModal } from '../templates/TemplatePickerModal';
import { TaskImportModal } from '../tasks/TaskImportModal';
import { startInteractiveTour } from '../../utils/driverTour';
import { WeeklyReportModal } from '../reports/WeeklyReportModal';
import { RiskRegisterModal } from '../risks/RiskRegisterModal';
import { LoginModal } from '../auth/LoginModal';
import { OrgSettingsModal } from '../organization/OrgSettingsModal';
import { NotificationBell } from '../notifications/NotificationBell';
import { NotificationDrawer } from '../notifications/NotificationDrawer';
import { NotificationPreferencesModal } from '../notifications/NotificationPreferencesModal';
import { CommandBarModal } from '../ai/CommandBarModal';
import { AiAssistantDrawer } from '../ai/AiAssistantDrawer';

type Toast = { id: number; msg: string; ok: boolean };

export const Navbar: React.FC = () => {
  const {
    projects,
    activeProjectId,
    setActiveProject,
    activeView,
    setActiveView,
    exportProjectJSON,
    exportProjectCSV,
    importProjectJSON,
    importProjectCSV,
    theme,
    setTheme,
  } = useProjectStore();

  const {
    user: authUser,
    currentOrganization,
    organizations,
    switchOrganization,
  } = useAuthStore();
  const { can, hasRole } = useAuth();
  const isFieldEngineer = hasRole('field_engineer') || (can('tasks.list') && !can('projects.view'));

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [isTaskImportModalOpen, setIsTaskImportModalOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isRisksOpen, setIsRisksOpen] = useState(false);
  const [isOrgOpen, setIsOrgOpen] = useState(false);
  const [isOrgSettingsOpen, setIsOrgSettingsOpen] = useState(false);
  const [orgSettingsTab, setOrgSettingsTab] = useState<'general' | 'members' | 'invitations'>('general');
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandBarOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const switcherRef = useRef<HTMLDivElement>(null);
  const importExportRef = useRef<HTMLDivElement>(null);
  const orgRef = useRef<HTMLDivElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const activeProject = (projects || []).find((p) => p.id === activeProjectId) || (projects && projects[0]);

  // Reactive Project Progress for inline progress pill
  const overallProgress = useMemo(() => {
    const tasks = activeProject?.tasks || [];
    if (!tasks.length) return 0;
    const sum = tasks.reduce((acc, t) => acc + (t.pct || 0), 0);
    return Math.round(sum / tasks.length);
  }, [activeProject?.tasks]);

  const addToast = (msg: string, ok: boolean) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, ok }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setIsSwitcherOpen(false);
      }
      if (importExportRef.current && !importExportRef.current.contains(e.target as Node)) {
        setIsImportExportOpen(false);
      }
      if (orgRef.current && !orgRef.current.contains(e.target as Node)) {
        setIsOrgOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleJSONFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const ok = importProjectJSON(text);
      addToast(ok ? `"${file.name}" imported successfully!` : 'Import failed — invalid JSON format.', ok);
      setIsImportExportOpen(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const projectName = file.name.replace(/\.csv$/i, '');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const ok = importProjectCSV(text, projectName);
      addToast(ok ? `"${projectName}" imported from CSV!` : 'Import failed — invalid or empty CSV.', ok);
      setIsImportExportOpen(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const navTabs = isFieldEngineer
    ? [
        {
          id: 'planner',
          label: 'My Tasks',
          icon: ListTodo,
          onClick: () => {
            setActiveView('planner');
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.set('filter', 'my-tasks');
              window.history.pushState({}, '', url.toString());
              window.dispatchEvent(new Event('popstate'));
            }
          },
          isActive: activeView === 'planner',
        },
      ]
    : [
        {
          id: 'planner',
          label: 'Planner',
          icon: FolderKanban,
          onClick: () => setActiveView('planner'),
          isActive: activeView === 'planner',
        },
        {
          id: 'team',
          label: "Team's Hub",
          icon: Users,
          onClick: () => setActiveView('team'),
          isActive: activeView === 'team' || activeView === 'users',
        },
        {
          id: 'roles',
          label: 'Roles',
          icon: ShieldCheck,
          onClick: () => setActiveView('roles'),
          isActive: activeView === 'roles' || activeView === 'create-role',
        },
        {
          id: 'financials',
          label: 'Financials',
          icon: DollarSign,
          onClick: () => setActiveView('financials'),
          isActive: activeView === 'financials',
        },
        {
          id: 'dashboard',
          label: 'Projects',
          icon: LayoutGrid,
          onClick: () => setActiveView('dashboard'),
          isActive: activeView === 'dashboard',
        },
        {
          id: 'config',
          label: 'Config',
          icon: Settings,
          onClick: () => setActiveView('config'),
          isActive: activeView === 'config',
        },
      ];

  return (
    <>
      {/* 1. Primary App Navbar (h-12, gap-2 px-3 overflow-x-auto no-scrollbar) */}
      <header className="sticky top-0 z-40 h-12 gap-2 px-3 overflow-x-auto no-scrollbar bg-white dark:bg-[#11161b] border-b border-slate-200 dark:border-slate-800 transition-colors flex items-center justify-between select-none">
        
        {/* Left Section: Brand mark + Project Switcher + Inline Progress Pill */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Brand Mark */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-5 h-5 rounded-md bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <Sparkles className="w-3 h-3" />
              </span>
              CLAYGANTT
            </span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
              WBS Matrix
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

          {/* Project Switcher Dropdown */}
          <div id="nav-project-switcher" className="relative shrink-0" ref={switcherRef}>
            <button
              type="button"
              onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 transition-colors whitespace-nowrap"
            >
              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {activeProject?.code || 'PRJ'}
              </span>
              <span className="text-slate-300 dark:text-slate-600">:</span>
              <span className="max-w-[130px] truncate text-slate-800 dark:text-slate-100">
                {activeProject?.name || 'Project'}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                  isSwitcherOpen ? 'rotate-180 text-emerald-600' : ''
                }`}
              />
            </button>

            {/* Project Switcher Dropdown Menu */}
            {isSwitcherOpen && (
              <div className="absolute left-0 mt-1.5 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 z-50 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Active Project
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5 my-1">
                  {projects.map((proj) => {
                    const isSelected = proj.id === activeProjectId;
                    return (
                      <button
                        key={proj.id}
                        type="button"
                        onClick={() => {
                          setActiveProject(proj.id);
                          setIsSwitcherOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 font-bold text-emerald-700 dark:text-emerald-300'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="truncate">{proj.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {proj.code} · {proj.tasks.length} tasks
                          </div>
                        </div>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {!isFieldEngineer && (
                  <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSwitcherOpen(false);
                        setIsTemplatePickerOpen(true);
                      }}
                      className="w-full flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Browse Templates
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSwitcherOpen(false);
                        setIsNewProjectOpen(true);
                      }}
                      className="w-full flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create Blank Project
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Compact Inline Progress Pill: "31% Complete" with 48px micro progress bar */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs shrink-0">
            <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                style={{ width: `${overallProgress}%` }}
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              />
            </div>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-[11px] tabular-nums whitespace-nowrap">
              {overallProgress}% Complete
            </span>
          </div>
        </div>

        {/* Center Section: Navigation Segmented Tabs with Sliding Active Pill */}
        <nav
          id="nav-views-tabs"
          className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shrink-0"
        >
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={tab.onClick}
                className={`relative flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all duration-150 whitespace-nowrap ${
                  tab.isActive
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 font-medium'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${tab.isActive ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Section: System Status Dot, Theme Segmented Toggle, Import/Export Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Deliverables System: Active indicator */}
          <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] whitespace-nowrap shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Deliverables System: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</strong>
            </span>
          </div>

          {/* Theme Segmented Toggle (Light | Dark | Auto) */}
          <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                theme === 'light'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title="Light Mode"
            >
              <Sun className="w-3 h-3" />
              <span className="hidden sm:inline">Light</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title="Dark Mode"
            >
              <Moon className="w-3 h-3" />
              <span className="hidden sm:inline">Dark</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                theme === 'system'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title="System Mode"
            >
              <Laptop className="w-3 h-3" />
              <span className="hidden sm:inline">Auto</span>
            </button>
          </div>

          {/* Import / Export Menu Dropdown */}
          {!isFieldEngineer && (
            <div className="relative shrink-0" ref={importExportRef}>
              <button
                type="button"
                onClick={() => setIsImportExportOpen(!isImportExportOpen)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap"
                title="Import / Export Data"
              >
                <ArrowDownUp className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden md:inline">Import / Export</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isImportExportOpen ? 'rotate-180' : ''}`} />
              </button>

              {isImportExportOpen && (
                <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 z-50 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Import Options
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      jsonInputRef.current?.click();
                      setIsImportExportOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <FileJson className="w-4 h-4 text-amber-500" />
                    <span>Import JSON Backup</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      csvInputRef.current?.click();
                      setIsImportExportOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    <span>Import CSV Spreadsheet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsImportExportOpen(false);
                      setIsTaskImportModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-blue-500" />
                    <span>Bulk Task Import (Dry-Run)</span>
                  </button>

                  <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Export Options
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      exportProjectJSON(activeProjectId);
                      setIsImportExportOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <FileJson className="w-4 h-4 text-amber-500" />
                    <span>Export JSON Backup</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportProjectCSV(activeProjectId);
                      setIsImportExportOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    <span>Export CSV / Excel</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Delivery Report Action */}
          <button
            id="nav-report-btn"
            type="button"
            onClick={() => setIsReportOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap shrink-0"
            title="Weekly Delivery Report"
          >
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span className="inline whitespace-nowrap">Report</span>
          </button>

          {/* Risk Register (RIB) Action */}
          <button
            id="nav-risks-btn"
            type="button"
            onClick={() => setIsRisksOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap shrink-0"
            title="Risk Register & Issues (RIB)"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span className="inline whitespace-nowrap">Risks</span>
          </button>

          {/* AI Copilot & Quick Actions Trigger */}
          <button
            type="button"
            onClick={() => setIsAssistantOpen(true)}
            className="p-1.5 rounded-md text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors shrink-0"
            title="Open AI Project Copilot"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Quick Command Bar Trigger (⌘K) */}
          <button
            type="button"
            onClick={() => setIsCommandBarOpen(true)}
            className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors shrink-0"
            title="Command Bar (⌘K / Ctrl+K)"
          >
            <Search className="w-3 h-3 text-slate-400" />
            <kbd className="text-[10px] font-mono px-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500">
              ⌘K
            </kbd>
          </button>

          {/* Notification Inbox Bell */}
          <div className="shrink-0">
            <NotificationBell />
          </div>

          {/* Auth & Tenant Profile Button */}
          <div className="relative shrink-0" ref={orgRef}>
            <button
              type="button"
              onClick={() => {
                if (authUser) {
                  setIsOrgOpen(!isOrgOpen);
                } else {
                  setIsLoginModalOpen(true);
                }
              }}
              className="flex items-center gap-1.5 p-1 rounded-md text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={authUser ? `${authUser.name} (${currentOrganization?.name || 'Workspace'})` : 'Sign In'}
            >
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-[10px]">
                {authUser ? authUser.name.charAt(0).toUpperCase() : <Key className="w-3 h-3" />}
              </div>
            </button>

            {isOrgOpen && authUser && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 z-50 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Organization
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5 my-1">
                  {organizations.map((org) => {
                    const isCur = org.id === currentOrganization?.id;
                    return (
                      <button
                        key={org.id}
                        type="button"
                        onClick={async () => {
                          await switchOrganization(org.id);
                          setIsOrgOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          isCur
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="truncate">
                          <div className="truncate font-medium">{org.name}</div>
                          <div className="text-[10px] text-slate-400 capitalize">{org.plan} plan</div>
                        </div>
                        {isCur && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {!isFieldEngineer && (
                  <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOrgOpen(false);
                        setOrgSettingsTab('general');
                        setIsOrgSettingsOpen(true);
                      }}
                      className="w-full flex items-center gap-2 py-1 px-2.5 rounded-lg text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <Building className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Organization Settings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOrgOpen(false);
                        setIsLoginModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 py-1 px-2.5 rounded-lg text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                      <span>Manage Account</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hidden File Inputs for Import */}
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleJSONFileChange}
      />
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleCSVFileChange}
      />

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl animate-in slide-in-from-right-4 duration-300 ${
              t.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {t.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      {/* Modals */}
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
      />
      <WeeklyReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
      <RiskRegisterModal
        isOpen={isRisksOpen}
        onClose={() => setIsRisksOpen(false)}
      />
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
      <OrgSettingsModal
        isOpen={isOrgSettingsOpen}
        onClose={() => setIsOrgSettingsOpen(false)}
        defaultTab={orgSettingsTab}
      />
      <TemplatePickerModal
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
      />
      <TaskImportModal
        isOpen={isTaskImportModalOpen}
        onClose={() => setIsTaskImportModalOpen(false)}
      />
      <NotificationDrawer />
      <NotificationPreferencesModal />
      <CommandBarModal
        isOpen={isCommandBarOpen}
        onClose={() => setIsCommandBarOpen(false)}
        onOpenAssistant={() => setIsAssistantOpen(true)}
      />
      <AiAssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        projectId={activeProject?.id}
        projectName={activeProject?.name}
      />
    </>
  );
};
