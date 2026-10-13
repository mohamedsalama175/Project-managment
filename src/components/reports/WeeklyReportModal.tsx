import React, { useState } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  FileText,
  Calendar,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Flag,
  Share2,
} from 'lucide-react';
import { useProjectStore } from '../../stores/useProjectStore';
import { ClayButton } from '../common/ClayButton';
import { getTodayUTC, diffCalendarDays } from '../../utils/dateUtils';
import { calculateCPM } from '../../utils/cpmUtils';

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WeeklyReportModal: React.FC<WeeklyReportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { projects, activeProjectId, teamMembers } = useProjectStore();
  const [copied, setCopied] = useState(false);

  const project = projects.find((p) => p.id === activeProjectId) || projects[0];
  if (!isOpen || !project) return null;

  const todayStr = getTodayUTC();
  const pm = (teamMembers || []).find((m) => m.id === project.projectManagerId);

  // Accomplished (Completed tasks)
  const completedTasks = (project.tasks || []).filter((t) => t.status === 'Completed');

  // In Progress / Planned
  const inProgressTasks = (project.tasks || []).filter((t) => t.status === 'In Progress' || t.status === 'In Review');
  const upcomingTasks = (project.tasks || []).filter((t) => t.status === 'Not Started');

  // Risks & Blockers
  const activeRisks = (project.risks || []).filter((r) => r.status !== 'resolved');
  const activeBlockers = activeRisks.filter((r) => r.type === 'blocker');

  // Milestones & Critical Path
  const milestones = project.tasks.filter((t) => t.isMilestone);
  const cpmInfo = calculateCPM(project.tasks);
  const criticalTasksCount = Array.from(cpmInfo.values()).filter((c) => c.isCritical).length;

  // Overall Progress
  const totalTasks = project.tasks.length;
  const overallProgress = totalTasks > 0
    ? Math.round(project.tasks.reduce((sum, t) => sum + t.pct, 0) / totalTasks)
    : 0;

  // Generate Markdown Format
  const generateMarkdown = () => {
    return `# 📊 Project Delivery Status Report: ${project.name} (${project.code})
**Date**: ${todayStr}  
**Project Manager**: ${pm ? pm.name : 'Unassigned'}  
**Client / Type**: ${project.clientName || 'Internal'} (${project.projectType.toUpperCase()})  
**Overall Completion**: ${overallProgress}%  
**Target Launch**: ${project.config.targetLaunchDate || 'TBD'}  

---

## 1. ✅ Key Accomplishments
${
  completedTasks.length === 0
    ? '_No tasks completed in this reporting period._'
    : completedTasks
        .map((t) => {
          const owner = teamMembers.find((m) => m.id === t.primaryOwnerId);
          return `- **${t.name}** (${t.category}) — Owner: ${owner?.name || 'Unassigned'}`;
        })
        .join('\n')
}

---

## 2. ⏳ Planned & Active Work for Next Period
### Active In-Progress (${inProgressTasks.length})
${
  inProgressTasks.length === 0
    ? '_No tasks currently in progress._'
    : inProgressTasks
        .map((t) => {
          const owner = teamMembers.find((m) => m.id === t.primaryOwnerId);
          return `- **${t.name}** [${t.pct}%] — Owner: ${owner?.name || 'Unassigned'} (Target: ${t.end})`;
        })
        .join('\n')
}

### Starting Soon (${upcomingTasks.slice(0, 5).length})
${
  upcomingTasks.slice(0, 5).map((t) => `- **${t.name}** — Planned: ${t.start}`).join('\n')
}

---

## 3. 🚨 Delivery Impediments & Active Risks (${activeRisks.length})
${
  activeRisks.length === 0
    ? '_Zero active risks or blockers. Delivery is on schedule._'
    : activeRisks
        .map((r) => {
          return `- [${r.type.toUpperCase()}] **${r.title}** (${r.severity.toUpperCase()})
  - **Root Cause**: ${r.rootCause || 'Under investigation'}
  - **Mitigation Plan**: ${r.mitigationPlan}
  - **Due**: ${r.dueDate}`;
        })
        .join('\n\n')
}

---

## 4. 🏁 Critical Milestones & Schedule Status
- **Critical Path Tasks**: ${criticalTasksCount} tasks on critical path
${
  milestones.length === 0
    ? '_No milestones defined._'
    : milestones
        .map((m) => `- **${m.name}**: Due ${m.end} — ${m.pct === 100 ? '✅ Completed' : '⏳ Pending'}`)
        .join('\n')
}

_Report generated automatically by DeliverOps Enterprise Platform on ${new Date().toLocaleString()}._
`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="clay-card w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-300/40 dark:border-slate-800 print:m-0 print:max-w-none print:shadow-none print:border-none">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  Weekly Delivery Status Report
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                  {project.code}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated 4-part executive report ready for management review and client distribution.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ClayButton
              size="sm"
              variant="default"
              icon={copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              onClick={handleCopy}
            >
              {copied ? 'Copied Markdown!' : 'Copy Markdown'}
            </ClayButton>

            <ClayButton
              size="sm"
              variant="primary"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
            >
              Print / PDF
            </ClayButton>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable & Visible Report Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white dark:bg-[#151c23] text-slate-800 dark:text-slate-100 print:p-0">
          {/* Executive Header Banner */}
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                DeliverOps Executive Delivery Brief
              </div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                {project.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Code: <strong className="text-slate-700 dark:text-slate-200">{project.code}</strong></span>
                <span>•</span>
                <span>Manager: <strong className="text-slate-700 dark:text-slate-200">{pm ? pm.name : 'Unassigned'}</strong></span>
                <span>•</span>
                <span>Client: <strong className="text-slate-700 dark:text-slate-200">{project.clientName || 'Internal'}</strong></span>
                <span>•</span>
                <span>Date: <strong className="text-slate-700 dark:text-slate-200">{todayStr}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">Overall Progress</div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{overallProgress}%</div>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-black text-lg text-emerald-600 dark:text-emerald-400">
                {completedTasks.length}/{totalTasks}
              </div>
            </div>
          </div>

          {/* Section 1: Accomplished */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-100">
                1. Key Accomplishments
              </h2>
              <span className="text-xs text-slate-400 font-mono">({completedTasks.length} items completed)</span>
            </div>

            {completedTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No tasks completed in this reporting cycle.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {completedTasks.map((t) => {
                  const owner = teamMembers.find((m) => m.id === t.primaryOwnerId);
                  return (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{t.name}</div>
                        <div className="text-[10px] text-slate-400">{t.category}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          {owner?.name || 'Unassigned'}
                        </div>
                        <span className="text-[10px] text-emerald-600 font-bold">100% Done</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section 2: Planned / In Progress */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <Clock className="w-5 h-5 text-blue-500" />
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-100">
                2. Planned & Active Work for Next Period
              </h2>
              <span className="text-xs text-slate-400 font-mono">({inProgressTasks.length} active in execution)</span>
            </div>

            <div className="space-y-2">
              {inProgressTasks.map((t) => {
                const owner = teamMembers.find((m) => m.id === t.primaryOwnerId);
                return (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-blue-50/20 dark:bg-blue-950/20 border border-blue-500/20 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{t.name}</div>
                      <div className="text-[10px] text-slate-400">
                        Owner: <strong>{owner?.name || 'Unassigned'}</strong> • Due: {t.end}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full"
                          style={{ width: `${t.pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 w-9 text-right">
                        {t.pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 3: Delivery Impediments & Active Risks */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <AlertOctagon className="w-5 h-5 text-red-500" />
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-100">
                3. Delivery Impediments & Active Risks
              </h2>
              <span className="text-xs text-slate-400 font-mono">({activeRisks.length} open items)</span>
            </div>

            {activeRisks.length === 0 ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Zero active risks or blockers. Delivery is operating within scheduled tolerances.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeRisks.map((r) => (
                  <div
                    key={r.id}
                    className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                      r.type === 'blocker'
                        ? 'bg-red-50/25 dark:bg-red-950/25 border-red-500/30'
                        : 'bg-amber-50/20 dark:bg-amber-950/20 border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-black text-[10px] uppercase bg-red-500 text-white">
                          {r.type}
                        </span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-100">{r.title}</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500">Target Due: {r.dueDate}</span>
                    </div>

                    {r.rootCause && (
                      <div className="text-[11px] text-slate-700 dark:text-slate-300 pl-2 border-l-2 border-red-500">
                        <strong>Root Cause:</strong> {r.rootCause}
                      </div>
                    )}

                    <div className="text-[11px] text-slate-700 dark:text-slate-300 pl-2 border-l-2 border-emerald-500">
                      <strong>Mitigation Plan:</strong> {r.mitigationPlan}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 4: Milestones & Schedule Status */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <Flag className="w-5 h-5 text-purple-500" />
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-100">
                4. Critical Milestones & Schedule Status
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <div className="text-[11px] font-bold uppercase text-slate-400">Critical Milestones</div>
                {milestones.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No milestones defined.</p>
                ) : (
                  milestones.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{m.name}</span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {m.end} {m.pct === 100 ? '✅' : '⏳'}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <div className="text-[11px] font-bold uppercase text-slate-400">Schedule Governance</div>
                <div className="flex justify-between py-1 text-xs">
                  <span className="text-slate-500">Critical Path Tasks:</span>
                  <strong className="text-slate-700 dark:text-slate-200">{criticalTasksCount} tasks</strong>
                </div>
                <div className="flex justify-between py-1 text-xs">
                  <span className="text-slate-500">Target Launch Date:</span>
                  <strong className="text-slate-700 dark:text-slate-200">{project.config.targetLaunchDate || 'TBD'}</strong>
                </div>
                <div className="flex justify-between py-1 text-xs">
                  <span className="text-slate-500">Baseline Locked:</span>
                  <strong className="text-slate-700 dark:text-slate-200">
                    {project.config.hasLockedBaseline ? `Locked (${project.config.baselineLockedDate})` : 'Unlocked Draft'}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          {/* Report Footer */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-[10px] text-slate-400">
            Generated by DeliverOps Enterprise Delivery & Resource Management Platform • Confidential
          </div>
        </div>
      </div>
    </div>
  );
};
