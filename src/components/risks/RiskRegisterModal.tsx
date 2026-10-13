import React, { useState } from 'react';
import {
  X,
  AlertOctagon,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Calendar,
  User,
  ArrowRight,
  Filter,
  FileCheck,
} from 'lucide-react';
import {
  ProjectRisk,
  RIBType,
  RIBSeverity,
  RIBLikelihood,
  RIBStatus,
} from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';
import { ClayButton } from '../common/ClayButton';
import { getTodayUTC } from '../../utils/dateUtils';

interface RiskRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RiskRegisterModal: React.FC<RiskRegisterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    projects,
    activeProjectId,
    teamMembers,
    addRisk,
    updateRisk,
    deleteRisk,
  } = useProjectStore();

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  const risks = activeProject?.risks || [];

  const [typeFilter, setTypeFilter] = useState<'all' | RIBType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | RIBStatus>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [resolvingRiskId, setResolvingRiskId] = useState<string | null>(null);
  const [resolutionSummary, setResolutionSummary] = useState('');

  // New Risk Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<RIBType>('risk');
  const [newSeverity, setNewSeverity] = useState<RIBSeverity>('high');
  const [newLikelihood, setNewLikelihood] = useState<RIBLikelihood>('medium');
  const [newImpact, setNewImpact] = useState<RIBSeverity>('high');
  const [newRootCause, setNewRootCause] = useState('');
  const [newMitigationPlan, setNewMitigationPlan] = useState('');
  const [newOwnerId, setNewOwnerId] = useState<string>('');
  const [newDueDate, setNewDueDate] = useState(getTodayUTC());
  const [newLinkedTasks, setNewLinkedTasks] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const todayStr = getTodayUTC();

  // Metrics
  const totalRisks = risks.filter((r) => r.type === 'risk').length;
  const totalIssues = risks.filter((r) => r.type === 'issue').length;
  const totalBlockers = risks.filter((r) => r.type === 'blocker' && r.status !== 'resolved').length;
  const totalResolved = risks.filter((r) => r.status === 'resolved').length;

  const filteredRisks = risks.filter((r) => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const handleCreateRisk = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!newTitle.trim()) {
      setValidationError('Title is required.');
      return;
    }
    if (!newMitigationPlan.trim()) {
      setValidationError('Mitigation/Resolution plan is mandatory.');
      return;
    }

    // Spec TC-2.1 Invariant Validation
    if (newType === 'risk') {
      if (!newLikelihood || !newImpact) {
        setValidationError('Risks require explicit Likelihood and Impact ratings.');
        return;
      }
    } else {
      // Issue or Blocker: Root cause is mandatory
      if (!newRootCause.trim()) {
        setValidationError(`A verified Root Cause is mandatory when logging an ${newType.toUpperCase()}.`);
        return;
      }
    }

    addRisk({
      title: newTitle.trim(),
      description: newDescription.trim(),
      type: newType,
      severity: newSeverity,
      status: 'open',
      likelihood: newType === 'risk' ? newLikelihood : null,
      impact: newType === 'risk' ? newImpact : newSeverity,
      rootCause: newRootCause.trim(),
      mitigationPlan: newMitigationPlan.trim(),
      ownerId: newOwnerId || null,
      identifiedDate: todayStr,
      dueDate: newDueDate,
      linkedTaskIds: newLinkedTasks,
      linkedMilestoneIds: [],
    });

    // Reset Form
    setNewTitle('');
    setNewDescription('');
    setNewRootCause('');
    setNewMitigationPlan('');
    setNewOwnerId('');
    setNewLinkedTasks([]);
    setIsFormOpen(false);
  };

  const handleConfirmResolve = (riskId: string) => {
    if (!resolutionSummary.trim()) return;
    updateRisk(riskId, {
      status: 'resolved',
      resolutionSummary: resolutionSummary.trim(),
      resolvedAt: new Date().toISOString(),
    });
    setResolvingRiskId(null);
    setResolutionSummary('');
  };

  const getTypeBadge = (type: RIBType) => {
    switch (type) {
      case 'blocker':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
            <AlertOctagon className="w-3.5 h-3.5" /> Blocker
          </span>
        );
      case 'issue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Issue
          </span>
        );
      case 'risk':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <ShieldAlert className="w-3.5 h-3.5" /> Risk
          </span>
        );
    }
  };

  const getSeverityBadge = (severity: RIBSeverity) => {
    const map = {
      critical: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
      high: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
      medium: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
      low: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    };
    return (
      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border uppercase ${map[severity]}`}>
        {severity}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="clay-card w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-300/40 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  Risk, Issue & Blocker (RIB) Register
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                  {activeProject.code}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log root causes, mitigation plans, and assign resolution owners for delivery continuity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ClayButton
              size="sm"
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsFormOpen(!isFormOpen)}
            >
              {isFormOpen ? 'Cancel' : 'Log Risk / Blocker'}
            </ClayButton>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metric Ribbons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3 bg-slate-100/40 dark:bg-slate-900/20 border-b border-slate-200/50 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <AlertOctagon className="w-4 h-4 text-red-500 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Active Blockers</div>
              <div className="text-sm font-extrabold text-red-600 dark:text-red-400">{totalBlockers}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Open Issues</div>
              <div className="text-sm font-extrabold text-amber-600 dark:text-amber-400">{totalIssues}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <ShieldAlert className="w-4 h-4 text-blue-500 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Identified Risks</div>
              <div className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{totalRisks}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Resolved Items</div>
              <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{totalResolved}</div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* New RIB Form (Collapsible) */}
          {isFormOpen && (
            <form
              onSubmit={handleCreateRisk}
              className="p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-500/30 space-y-4 animate-in slide-in-from-top-3 duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  New Risk / Issue / Blocker Entry
                </span>
                <span className="text-[11px] text-slate-400">* All fields strictly validated</span>
              </div>

              {validationError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Entry Classification *
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as RIBType)}
                    className="w-full text-xs font-semibold p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    <option value="risk">Risk (Potential future event)</option>
                    <option value="issue">Issue (Active problem occurring)</option>
                    <option value="blocker">Blocker (Stopping task delivery)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Severity *
                  </label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as RIBSeverity)}
                    className="w-full text-xs font-semibold p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Target Resolution Due Date *
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full text-xs font-semibold p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Likelihood & Impact if Risk */}
              {newType === 'risk' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-500/20">
                  <div>
                    <label className="block text-[11px] font-bold text-blue-700 dark:text-blue-300 mb-1">
                      Risk Likelihood *
                    </label>
                    <select
                      value={newLikelihood}
                      onChange={(e) => setNewLikelihood(e.target.value as RIBLikelihood)}
                      className="w-full text-xs font-semibold p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                    >
                      <option value="low">Low Likelihood (&lt; 25%)</option>
                      <option value="medium">Medium Likelihood (25% - 75%)</option>
                      <option value="high">High Likelihood (&gt; 75%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-blue-700 dark:text-blue-300 mb-1">
                      Potential Impact *
                    </label>
                    <select
                      value={newImpact}
                      onChange={(e) => setNewImpact(e.target.value as RIBSeverity)}
                      className="w-full text-xs font-semibold p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                    >
                      <option value="critical">Critical Impact</option>
                      <option value="high">High Impact</option>
                      <option value="medium">Medium Impact</option>
                      <option value="low">Low Impact</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Title & Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Title / Subject *
                </label>
                <input
                  type="text"
                  placeholder="e.g. RS-232 Driver Incompatibility on Server"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs font-semibold p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Detailed Operational Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain the context and circumstances..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Root Cause (Mandatory for issue/blocker) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Root Cause Analysis {newType !== 'risk' ? '(Mandatory for Issue / Blocker)' : '(Optional)'} *
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    newType !== 'risk'
                      ? 'Identify the root reason why this issue/blocker occurred...'
                      : 'Underlying vulnerabilities or external dependencies...'
                  }
                  value={newRootCause}
                  onChange={(e) => setNewRootCause(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Mitigation / Resolution Plan (Mandatory) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Mitigation / Resolution Plan *
                </label>
                <textarea
                  rows={2}
                  placeholder="Concrete actions to resolve or mitigate this item..."
                  value={newMitigationPlan}
                  onChange={(e) => setNewMitigationPlan(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Owner & Linked Task */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Accountable Owner
                  </label>
                  <select
                    value={newOwnerId}
                    onChange={(e) => setNewOwnerId(e.target.value)}
                    className="w-full text-xs font-semibold p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.jobTitle})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Link to Relevant Task
                  </label>
                  <select
                    value={newLinkedTasks[0] || ''}
                    onChange={(e) => setNewLinkedTasks(e.target.value ? [e.target.value] : [])}
                    className="w-full text-xs font-semibold p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    <option value="">No linked task</option>
                    {activeProject.tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <ClayButton
                  size="sm"
                  variant="default"
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </ClayButton>
                <ClayButton size="sm" variant="primary" type="submit">
                  Save Entry to Register
                </ClayButton>
              </div>
            </form>
          )}

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Filters:</span>
              <div className="flex items-center gap-1">
                {(['all', 'blocker', 'issue', 'risk'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold capitalize transition-colors ${
                      typeFilter === t
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Status:</span>
              <div className="flex items-center gap-1">
                {(['all', 'open', 'mitigating', 'resolved'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold capitalize transition-colors ${
                      statusFilter === s
                        ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Risks Cards List */}
          {filteredRisks.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500/50" />
              <div className="font-bold text-sm text-slate-600 dark:text-slate-300">
                No entries match the current filter
              </div>
              <div>Project delivery is operating with zero registered delivery impediments.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRisks.map((risk) => {
                const owner = teamMembers.find((m) => m.id === risk.ownerId);
                const isOverdue = risk.dueDate < todayStr && risk.status !== 'resolved';
                const linkedTasks = activeProject.tasks.filter((t) =>
                  risk.linkedTaskIds.includes(t.id)
                );

                return (
                  <div
                    key={risk.id}
                    className={`clay-card !p-4 transition-all ${
                      risk.status === 'resolved'
                        ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/30'
                        : risk.type === 'blocker'
                        ? 'border-red-500/40 bg-red-50/20 dark:bg-red-950/20'
                        : 'border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {getTypeBadge(risk.type)}
                        {getSeverityBadge(risk.severity)}
                        {risk.type === 'risk' && risk.likelihood && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 uppercase">
                            Likelihood: {risk.likelihood}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
                          {risk.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <div
                          className={`flex items-center gap-1 font-mono text-[11px] font-bold ${
                            isOverdue
                              ? 'text-red-600 dark:text-red-400 font-extrabold animate-pulse'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Due: {risk.dueDate}</span>
                          {isOverdue && <span>(Overdue!)</span>}
                        </div>

                        {risk.status !== 'resolved' && (
                          <ClayButton
                            size="sm"
                            variant="primary"
                            icon={<FileCheck className="w-3.5 h-3.5" />}
                            onClick={() => setResolvingRiskId(risk.id)}
                          >
                            Resolve
                          </ClayButton>
                        )}

                        <button
                          onClick={() => deleteRisk(risk.id)}
                          title="Delete entry"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mb-1">
                      {risk.title}
                    </h3>

                    {risk.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                        {risk.description}
                      </p>
                    )}

                    {/* Root Cause Callout */}
                    {risk.rootCause && (
                      <div className="p-2.5 rounded-xl bg-red-500/5 dark:bg-red-950/20 border-l-4 border-red-500 text-xs mb-2.5">
                        <span className="font-extrabold text-red-700 dark:text-red-300 mr-1.5">
                          Root Cause:
                        </span>
                        <span className="text-slate-700 dark:text-slate-300">{risk.rootCause}</span>
                      </div>
                    )}

                    {/* Mitigation Plan */}
                    <div className="p-2.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border-l-4 border-emerald-500 text-xs mb-3">
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-300 mr-1.5">
                        Mitigation / Resolution:
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">{risk.mitigationPlan}</span>
                    </div>

                    {/* Resolved Summary if resolved */}
                    {risk.status === 'resolved' && risk.resolutionSummary && (
                      <div className="p-2.5 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 text-xs mb-3">
                        <span className="font-extrabold text-slate-700 dark:text-slate-300 mr-1.5">
                          Resolution Summary:
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">{risk.resolutionSummary}</span>
                        {risk.resolvedAt && (
                          <span className="text-[10px] text-slate-400 ml-2">
                            ({new Date(risk.resolvedAt).toLocaleDateString()})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Card Footer Info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Owner:</span>
                        {owner ? (
                          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                            {owner.photoUrl ? (
                              <img
                                src={owner.photoUrl}
                                alt={owner.name}
                                className="w-4 h-4 rounded-full object-cover"
                              />
                            ) : (
                              <span className="w-4 h-4 rounded-full bg-slate-600 text-[8px] font-bold text-white flex items-center justify-center">
                                {owner.name.substring(0, 1).toUpperCase()}
                              </span>
                            )}
                            <span>{owner.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </div>

                      {linkedTasks.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">Linked Tasks:</span>
                          {linkedTasks.map((t) => (
                            <span
                              key={t.id}
                              className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold truncate max-w-[160px]"
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Resolve Confirmation Modal */}
        {resolvingRiskId && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
            <div className="clay-card w-full max-w-md p-5 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-500" />
                <span>Mark Risk / Blocker as Resolved</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Please provide a brief summary of how this item was resolved for the project audit trail:
              </p>
              <textarea
                rows={3}
                placeholder="e.g., Driver upgraded and regression test passed on server..."
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
              />
              <div className="flex justify-end gap-2">
                <ClayButton
                  size="sm"
                  variant="default"
                  onClick={() => {
                    setResolvingRiskId(null);
                    setResolutionSummary('');
                  }}
                >
                  Cancel
                </ClayButton>
                <ClayButton
                  size="sm"
                  variant="primary"
                  onClick={() => handleConfirmResolve(resolvingRiskId)}
                  disabled={!resolutionSummary.trim()}
                >
                  Confirm Resolution
                </ClayButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
