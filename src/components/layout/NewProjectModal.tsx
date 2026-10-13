import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ClayInput } from '../common/ClayInput';
import { ClayButton } from '../common/ClayButton';
import { useProjectStore } from '../../stores/useProjectStore';
import { DurationMode } from '../../types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose }) => {
  const { createProject } = useProjectStore();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [weekendPreset, setWeekendPreset] = useState<'mena' | 'western'>('mena');
  const [durationMode, setDurationMode] = useState<DurationMode>('working_days');
  const [targetLaunchDate, setTargetLaunchDate] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    const projectCode = code.trim().toUpperCase() || name.substring(0, 4).toUpperCase();
    const weekendDays = weekendPreset === 'mena' ? [5, 6] : [0, 6];

    createProject({
      name: name.trim(),
      code: projectCode,
      description: description.trim(),
      config: {
        weekendDays,
        durationMode,
        targetLaunchDate: targetLaunchDate || undefined,
        highlightCriticalPath: true,
        hasLockedBaseline: false,
        categories: [
          { id: 'cat-1', name: 'General', color: '#1f8a70' },
          { id: 'cat-2', name: 'Engineering', color: '#3b82f6' },
          { id: 'cat-3', name: 'Operations', color: '#f59e0b' },
        ],
      },
      clientName: null,
      projectType: 'unclassified',
      projectManagerId: null,
      isArchived: false,
      archivedAt: null,
      tasks: [
        {
          id: `task-${Date.now().toString(36)}-1`,
          projectId: '',
          parentId: null,
          name: 'Project Kickoff & Requirements Alignment',
          category: 'General',
          priority: 'High',
          assignee: 'Lead Architect',
          primaryOwnerId: null,
          primaryOwnerHours: null,
          contributorAllocations: [],
          reviewerId: null,
          reviewStatus: 'none',
          estimatedHours: null,
          loggedHours: 0,
          start: new Date().toISOString().slice(0, 10),
          end: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
          pct: 0,
          isMilestone: false,
          dependsOn: [],
          status: 'Not Started',
          order: 1,
        },
      ],
    });

    // Reset and close
    setName('');
    setCode('');
    setDescription('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Project"
      description="Initialize a new isolated project scope with custom calendar rules and working day logic."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ClayInput
          label="Project Name *"
          placeholder="e.g., Supply Chain Automation"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!code) {
              setCode(e.target.value.slice(0, 5).toUpperCase());
            }
            if (error) setError('');
          }}
          error={error}
        />

        <div className="grid grid-cols-2 gap-3">
          <ClayInput
            label="Project Code"
            placeholder="e.g. SCA-01"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            helperText="Short alphanumeric code"
          />

          <ClayInput
            label="Target Delivery Date"
            type="date"
            value={targetLaunchDate}
            onChange={(e) => setTargetLaunchDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Description
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="High-level project scope and goals..."
            className="clay-input px-3.5 py-2 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* Working Calendar Configuration */}
        <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Working Calendar & Rest Days
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setWeekendPreset('mena')}
              className={`p-2.5 rounded-xl text-left border transition-all ${
                weekendPreset === 'mena'
                  ? 'clay-card !p-2.5 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold'
                  : 'bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="text-xs font-bold">Fri & Sat (MENA)</div>
              <div className="text-[11px] opacity-75">Regional rest days</div>
            </button>

            <button
              type="button"
              onClick={() => setWeekendPreset('western')}
              className={`p-2.5 rounded-xl text-left border transition-all ${
                weekendPreset === 'western'
                  ? 'clay-card !p-2.5 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold'
                  : 'bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="text-xs font-bold">Sat & Sun (Standard)</div>
              <div className="text-[11px] opacity-75">Western business week</div>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Duration Math Mode:
            </span>
            <div className="inline-flex rounded-xl p-0.5 bg-slate-200/80 dark:bg-slate-900/60">
              <button
                type="button"
                onClick={() => setDurationMode('working_days')}
                className={`px-2 py-1 text-xs rounded-lg font-medium transition-all ${
                  durationMode === 'working_days'
                    ? 'clay-card !p-1 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                Working Days
              </button>
              <button
                type="button"
                onClick={() => setDurationMode('calendar')}
                className={`px-2 py-1 text-xs rounded-lg font-medium transition-all ${
                  durationMode === 'calendar'
                    ? 'clay-card !p-1 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                Calendar Days
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <ClayButton type="button" variant="ghost" onClick={onClose}>
            Cancel
          </ClayButton>
          <ClayButton type="submit" variant="primary">
            Create Project
          </ClayButton>
        </div>
      </form>
    </Modal>
  );
};
