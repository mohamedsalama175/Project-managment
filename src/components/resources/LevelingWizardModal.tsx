import React, { useState } from 'react';
import {
  X,
  Sliders,
  Sparkles,
  Calendar,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { ClayButton } from '../common/ClayButton';
import { resourcesApi, LevelingResponse, LevelingProposal } from '../../api/resources';

interface LevelingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  onLevelingApplied?: () => void;
}

export const LevelingWizardModal: React.FC<LevelingWizardModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  onLevelingApplied,
}) => {
  const [mode, setMode] = useState<'minimize_overallocation' | 'smooth_weekly_load' | 'protect_critical_path'>(
    'minimize_overallocation'
  );
  const [isProposing, setIsProposing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [levelingData, setLevelingData] = useState<LevelingResponse | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePropose = async () => {
    setIsProposing(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await resourcesApi.proposeLeveling(projectId, mode);
      setLevelingData(data);
      // Default to selecting all proposed tasks
      setSelectedTaskIds(data.proposals.map((p) => p.task_id));
    } catch (err: any) {
      setError(err?.message || 'Failed to calculate leveling proposals.');
    } finally {
      setIsProposing(false);
    }
  };

  const handleApply = async () => {
    if (!levelingData || selectedTaskIds.length === 0) return;

    setIsApplying(true);
    setError(null);
    try {
      const res = await resourcesApi.applyLeveling(
        projectId,
        levelingData.state_hash,
        selectedTaskIds
      );
      setSuccess(`Successfully applied leveling shifts to ${res.applied_count} task(s).`);
      if (onLevelingApplied) {
        onLevelingApplied();
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      if (err?.status === 409) {
        setError(
          'Conflict detected: Schedule was modified concurrently by another user. Please re-generate leveling proposals.'
        );
      } else {
        setError(err?.message || 'Failed to apply leveling shifts.');
      }
    } finally {
      setIsApplying(false);
    }
  };

  const toggleSelectTask = (taskId: string) => {
    if (selectedTaskIds.includes(taskId)) {
      setSelectedTaskIds(selectedTaskIds.filter((id) => id !== taskId));
    } else {
      setSelectedTaskIds([...selectedTaskIds, taskId]);
    }
  };

  const toggleSelectAll = () => {
    if (!levelingData) return;
    if (selectedTaskIds.length === levelingData.proposals.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(levelingData.proposals.map((p) => p.task_id));
    }
  };

  const modesConfig = [
    {
      id: 'minimize_overallocation',
      name: 'Minimize Over-Allocation',
      desc: 'Shifts non-critical overlapping tasks forward to eliminate team overload while keeping delays minimal.',
    },
    {
      id: 'smooth_weekly_load',
      name: 'Smooth Weekly Load',
      desc: 'Evens out resource demand across weeks to eliminate valleys and stress spikes.',
    },
    {
      id: 'protect_critical_path',
      name: 'Protect Critical Path (CPM)',
      desc: 'Strictly forbids shifts on tasks with Total Float <= 0, keeping project milestone deadlines rigid.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-7 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Advisory Resource Leveling Wizard
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Project: <span className="font-bold text-slate-800 dark:text-slate-200">{projectName}</span> · Purely advisory until applied
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Select Optimization Strategy
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {modesConfig.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id as any)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    mode === m.id
                      ? 'border-emerald-500/50 bg-emerald-500/5 ring-2 ring-emerald-500/30'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900 dark:text-white mb-1">
                    {m.name}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {m.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <ClayButton
              variant="default"
              size="sm"
              disabled={isProposing}
              onClick={handlePropose}
              icon={isProposing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            >
              {isProposing ? 'Analyzing Schedule...' : 'Analyze & Propose Shifts'}
            </ClayButton>
          </div>

          {/* Results Table */}
          {levelingData && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Proposed Schedule Adjustments ({levelingData.proposals.length})</span>
                  {levelingData.cpm_critical_path_protected && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> CPM Float Protected
                    </span>
                  )}
                </div>

                {levelingData.proposals.length > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    {selectedTaskIds.length === levelingData.proposals.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {levelingData.proposals.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                  No overallocations or shifts required under the selected strategy. Schedule is optimal!
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                        <th className="p-3 w-10 text-center">Apply</th>
                        <th className="p-3">Task Name</th>
                        <th className="p-3">Current Range</th>
                        <th className="p-3">Proposed Range</th>
                        <th className="p-3">Shift</th>
                        <th className="p-3">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {levelingData.proposals.map((prop) => {
                        const isSelected = selectedTaskIds.includes(prop.task_id);
                        return (
                          <tr
                            key={prop.task_id}
                            className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                              isSelected ? 'bg-emerald-500/5' : ''
                            }`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectTask(prop.task_id)}
                                className="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white">
                              <div>{prop.task_name}</div>
                              {prop.is_critical && (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/10 text-rose-600 font-mono">
                                  CRITICAL PATH
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono text-[11px] text-slate-500">
                              {prop.current_start} → {prop.current_end}
                            </td>
                            <td className="p-3 font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              {prop.proposed_start} → {prop.proposed_end}
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                              +{prop.shift_days}d
                            </td>
                            <td className="p-3 text-slate-500 italic text-[11px]">
                              {prop.reason}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 font-mono">
            {levelingData?.state_hash ? `State Hash: ${levelingData.state_hash.substring(0, 10)}...` : 'Advisory Mode'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <ClayButton
              variant="primary"
              disabled={!levelingData || selectedTaskIds.length === 0 || isApplying}
              onClick={handleApply}
              icon={isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            >
              {isApplying
                ? 'Applying Shifts...'
                : `Apply Selected Shifts (${selectedTaskIds.length})`}
            </ClayButton>
          </div>
        </div>
      </div>
    </div>
  );
};
