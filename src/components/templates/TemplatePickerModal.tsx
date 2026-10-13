import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Search,
  Sparkles,
  Check,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  X,
  Layers,
  ShieldAlert,
  ArrowRight,
  Filter,
  Building,
  Briefcase,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { ClayButton } from '../common/ClayButton';
import { ClayInput } from '../common/ClayInput';
import { EmptyState } from '../common/EmptyState';
import { apiClient, ApiProjectTemplate } from '../../api/client';
import { useProjectStore } from '../../stores/useProjectStore';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateInstantiated?: (project: any) => void;
}

export const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
  isOpen,
  onClose,
  onTemplateInstantiated,
}) => {
  const { setActiveProject, setActiveView, projects } = useProjectStore();

  const [templates, setTemplates] = useState<ApiProjectTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ApiProjectTemplate | null>(null);

  // Instantiation form state
  const [projectName, setProjectName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [isInstantiating, setIsInstantiating] = useState(false);
  const [instantiateError, setInstantiateError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setSelectedTemplate(null);
      setInstantiateError(null);
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.getTemplates();
      setTemplates(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTemplate = (template: ApiProjectTemplate) => {
    setSelectedTemplate(template);
    setProjectName(template.name);
    const suggestedCode = (template.slug || template.name)
      .replace(/[^a-zA-Z]/g, '')
      .substring(0, 4)
      .toUpperCase();
    setProjectCode(suggestedCode || 'PROJ');
    setInstantiateError(null);
  };

  const handleInstantiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    if (!projectName.trim()) {
      setInstantiateError('Project name is required');
      return;
    }

    setIsInstantiating(true);
    setInstantiateError(null);

    try {
      const res = await apiClient.instantiateTemplate(selectedTemplate.id, {
        name: projectName.trim(),
        code: projectCode.trim().toUpperCase() || undefined,
      });

      const newProject = res.project;

      // In local project store, add project to state
      useProjectStore.setState((state) => ({
        projects: [
          ...state.projects,
          {
            id: newProject.id,
            name: newProject.name,
            code: newProject.code,
            description: newProject.description || '',
            createdAt: newProject.created_at || new Date().toISOString(),
            updatedAt: newProject.updated_at || new Date().toISOString(),
            config: {
              weekendDays: [5, 6],
              durationMode: 'working_days',
              highlightCriticalPath: true,
              hasLockedBaseline: false,
              categories: [
                { id: 'cat-1', name: 'General', color: '#1f8a70' },
                { id: 'cat-2', name: 'Engineering', color: '#3b82f6' },
                { id: 'cat-3', name: 'Operations', color: '#f59e0b' },
              ],
            },
            clientName: null,
            projectType: 'internal',
            projectManagerId: null,
            isArchived: false,
            archivedAt: null,
            tasks: (newProject.tasks || []).map((t: any, idx: number) => ({
              id: t.id,
              projectId: newProject.id,
              parentId: t.parent_id || null,
              name: t.name,
              wbsCode: t.wbs_code || undefined,
              category: t.category || 'General',
              priority: (t.priority || 'Medium') as any,
              assignee: 'Project Lead',
              primaryOwnerId: null,
              primaryOwnerHours: null,
              contributorAllocations: [],
              reviewerId: null,
              reviewStatus: 'none',
              estimatedHours: t.estimated_hours || null,
              loggedHours: 0,
              start: t.start_date || new Date().toISOString().slice(0, 10),
              end: t.end_date || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
              pct: t.percent_complete || 0,
              isMilestone: !!t.is_milestone,
              dependsOn: [],
              status: (t.status || 'Not Started') as any,
              order: t.order_index ?? idx + 1,
            })),
            risks: (newProject.risks || []).map((r: any) => ({
              id: r.id,
              projectId: newProject.id,
              title: r.title,
              description: r.description || '',
              type: r.type || 'risk',
              severity: r.severity || 'medium',
              likelihood: r.likelihood || 'medium',
              impact: r.impact || 'medium',
              status: r.status || 'open',
              ownerId: null,
              dueDate: r.due_date || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
              rootCause: '',
              mitigationPlan: r.mitigation_plan || '',
              resolutionSummary: '',
              resolvedAt: null,
              linkedTaskIds: [],
              history: [],
            })),
          },
        ],
      }));

      setActiveProject(newProject.id);
      setActiveView('planner');

      if (onTemplateInstantiated) {
        onTemplateInstantiated(newProject);
      }

      onClose();
    } catch (err: any) {
      setInstantiateError(err?.message || 'Failed to initialize project from template');
    } finally {
      setIsInstantiating(false);
    }
  };

  const industries = Array.from(
    new Set(templates.map((t) => t.industry).filter(Boolean))
  );

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIndustry = industryFilter === 'all' || t.industry === industryFilter;
    return matchesSearch && matchesIndustry;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Project Templates"
      description="Kickstart delivery in seconds with pre-configured work breakdowns, dependencies, and risk frameworks."
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Search & Industry Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search templates by title or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
            >
              <option value="all">All Industries</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Templates Grid / Empty State */}
        {isLoading ? (
          <EmptyState
            status="loading"
            title="Loading Templates"
            description="Fetching system and tenant delivery frameworks..."
          />
        ) : error ? (
          <EmptyState
            status="error"
            title="Unable to Load Templates"
            description="We encountered an issue communicating with the template library."
            errorDetails={error}
            onRetry={loadTemplates}
          />
        ) : filteredTemplates.length === 0 ? (
          <EmptyState
            status="empty"
            title="No Templates Found"
            description={
              searchQuery || industryFilter !== 'all'
                ? 'No templates match your search criteria. Try clearing filters.'
                : 'No templates have been configured for your workspace.'
            }
            primaryAction={
              searchQuery || industryFilter !== 'all'
                ? {
                    label: 'Reset Filters',
                    onClick: () => {
                      setSearchQuery('');
                      setIndustryFilter('all');
                    },
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredTemplates.map((template) => {
              const isSelected = selectedTemplate?.id === template.id;
              return (
                <div
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className={`clay-card !p-4 cursor-pointer text-left transition-all border-2 relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/30'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div>
                    {/* Header Tags */}
                    <div className="flex items-center justify-between gap-1.5 mb-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          template.is_system
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {template.is_system ? 'System Template' : 'Organization'}
                      </span>
                      {template.industry && (
                        <span className="text-[10px] font-bold text-slate-400 capitalize">
                          {template.industry}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight mb-1.5">
                      {template.name}
                    </h4>

                    {template.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
                        {template.description}
                      </p>
                    )}
                  </div>

                  {/* Template Metrics */}
                  <div>
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-emerald-500" />
                        {template.tasks_count || template.task_count || template.template_data?.tasks?.length || 0} Tasks
                      </span>
                      <span className="flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                        {template.risks_count || template.risk_count || template.template_data?.risks?.length || 0} Risks
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        {template.estimated_duration_days || 30}d
                      </span>
                    </div>

                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTemplate(template);
                        }}
                        className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-emerald-500 hover:text-white'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Selected</span>
                          </>
                        ) : (
                          <>
                            <span>Select Template</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Instantiation Drawer / Form when template is selected */}
        {selectedTemplate && (
          <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/30 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Instantiate: {selectedTemplate.name}</span>
            </h4>

            {instantiateError && (
              <div className="mb-3 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400">
                {instantiateError}
              </div>
            )}

            <form onSubmit={handleInstantiate} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <ClayInput
                  label="New Project Name *"
                  placeholder="e.g., Enterprise Client Onboarding - Phase 1"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                />
              </div>

              <div>
                <ClayInput
                  label="Project Code (WBS Prefix)"
                  placeholder="e.g., ONBD"
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
                  maxLength={8}
                />
              </div>

              <div className="md:col-span-3 flex justify-end gap-2 pt-1">
                <ClayButton
                  size="sm"
                  variant="default"
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                >
                  Cancel Selection
                </ClayButton>
                <ClayButton
                  size="sm"
                  variant="primary"
                  type="submit"
                  icon={<Sparkles className="w-4 h-4" />}
                  disabled={isInstantiating}
                >
                  {isInstantiating ? 'Creating Project...' : 'Launch Project From Template'}
                </ClayButton>
              </div>
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
};
