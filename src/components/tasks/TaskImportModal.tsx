import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileJson,
  X,
  HelpCircle,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { ClayButton } from '../common/ClayButton';
import { EmptyState } from '../common/EmptyState';
import { apiClient, ApiImportDryRunResult } from '../../api/client';
import { useProjectStore } from '../../stores/useProjectStore';

interface TaskImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  onImportSuccess?: () => void;
}

export const TaskImportModal: React.FC<TaskImportModalProps> = ({
  isOpen,
  onClose,
  projectId: propProjectId,
  onImportSuccess,
}) => {
  const { activeProjectId, projects } = useProjectStore();
  const targetProjectId = propProjectId || activeProjectId;
  const project = projects.find((p) => p.id === targetProjectId);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDryRun, setIsDryRun] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<ApiImportDryRunResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setDryRunResult(null);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setDryRunResult(null);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };

  const executeImport = async (dryRun: boolean) => {
    if (!selectedFile || !targetProjectId) {
      setErrorMessage('Please select a valid CSV or JSON file.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('dry_run', dryRun ? '1' : '0');

    try {
      const result = await apiClient.importTasks(targetProjectId, formData);

      if (dryRun) {
        setDryRunResult(result);
        if (result.errors && result.errors.length > 0) {
          setErrorMessage(`Validation failed with ${result.errors.length} error(s). Please review below.`);
        }
      } else {
        // Live import executed
        setSuccessMessage(result.message || 'Tasks imported successfully into project!');
        setDryRunResult(null);

        // Synchronize imported tasks in Zustand store if present
        const importedTasks = result.tasks || result.preview || [];
        if (importedTasks.length > 0) {
          useProjectStore.setState((state) => ({
            projects: state.projects.map((p) => {
              if (p.id === targetProjectId) {
                const newTasks = importedTasks.map((t: any, idx: number) => ({
                  id: t.id || `task-import-${Date.now()}-${idx}`,
                  projectId: targetProjectId,
                  parentId: null,
                  name: t.name,
                  wbsCode: t.wbs_code || undefined,
                  category: t.category || 'General',
                  priority: (t.priority || 'Medium') as any,
                  assignee: 'Unassigned',
                  primaryOwnerId: null,
                  primaryOwnerHours: null,
                  contributorAllocations: [],
                  reviewerId: null,
                  reviewStatus: 'none' as const,
                  estimatedHours: t.estimated_hours || null,
                  loggedHours: 0,
                  start: t.start_date || new Date().toISOString().slice(0, 10),
                  end: t.end_date || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
                  pct: t.percent_complete || 0,
                  isMilestone: !!t.is_milestone,
                  dependsOn: [],
                  status: (t.status || 'Not Started') as any,
                  order: p.tasks.length + idx + 1,
                }));
                return {
                  ...p,
                  tasks: [...p.tasks, ...newTasks],
                };
              }
              return p;
            }),
          }));
        }

        if (onImportSuccess) {
          onImportSuccess();
        }

        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to process file import');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setDryRunResult(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Task Import (CSV / JSON)"
      description={`Import tasks into project: ${project?.name || 'Selected Project'} with pre-flight dry-run verification.`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Dropzone */}
        {!selectedFile ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,text/csv,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mb-1">
              Click to select or drag and drop CSV or JSON file
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm leading-relaxed mb-3">
              Supports standard column headers: <code>name</code>, <code>wbs_code</code>, <code>category</code>, <code>start_date</code>, <code>end_date</code>, <code>priority</code>, <code>estimated_hours</code>
            </p>
            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
              <span className="flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> .CSV format
              </span>
              <span className="flex items-center gap-1">
                <FileJson className="w-3.5 h-3.5 text-blue-500" /> .JSON format
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                {selectedFile.name.endsWith('.json') ? (
                  <FileJson className="w-5 h-5" />
                ) : (
                  <FileSpreadsheet className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  {selectedFile.name}
                </div>
                <div className="text-[10px] text-slate-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Standard File'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={resetSelection}
              disabled={isProcessing}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Status / Feedback Alerts */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400 flex items-start gap-2">
            <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Dry-Run Result Summary & Preview */}
        {dryRunResult && (
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  Dry-Run Verification Passed
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold">
                <span className="text-slate-500">
                  Tasks: {dryRunResult.summary?.tasks_count ?? dryRunResult.total_rows ?? 0}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  Dependencies: {dryRunResult.summary?.dependencies_count ?? 0}
                </span>
                {Boolean(dryRunResult.invalid_rows && dryRunResult.invalid_rows > 0) && (
                  <span className="text-red-600 dark:text-red-400">Errors: {dryRunResult.invalid_rows}</span>
                )}
              </div>
            </div>

            {/* Validation errors list if any */}
            {dryRunResult.errors && dryRunResult.errors.length > 0 && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 space-y-1">
                <div className="text-[11px] font-bold text-red-600 dark:text-red-400">
                  Validation Errors:
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {dryRunResult.errors.map((err: any, idx: number) => (
                    <div key={idx} className="text-[10px] text-red-700 dark:text-red-300">
                      Row {err.row || idx + 1}: {err.errors?.join(', ') || err.message || 'Validation error'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Task Preview Table */}
            {((dryRunResult.tasks || dryRunResult.preview || []) as any[]).length > 0 && (
              <div>
                <div className="text-[11px] font-bold text-slate-500 mb-1.5">
                  Tasks Preview (First {((dryRunResult.tasks || dryRunResult.preview || []) as any[]).slice(0, 10).length}):
                </div>
                <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-500">
                      <tr>
                        <th className="py-1 px-2">WBS</th>
                        <th className="py-1 px-2">Task Name</th>
                        <th className="py-1 px-2">Category</th>
                        <th className="py-1 px-2">Duration</th>
                        <th className="py-1 px-2">Priority</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800">
                      {((dryRunResult.tasks || dryRunResult.preview || []) as any[]).slice(0, 10).map((t: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30">
                          <td className="py-1 px-2 font-mono text-[10px] text-slate-400">{t.wbs_code || `1.${idx + 1}`}</td>
                          <td className="py-1 px-2 font-bold text-slate-700 dark:text-slate-200">{t.name}</td>
                          <td className="py-1 px-2 text-slate-500">{t.category || 'General'}</td>
                          <td className="py-1 px-2 text-slate-500">{t.duration_days ? `${t.duration_days}d` : '-'}</td>
                          <td className="py-1 px-2 text-slate-500">{t.priority || 'Medium'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isDryRun}
              onChange={(e) => setIsDryRun(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 dark:bg-slate-800 dark:border-slate-700"
            />
            <span>Pre-validate with dry run first</span>
          </label>

          <div className="flex items-center gap-2">
            <ClayButton size="sm" variant="default" onClick={onClose} disabled={isProcessing}>
              Cancel
            </ClayButton>

            {dryRunResult ? (
              <ClayButton
                size="sm"
                variant="primary"
                onClick={() => executeImport(false)}
                disabled={isProcessing || ((dryRunResult.summary?.tasks_count === 0) && (dryRunResult.valid_rows === 0))}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                {isProcessing
                  ? 'Importing Tasks...'
                  : `Confirm & Import ${dryRunResult.summary?.tasks_count ?? dryRunResult.valid_rows ?? ''} Tasks`}
              </ClayButton>
            ) : (
              <ClayButton
                size="sm"
                variant="primary"
                onClick={() => executeImport(isDryRun)}
                disabled={!selectedFile || isProcessing}
                icon={<Upload className="w-4 h-4" />}
              >
                {isProcessing
                  ? 'Analyzing...'
                  : isDryRun
                  ? 'Verify File (Dry Run)'
                  : 'Import Directly'}
              </ClayButton>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
