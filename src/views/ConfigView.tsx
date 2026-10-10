import React, { useState, useRef } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  Tag,
  Download,
  Upload,
  Copy,
  Trash2,
  Plus,
  Sparkles,
  FileSpreadsheet,
  FileJson,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { ClayInput } from '../components/common/ClayInput';
import { Modal } from '../components/common/Modal';
import { Project, CategoryDef } from '../types';
import { getBaselineVariance } from '../utils/dateUtils';


export const ConfigView: React.FC = () => {
  const {
    projects,
    activeProjectId,
    updateProject,
    updateProjectConfig,
    lockBaseline,
    clearBaseline,
    duplicateProject,
    deleteProject,
    exportProjectJSON,
    exportProjectCSV,
    importProjectJSON,
    importProjectCSV,
  } = useProjectStore();

  const activeProject = projects.find((p: Project) => p.id === activeProjectId) || projects[0];

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [configToast, setConfigToast] = useState<{msg: string; ok: boolean} | null>(null);

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, ok: boolean) => {
    setConfigToast({ msg, ok });
    setTimeout(() => setConfigToast(null), 3500);
  };

  const handleJSONImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const ok = importProjectJSON(ev.target?.result as string);
      showToast(ok ? `"${file.name}" imported!` : 'Import failed — invalid JSON.', ok);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const projectName = file.name.replace(/\.csv$/i, '');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const ok = importProjectCSV(ev.target?.result as string, projectName);
      showToast(ok ? `"${projectName}" imported from CSV!` : 'Import failed — invalid CSV.', ok);
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#1f8a70');

  if (!activeProject) {
    return (
      <div className="p-8 text-center text-slate-500">No project selected.</div>
    );
  }

  const { config, tasks } = activeProject;
  const baselineMetrics = getBaselineVariance(tasks);

  const daysOfWeek = [
    { day: 0, label: 'Sunday', short: 'Su' },
    { day: 1, label: 'Monday', short: 'Mo' },
    { day: 2, label: 'Tuesday', short: 'Tu' },
    { day: 3, label: 'Wednesday', short: 'We' },
    { day: 4, label: 'Thursday', short: 'Th' },
    { day: 5, label: 'Friday', short: 'Fr' },
    { day: 6, label: 'Saturday', short: 'Sa' },
  ];

  const toggleWeekendDay = (dayNum: number) => {
    const current = config.weekendDays || [];
    const next = current.includes(dayNum)
      ? current.filter((d: number) => d !== dayNum)
      : [...current, dayNum];
    updateProjectConfig({ weekendDays: next });
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const newCat: CategoryDef = {
      id: `cat-${Date.now().toString(36)}`,
      name: newCatName.trim(),
      color: newCatColor,
    };
    updateProjectConfig({
      categories: [...config.categories, newCat],
    });
    setNewCatName('');
  };

  const handleRemoveCategory = (catId: string) => {
    if (config.categories.length <= 1) return;
    updateProjectConfig({
      categories: config.categories.filter((c: CategoryDef) => c.id !== catId),
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Project Settings & Isolated Rules
            </h1>
            <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {activeProject.code}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configurations on this page apply strictly to{' '}
            <strong className="text-slate-700 dark:text-slate-300">
              {activeProject.name}
            </strong>{' '}
            without affecting other projects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ClayButton
            size="sm"
            variant="default"
            icon={<Copy className="w-3.5 h-3.5" />}
            onClick={() => duplicateProject(activeProject.id)}
          >
            Duplicate as Template
          </ClayButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: General Project Profile */}
        <ClayCard className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              General Project Profile
            </h2>
          </div>

          <ClayInput
            label="Project Name"
            value={activeProject.name}
            onChange={(e) => updateProject(activeProject.id, { name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <ClayInput
              label="Project Code"
              value={activeProject.code}
              onChange={(e) =>
                updateProject(activeProject.id, { code: e.target.value.toUpperCase() })
              }
              helperText="E.g., MAFI-01"
            />

            <ClayInput
              label="Target Delivery Date"
              type="date"
              value={config.targetLaunchDate || ''}
              onChange={(e) =>
                updateProjectConfig({ targetLaunchDate: e.target.value || undefined })
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Scope & Description
            </label>
            <textarea
              rows={3}
              value={activeProject.description}
              onChange={(e) =>
                updateProject(activeProject.id, { description: e.target.value })
              }
              className="clay-input px-3 py-2 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>
        </ClayCard>

        {/* Card 2: Calendar & Working Days */}
        <ClayCard className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3">
            <Calendar className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Calendar & Working Days
            </h2>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
              Configured Rest / Weekend Days
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {daysOfWeek.map((d) => {
                const isSelected = config.weekendDays.includes(d.day);
                return (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => toggleWeekendDay(d.day)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'clay-card !p-2 bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 scale-105'
                        : 'bg-slate-200/60 dark:bg-slate-800/60 text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
              Tip: Select Friday & Saturday for MENA region operations, or Saturday & Sunday for Western business schedules.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
              Duration Math Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateProjectConfig({ durationMode: 'working_days' })}
                className={`p-2.5 rounded-xl text-left border transition-all ${
                  config.durationMode === 'working_days'
                    ? 'clay-card !p-2.5 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <div className="text-xs">Business Working Days</div>
                <div className="text-[10px] opacity-75">
                  Excludes chosen rest days from task duration
                </div>
              </button>

              <button
                type="button"
                onClick={() => updateProjectConfig({ durationMode: 'calendar' })}
                className={`p-2.5 rounded-xl text-left border transition-all ${
                  config.durationMode === 'calendar'
                    ? 'clay-card !p-2.5 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <div className="text-xs">Calendar Days</div>
                <div className="text-[10px] opacity-75">
                  Calculates continuous raw calendar days
                </div>
              </button>
            </div>
          </div>
        </ClayCard>

        {/* Card 3: Baseline Control Center */}
        <ClayCard className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Baseline Control Center
              </h2>
            </div>
            {config.hasLockedBaseline && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-mono font-bold">
                Locked on {config.baselineLockedDate}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Locking a baseline captures a snapshot of current start and end dates. As dates slip during execution, ghost bars render on the Gantt chart showing schedule drift.
          </p>

          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">
                Total Project Slippage
              </div>
              <div
                className={`text-lg font-mono font-extrabold ${
                  baselineMetrics.totalSlippageDays > 0
                    ? 'text-amber-500'
                    : 'text-emerald-500'
                }`}
              >
                {baselineMetrics.totalSlippageDays > 0
                  ? `+${baselineMetrics.totalSlippageDays} Days`
                  : '0 Days (On Time)'}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">
                Drifted Tasks Count
              </div>
              <div className="text-lg font-mono font-extrabold text-slate-700 dark:text-slate-200">
                {baselineMetrics.driftedTasksCount} of {tasks.length}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <ClayButton
              variant="primary"
              size="sm"
              icon={<Lock className="w-3.5 h-3.5" />}
              onClick={lockBaseline}
            >
              {config.hasLockedBaseline ? 'Re-lock Current as Baseline' : 'Lock Baseline Now'}
            </ClayButton>

            {config.hasLockedBaseline && (
              <ClayButton
                variant="ghost"
                size="sm"
                icon={<Unlock className="w-3.5 h-3.5" />}
                onClick={clearBaseline}
              >
                Clear Baseline
              </ClayButton>
            )}
          </div>
        </ClayCard>

        {/* Card 4: Category & Tag Studio */}
        <ClayCard className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3">
            <Tag className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Category & Tag Studio
            </h2>
          </div>

          {/* Existing Categories */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {config.categories.map((cat: CategoryDef) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    style={{ backgroundColor: cat.color }}
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                  />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {cat.name}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveCategory(cat.id)}
                  disabled={config.categories.length <= 1}
                  className="text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Category Form */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
            <input
              type="color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
              title="Pick tag color"
            />
            <input
              type="text"
              placeholder="New category name..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              className="clay-input flex-1 px-3 py-1.5 rounded-xl text-xs text-slate-800 dark:text-slate-100"
            />
            <ClayButton size="sm" variant="default" onClick={handleAddCategory}>
              <Plus className="w-3.5 h-3.5" />
              Add
            </ClayButton>
          </div>
        </ClayCard>

      </div>

      {/* Card 5: Project Data Management & Danger Zone */}
      <ClayCard className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3">
          <Download className="w-4 h-4 text-emerald-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Data Portability & Project Lifecycle
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <ClayButton
              size="sm"
              variant="default"
              icon={<FileJson className="w-3.5 h-3.5 text-amber-500" />}
              onClick={() => exportProjectJSON(activeProject.id)}
            >
              Export JSON
            </ClayButton>

            <ClayButton
              size="sm"
              variant="default"
              icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />}
              onClick={() => exportProjectCSV(activeProject.id)}
            >
              Export CSV
            </ClayButton>

            <div className="h-5 w-px bg-slate-300/60 dark:bg-slate-700" />

            <ClayButton
              size="sm"
              variant="default"
              icon={<Upload className="w-3.5 h-3.5 text-sky-500" />}
              onClick={() => jsonInputRef.current?.click()}
            >
              Import JSON
            </ClayButton>

            <ClayButton
              size="sm"
              variant="default"
              icon={<Upload className="w-3.5 h-3.5 text-purple-500" />}
              onClick={() => csvInputRef.current?.click()}
            >
              Import CSV
            </ClayButton>
          </div>

          {/* Delete Action */}
          <div>
            <ClayButton
              size="sm"
              variant="danger"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={projects.length <= 1}
            >
              Delete Project
            </ClayButton>
          </div>
        </div>
      </ClayCard>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Project Deletion"
        description={`Are you sure you want to permanently delete "${activeProject.name}" (${activeProject.code})? All associated tasks and settings will be permanently lost.`}
      >
        <div className="flex justify-end gap-2 pt-4">
          <ClayButton variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </ClayButton>
          <ClayButton
            variant="danger"
            onClick={() => {
              deleteProject(activeProject.id);
              setIsDeleteModalOpen(false);
            }}
          >
            Yes, Delete Project
          </ClayButton>
        </div>
      </Modal>

      {/* Hidden File Inputs */}
      <input ref={jsonInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleJSONImport} />
      <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCSVImport} />

      {/* Toast */}
      {configToast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-semibold shadow-xl animate-in slide-in-from-bottom-2 duration-300 ${
          configToast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {configToast.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {configToast.msg}
        </div>
      )}
    </div>
  );
};
