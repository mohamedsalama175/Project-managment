import React, { useState } from 'react';
import {
  Settings,
  Copy,
  Trash2,
  Plus,
  AlertTriangle,
  Calendar,
  CheckCircle,
  ArrowRight,
  ShieldAlert,
  AlertOctagon,
  User,
  Building,
  Sparkles,
} from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { EmptyState } from '../components/common/EmptyState';
import { NewProjectModal } from '../components/layout/NewProjectModal';
import { TemplatePickerModal } from '../components/templates/TemplatePickerModal';
import { Modal } from '../components/common/Modal';
import { getTodayUTC } from '../utils/dateUtils';
import { calculateCPM } from '../utils/cpmUtils';
import { Project, Task } from '../types';

export const DashboardView: React.FC = () => {
  const {
    projects,
    activeProjectId,
    setActiveProject,
    setActiveView,
    duplicateProject,
    deleteProject,
    teamMembers,
  } = useProjectStore();

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'client' | 'internal'>('all');

  const todayStr = getTodayUTC();

  const filteredProjects = projects.filter((p) => {
    if (typeFilter === 'all') return true;
    return p.projectType === typeFilter;
  });

  const handleOpenPlanner = (projectId: string) => {
    setActiveProject(projectId);
    setActiveView('planner');
  };

  const handleOpenConfig = (projectId: string) => {
    setActiveProject(projectId);
    setActiveView('config');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Enterprise Projects Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Overview of active client and internal delivery portfolios, resource assignments, and blocker health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ClayButton
            variant="default"
            icon={<Sparkles className="w-4 h-4 text-emerald-500" />}
            onClick={() => setIsTemplatePickerOpen(true)}
          >
            Browse Templates
          </ClayButton>
          <ClayButton
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsNewModalOpen(true)}
          >
            Create New Project
          </ClayButton>
        </div>
      </div>

      {/* Classification Filter Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 w-fit text-xs font-bold">
        {(['all', 'client', 'internal'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-xl capitalize transition-all ${
              typeFilter === t
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t === 'all' ? 'All Portfolios' : `${t} Projects`}
          </button>
        ))}
      </div>

      {filteredProjects.length === 0 ? (
        <EmptyState
          title={typeFilter === 'all' ? 'No Projects in Workspace' : `No ${typeFilter} projects found`}
          description={
            projects.length === 0
              ? "You haven't initialized any project schedules yet. Create a blank project or instantiate one of our pre-built system templates."
              : 'No projects match the selected portfolio filter. Switch filters or create a new project.'
          }
          primaryAction={{
            label: 'Create New Project',
            onClick: () => setIsNewModalOpen(true),
            icon: <Plus className="w-4 h-4" />,
          }}
          secondaryAction={{
            label: 'Browse System Templates',
            onClick: () => setIsTemplatePickerOpen(true),
            icon: <Sparkles className="w-4 h-4 text-emerald-500" />,
          }}
        />
      ) : (
        /* Grid of Projects */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((proj: Project) => {
          const isActive = proj.id === activeProjectId;
          const tasks = proj.tasks || [];
          const tasksCount = tasks.length;
          const completedCount = tasks.filter((t: Task) => t.pct === 100).length;
          const overdueCount = tasks.filter(
            (t: Task) => t.end && t.end < todayStr && (t.pct || 0) < 100
          ).length;
          const cpmMap = calculateCPM(tasks);
          let criticalCount = 0;
          cpmMap.forEach((info) => {
            if (info.isCritical || info.totalFloat <= 0) criticalCount++;
          });

          const progress = tasksCount
            ? Math.round(
                tasks.reduce((sum: number, t: Task) => sum + (t.pct || 0), 0) / tasksCount
              )
            : 0;

          const weekendType = proj.config?.weekendDays?.includes(5)
            ? 'Fri/Sat Rest'
            : 'Sat/Sun Rest';

          const pm = (teamMembers || []).find((m) => m.id === proj.projectManagerId);
          const activeBlockers = (proj.risks || []).filter(
            (r) => r.type === 'blocker' && r.status !== 'resolved'
          );

          return (
            <ClayCard
              key={proj.id}
              className={`flex flex-col justify-between space-y-4 hover:scale-[1.01] transition-transform ${
                isActive
                  ? 'border-2 border-emerald-500/80 shadow-[0_0_20px_rgba(46,196,156,0.15)]'
                  : ''
              }`}
            >
              {/* Top Meta */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {proj.code}
                    </span>
                    {proj.clientName && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 truncate max-w-[120px]" title={proj.clientName}>
                        {proj.clientName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{weekendType}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white line-clamp-1">
                    {proj.name}
                  </h3>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                    <User className="w-3 h-3" />
                    <span>PM: <strong className="text-slate-600 dark:text-slate-300">{pm ? pm.name : 'Unassigned'}</strong></span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 min-h-[32px]">
                    {proj.description || 'No description provided.'}
                  </p>
                </div>

                {/* Blocker Alert Banner (Clickable to filtered planner) */}
                {activeBlockers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveProject(proj.id);
                      setActiveView('planner');
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', `/planner?project=${proj.id}&filter=blocked`);
                        window.dispatchEvent(new Event('popstate'));
                      }
                    }}
                    className="w-full text-left p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5 hover:bg-red-500/20 transition-colors cursor-pointer"
                    title="View blocked tasks in Planner"
                  >
                    <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {activeBlockers.length} Blocker(s): {activeBlockers[0].title}
                    </span>
                  </button>
                )}
              </div>

              {/* Progress & Stats */}
              <div className="space-y-3 p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600 dark:text-slate-300">
                    Overall Progress
                  </span>
                  <div className="flex items-center gap-2">
                    {criticalCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveProject(proj.id);
                          setActiveView('planner');
                          if (typeof window !== 'undefined') {
                            window.history.pushState({}, '', `/planner?project=${proj.id}&filter=critical`);
                            window.dispatchEvent(new Event('popstate'));
                          }
                        }}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer"
                        title="View Critical Path tasks"
                      >
                        Critical Path ({criticalCount})
                      </button>
                    )}
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {progress}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shadow-inner">
                  <div
                    style={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                  />
                </div>

                {/* Micro indicators */}
                <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    {completedCount} / {tasksCount} Completed
                  </span>

                  {overdueCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveProject(proj.id);
                        setActiveView('planner');
                        if (typeof window !== 'undefined') {
                          window.history.pushState({}, '', `/planner?project=${proj.id}&filter=overdue`);
                          window.dispatchEvent(new Event('popstate'));
                        }
                      }}
                      className="flex items-center gap-1 font-bold text-red-500 hover:underline cursor-pointer"
                      title="Filter overdue tasks in Planner"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {overdueCount} Overdue
                    </button>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      On Schedule
                    </span>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenConfig(proj.id)}
                    title="Open Settings"
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => duplicateProject(proj.id)}
                    title="Clone Project"
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  {projects.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setProjectToDelete(proj.id)}
                      title="Delete Project"
                      className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <ClayButton
                  size="sm"
                  variant="primary"
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                  onClick={() => handleOpenPlanner(proj.id)}
                >
                  Open Planner
                </ClayButton>
              </div>
            </ClayCard>
          );
        })}

        {/* "+ Create New Project" Trigger Card */}
        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="clay-card-flat flex flex-col items-center justify-center p-8 space-y-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:scale-[1.01] transition-all cursor-pointer group min-h-[260px]"
        >
          <div className="w-12 h-12 rounded-2xl clay-card flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:scale-110 transition-all">
            <Plus className="w-6 h-6" />
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Create New Project
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Add a new isolated schedule with custom regional calendar
            </div>
          </div>
        </button>
      </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        title="Confirm Project Deletion"
        description="Are you sure you want to permanently delete this project? All associated tasks, baseline snapshots, and calendar settings will be removed."
      >
        <div className="flex justify-end gap-2 pt-4">
          <ClayButton variant="ghost" onClick={() => setProjectToDelete(null)}>
            Cancel
          </ClayButton>
          <ClayButton
            variant="danger"
            onClick={() => {
              if (projectToDelete) {
                deleteProject(projectToDelete);
                setProjectToDelete(null);
              }
            }}
          >
            Yes, Delete
          </ClayButton>
        </div>
      </Modal>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
      />

      {/* Template Picker Modal */}
      <TemplatePickerModal
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
      />
    </div>
  );
};
