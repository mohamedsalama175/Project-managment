import React, { useState, useRef, useEffect } from 'react';
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
  Plug,
  Search,
  Zap,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { useProjectStore } from '../../stores/useProjectStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { ThemeToggle } from '../common/ThemeToggle';
import { ClayButton } from '../common/ClayButton';
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
    zoomLevel,
    setZoomLevel,
    exportProjectJSON,
    exportProjectCSV,
    importProjectJSON,
    importProjectCSV,
    teamMembers,
    activePersonaId,
    activePersonaRole,
    setPersona,
  } = useProjectStore();

  const {
    user: authUser,
    currentOrganization,
    organizations,
    switchOrganization,
  } = useAuthStore();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
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
  const exportRef = useRef<HTMLDivElement>(null);
  const orgRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLDivElement>(null);
  const personaRef = useRef<HTMLDivElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const activeProject = (projects || []).find((p) => p.id === activeProjectId) || (projects && projects[0]);
  const activePersona = (teamMembers || []).find((m) => m.id === activePersonaId) || (teamMembers && teamMembers[0]);

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
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
      if (importRef.current && !importRef.current.contains(e.target as Node)) {
        setIsImportOpen(false);
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
      addToast(ok ? `"${file.name}" imported successfully!` : 'Import failed â€” invalid JSON format.', ok);
      setIsImportOpen(false);
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
      addToast(ok ? `"${projectName}" imported from CSV!` : 'Import failed â€” invalid or empty CSV.', ok);
      setIsImportOpen(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      <header className="sticky top-0 z-40 px-4 py-3 bg-[#eef2f5]/90 dark:bg-[#11161b]/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/80 transition-colors">
        <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Left Brand & Project Switcher */}
          <div className="flex items-center gap-3">
            {/* App Icon / Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl clay-button-primary flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-white dark:text-emerald-950" />
              </div>
              <div>
                <div className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400 bg-clip-text text-transparent">
                  CLAYGANTT
                </div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                  Enterprise Platform
                </div>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-300/60 dark:bg-slate-800" />

            {/* Project Switcher Dropdown */}
            <div id="nav-project-switcher" className="relative" ref={switcherRef}>
              <button
                type="button"
                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                className="clay-card-flat !px-3.5 !py-1.5 flex items-center gap-2.5 hover:brightness-105 transition-all text-left group"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {activeProject?.code}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 max-w-[170px] truncate">
                      {activeProject?.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {activeProject?.config.weekendDays.includes(5)
                      ? 'Fri/Sat Weekend'
                      : 'Sat/Sun Weekend'}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    isSwitcherOpen ? 'rotate-180 text-emerald-500' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isSwitcherOpen && (
                <div className="absolute left-0 mt-2 w-72 clay-card !p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Switch Active Project
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1 my-1">
                    {projects.map((proj) => {
                      const isSelected = proj.id === activeProjectId;
                      return (
                        <button
                          key={proj.id}
                          onClick={() => {
                            setActiveProject(proj.id);
                            setIsSwitcherOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between ${
                            isSelected
                              ? 'clay-card !p-2 bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500/30 font-bold text-emerald-700 dark:text-emerald-300'
                              : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex flex-col truncate pr-2">
                            <span className="truncate">{proj.name}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {proj.tasks.length} tasks · {proj.code}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-1">
                    <button
                      onClick={() => {
                        setIsSwitcherOpen(false);
                        setIsTemplatePickerOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Browse System Templates
                    </button>
                    <button
                      onClick={() => {
                        setIsSwitcherOpen(false);
                        setIsNewProjectOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create Blank Project
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav id="nav-views-tabs" className="flex items-center gap-1 p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-900/80 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.15),inset_-2px_-2px_4px_rgba(255,255,255,0.7)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.05)] border border-slate-300/40 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveView('planner')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                activeView === 'planner'
                  ? 'clay-card text-emerald-600 dark:text-emerald-400 font-bold scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              <span>Planner</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('team')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                activeView === 'team'
                  ? 'clay-card text-emerald-600 dark:text-emerald-400 font-bold scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Team Hub</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('financials')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                activeView === 'financials'
                  ? 'clay-card text-emerald-600 dark:text-emerald-400 font-bold scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Financials</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                activeView === 'dashboard'
                  ? 'clay-card text-emerald-600 dark:text-emerald-400 font-bold scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Projects</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('config')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                activeView === 'config'
                  ? 'clay-card text-emerald-600 dark:text-emerald-400 font-bold scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Config</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('integrations')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                activeView === 'integrations'
                  ? 'clay-card text-emerald-600 dark:text-emerald-400 font-bold scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Plug className="w-4 h-4" />
              <span>Integrations</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('automation')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                activeView === 'automation'
                  ? 'clay-card text-emerald-600 dark:text-emerald-400 font-bold scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Automation</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('compliance')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                activeView === 'compliance'
                  ? 'clay-card text-indigo-600 dark:text-indigo-400 font-bold scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              <span>Compliance</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('status')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                activeView === 'status'
                  ? 'clay-card text-emerald-600 dark:text-emerald-400 font-bold scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>Status</span>
            </button>
          </nav>

          {/* Right Global Tools */}
          <div className="flex items-center gap-2">
            {/* Timeline Zoom Slider (Only visible in planner view) */}
            {activeView === 'planner' && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-200/50 dark:bg-slate-900/40 border border-slate-300/40 dark:border-slate-800 text-xs">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Zoom
                </span>
                <input
                  type="range"
                  min={14}
                  max={48}
                  value={zoomLevel}
                  onChange={(e) => setZoomLevel(Number(e.target.value))}
                  className="w-20 accent-emerald-500 cursor-pointer h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none"
                  aria-label="Timeline Zoom"
                />
                <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 w-7 text-right">
                  {zoomLevel}px
                </span>
              </div>
            )}

            {/* Import Dropdown */}
            <div className="relative" ref={importRef}>
              <ClayButton
                size="sm"
                variant="default"
                icon={<Upload className="w-3.5 h-3.5" />}
                onClick={() => { setIsImportOpen(!isImportOpen); setIsExportOpen(false); }}
              >
                Import
              </ClayButton>

              {isImportOpen && (
                <div className="absolute right-0 mt-2 w-56 clay-card !p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Import Project
                  </div>
                  <button
                    onClick={() => jsonInputRef.current?.click()}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <FileJson className="w-4 h-4 text-amber-500" />
                    <div className="text-left">
                      <div>Import JSON</div>
                      <div className="text-[10px] text-slate-400 font-normal">Restore a full project backup</div>
                    </div>
                  </button>
                  <button
                    onClick={() => csvInputRef.current?.click()}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    <div className="text-left">
                      <div>Import CSV</div>
                      <div className="text-[10px] text-slate-400 font-normal">Import task list from spreadsheet</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setIsImportOpen(false);
                      setIsTaskImportModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors border-t border-slate-200/50 dark:border-slate-800/50 mt-1"
                  >
                    <Upload className="w-4 h-4 text-emerald-500" />
                    <div className="text-left">
                      <div>Bulk Task Import</div>
                      <div className="text-[10px] text-slate-400 font-normal">CSV/JSON with Dry-Run validation</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Export Dropdown */}
            <div className="relative" ref={exportRef}>
              <ClayButton
                size="sm"
                variant="default"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={() => { setIsExportOpen(!isExportOpen); setIsImportOpen(false); }}
              >
                Export
              </ClayButton>

              {isExportOpen && (
                <div className="absolute right-0 mt-2 w-56 clay-card !p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Export Project
                  </div>
                  <button
                    onClick={() => {
                      exportProjectJSON(activeProjectId);
                      setIsExportOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <FileJson className="w-4 h-4 text-amber-500" />
                    <div className="text-left">
                      <div>Export JSON</div>
                      <div className="text-[10px] text-slate-400 font-normal">Full project backup with config</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      exportProjectCSV(activeProjectId);
                      setIsExportOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    <div className="text-left">
                      <div>Export CSV / Excel</div>
                      <div className="text-[10px] text-slate-400 font-normal">Task list spreadsheet format</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Delivery Report Action */}
            <ClayButton
              size="sm"
              variant="default"
              icon={<FileText className="w-3.5 h-3.5 text-blue-500" />}
              onClick={() => setIsReportOpen(true)}
              className="hidden sm:inline-flex"
            >
              Report
            </ClayButton>

            {/* RIB / Risks Action */}
            <ClayButton
              id="nav-risks-btn"
              size="sm"
              variant="default"
              icon={<ShieldAlert className="w-3.5 h-3.5 text-rose-500" />}
              onClick={() => setIsRisksOpen(true)}
              className="hidden sm:inline-flex"
            >
              Risks
            </ClayButton>

            {/* Interactive Tour Action */}
            <ClayButton
              size="sm"
              variant="default"
              icon={<Compass className="w-3.5 h-3.5 text-emerald-500" />}
              onClick={() => startInteractiveTour()}
              className="hidden md:inline-flex"
              title="Start Interactive Guided Tour"
            >
              Tour
            </ClayButton>

            {/* Quick Command Bar Trigger */}
            <button
              type="button"
              onClick={() => setIsCommandBarOpen(true)}
              className="clay-card-flat !px-2.5 !py-1.5 hidden md:flex items-center gap-2 text-xs hover:brightness-105 transition-all text-slate-600 dark:text-slate-300"
              title="Command Bar (⌘K / Ctrl+K)"
              aria-label="Open Command Bar"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden xl:inline text-[11px] font-medium text-slate-500">Quick Actions</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-600">
                ⌘K
              </kbd>
            </button>

            {/* AI Copilot Trigger */}
            <ClayButton
              size="sm"
              variant="default"
              icon={<Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />}
              onClick={() => setIsAssistantOpen(true)}
              className="inline-flex border-indigo-200/50 dark:border-indigo-800/50"
              title="Open AI Project Copilot"
            >
              <span className="hidden sm:inline">AI Copilot</span>
            </ClayButton>

            {/* Auth & Tenant Container */}
            <div id="nav-org-profile" className="flex items-center gap-1.5">
              {/* Live Auth & Identity Console Pill */}
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="clay-card-flat !px-2.5 !py-1 flex items-center gap-2 text-xs hover:brightness-105 transition-all text-left"
                title={authUser ? `Logged in as ${authUser.name} (${authUser.email})` : 'Click to Sign In or Register'}
              >
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                {authUser ? authUser.name.charAt(0) : <Key className="w-3 h-3" />}
              </div>
              <div className="hidden sm:block">
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100 max-w-[110px] truncate leading-tight">
                  {authUser ? authUser.name.split(' ')[0] : 'Sign In'}
                </div>
                <div className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase leading-none">
                  {authUser ? authUser.primaryRole : 'Enterprise'}
                </div>
              </div>
              <Key className="w-3 h-3 text-slate-400 hover:text-emerald-500" />
            </button>

            {/* Tenant Organization Switcher Pill */}
            {authUser && (
              <div className="relative" ref={orgRef}>
                <button
                  type="button"
                  onClick={() => setIsOrgOpen(!isOrgOpen)}
                  className="clay-card-flat !px-2.5 !py-1 flex items-center gap-1.5 text-xs hover:brightness-105 transition-all text-left"
                  title="Switch Active Organization Tenant"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-bold text-slate-700 dark:text-slate-200 max-w-[110px] truncate text-[11px]">
                      {currentOrganization?.name || 'Workspace'}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isOrgOpen && (
                  <div className="absolute right-0 mt-2 w-64 clay-card !p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 shadow-xl">
                    <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Switch Organization Tenant
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1 my-1">
                      {organizations.map((org) => {
                        const isCur = org.id === currentOrganization?.id;
                        return (
                          <button
                            key={org.id}
                            onClick={async () => {
                              await switchOrganization(org.id);
                              setIsOrgOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                              isCur
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold'
                                : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <div className="truncate pr-1">
                              <div className="truncate font-semibold">{org.name}</div>
                              <div className="text-[10px] text-slate-400 capitalize">{org.plan} plan</div>
                            </div>
                            {isCur && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-1">
                      <button
                        onClick={() => {
                          setIsOrgOpen(false);
                          setOrgSettingsTab('general');
                          setIsOrgSettingsOpen(true);
                        }}
                        className="w-full flex items-center gap-2 py-1.5 px-3 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors text-left"
                      >
                        <Building className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Organization Settings</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsOrgOpen(false);
                          setOrgSettingsTab('members');
                          setIsOrgSettingsOpen(true);
                        }}
                        className="w-full flex items-center gap-2 py-1.5 px-3 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors text-left"
                      >
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        <span>Members & Governance</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsOrgOpen(false);
                          setOrgSettingsTab('invitations');
                          setIsOrgSettingsOpen(true);
                        }}
                        className="w-full flex items-center gap-2 py-1.5 px-3 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors text-left"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-amber-500" />
                        <span>Invite Team Members</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsOrgOpen(false);
                          setIsLoginModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 transition-colors border-t border-slate-200/40 dark:border-slate-800/60 mt-1"
                      >
                        + Create / Manage All Orgs
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>

            {/* Notification Inbox Bell */}
            <NotificationBell />

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hidden File Inputs */}
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
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-semibold shadow-xl animate-in slide-in-from-right-4 duration-300 ${
              t.ok
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {t.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
      />

      {/* Weekly Report Modal */}
      <WeeklyReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />

      {/* Risk Register Modal */}
      <RiskRegisterModal
        isOpen={isRisksOpen}
        onClose={() => setIsRisksOpen(false)}
      />

      {/* DeliverOps Auth & Login Console Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* Organization Settings & Member Governance Modal */}
      <OrgSettingsModal
        isOpen={isOrgSettingsOpen}
        onClose={() => setIsOrgSettingsOpen(false)}
        defaultTab={orgSettingsTab}
      />

      {/* Project Template Picker Modal */}
      <TemplatePickerModal
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
      />

      {/* Bulk Task Import Modal */}
      <TaskImportModal
        isOpen={isTaskImportModalOpen}
        onClose={() => setIsTaskImportModalOpen(false)}
      />

      {/* Notifications Inbox Drawer & Channel Preferences Modal */}
      <NotificationDrawer />
      <NotificationPreferencesModal />

      {/* AI Command Bar (⌘K / Ctrl+K) */}
      <CommandBarModal
        isOpen={isCommandBarOpen}
        onClose={() => setIsCommandBarOpen(false)}
        onOpenAssistant={() => setIsAssistantOpen(true)}
      />

      {/* AI Assistant Drawer */}
      <AiAssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        projectId={activeProject?.id}
        projectName={activeProject?.name}
      />
    </>
  );
};
