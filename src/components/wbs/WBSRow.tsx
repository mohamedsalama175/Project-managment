import React, { useState } from 'react';
import {
  GripVertical,
  Trash2,
  Diamond,
  Calendar,
  Link2,
  SlidersHorizontal,
} from 'lucide-react';

import { Task, TaskStatus, TaskPriority, CategoryDef, DurationMode } from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';
import { calculateDuration } from '../../utils/dateUtils';
import { AssigneeCombobox } from '../team/AssigneeCombobox';

interface WBSRowProps {
  task: Task;
  index: number;
  rowHeight: number;
  categories: CategoryDef[];
  allTasks: Task[];
  durationMode: DurationMode;
  weekendDays: number[];
  isCritical: boolean;
  isSorted?: boolean;
  onDragStart?: (e: React.DragEvent, index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDrop?: (e: React.DragEvent, index: number) => void;
  onOpenDetails?: (task: Task) => void;
}

export const WBSRow: React.FC<WBSRowProps> = ({
  task,
  index,
  rowHeight,
  categories,
  allTasks,
  durationMode,
  weekendDays,
  isCritical,
  isSorted = false,
  onDragStart,
  onDragOver,
  onDrop,
  onOpenDetails,
}) => {
  const { updateTask, deleteTask, teamMembers, reassignTask } = useProjectStore();
  const [isPredOpen, setIsPredOpen] = useState(false);

  const duration = calculateDuration(task.start, task.end, durationMode, weekendDays);

  const statusColors: Record<TaskStatus, string> = {
    'Not Started': 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    'In Progress': 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    'Blocked': 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800',
    'In Review': 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    'Completed': 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
  };

  const priorityColors: Record<TaskPriority, string> = {
    Low: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    Medium: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    High: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    Urgent: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold',
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    const updates: Partial<Task> = { status: newStatus };
    if (newStatus === 'Completed') updates.pct = 100;
    else if (newStatus === 'Not Started') updates.pct = 0;
    else if (task.pct === 0 && newStatus === 'In Progress') updates.pct = 25;
    updateTask(task.id, updates);
  };

  const togglePredecessor = (predId: string) => {
    const current = task.dependsOn || [];
    const next = current.includes(predId)
      ? current.filter((id) => id !== predId)
      : [...current, predId];
    updateTask(task.id, { dependsOn: next });
  };

  return (
    <div
      draggable={!isSorted}
      onDragStart={(e) => !isSorted && onDragStart && onDragStart(e, index)}
      onDragOver={(e) => !isSorted && onDragOver && onDragOver(e, index)}
      onDrop={(e) => !isSorted && onDrop && onDrop(e, index)}
      style={{ height: `${rowHeight}px` }}
      className={`flex items-center text-xs border-b border-slate-200/60 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#151c24]/90 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group ${
        isCritical ? 'border-l-2 border-l-amber-500' : ''
      }`}
    >
      {/* Drag Grip Handle */}
      <div
        title={isSorted ? 'Sorting is active. Clear sort to drag and reorder tasks.' : 'Drag to reorder row'}
        className={`w-7 flex items-center justify-center ${
          isSorted
            ? 'cursor-not-allowed opacity-30 text-slate-400'
            : 'cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
        }`}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Index Number */}
      <div
        title={`Task #${task.order ?? index + 1}`}
        className="w-9 text-center font-mono font-bold text-slate-400 dark:text-slate-500"
      >
        {task.order ?? index + 1}
      </div>

      {/* Task Name (Inline Editable) */}
      <div className="flex-1 min-w-[170px] px-2 flex items-center gap-1.5">
        <input
          type="text"
          value={task.name}
          onChange={(e) => updateTask(task.id, { name: e.target.value })}
          placeholder="Task name..."
          aria-label="Task name"
          className="w-full bg-transparent px-2 py-1 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
        />
        {task.isMilestone && (
          <span title="Milestone">
            <Diamond className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          </span>
        )}
      </div>

      {/* Category Dropdown */}
      <div className="w-32 px-1.5">
        <select
          value={task.category}
          onChange={(e) => updateTask(task.id, { category: e.target.value })}
          aria-label="Category"
          className="w-full text-[11px] font-semibold py-1 px-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Priority Pill Dropdown */}
      <div className="w-24 px-1.5">
        <select
          value={task.priority || 'Medium'}
          onChange={(e) => updateTask(task.id, { priority: e.target.value as TaskPriority })}
          aria-label="Priority"
          className={`w-full text-[10px] font-bold py-1 px-1.5 rounded-full border border-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer text-center ${
            priorityColors[task.priority || 'Medium']
          }`}
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </select>
      </div>

      {/* Primary Owner & Contributors (AssigneeCombobox) */}
      <div className="w-44 px-1 flex items-center">
        <AssigneeCombobox
          primaryOwnerId={task.primaryOwnerId}
          primaryOwnerHours={task.primaryOwnerHours}
          contributorAllocations={task.contributorAllocations || []}
          estimatedHours={task.estimatedHours}
          legacyAssignee={task.assignee}
          assigneeUnresolved={task.assigneeUnresolved}
          teamMembers={teamMembers}
          onAssignChange={(newOwnerId, newOwnerHours, newContributors) => {
            if (newOwnerId !== task.primaryOwnerId) {
              reassignTask(task.id, newOwnerId);
            }
            updateTask(task.id, {
              primaryOwnerId: newOwnerId,
              primaryOwnerHours: newOwnerHours,
              contributorAllocations: newContributors,
            });
          }}
        />
      </div>

      {/* Start Date */}
      <div className="w-28 px-1">
        <input
          type="date"
          value={task.start}
          onChange={(e) => {
            const newStart = e.target.value;
            const updates: Partial<Task> = { start: newStart };
            if (task.end < newStart) updates.end = newStart;
            updateTask(task.id, updates);
          }}
          aria-label="Start date"
          className="w-full text-[11px] font-mono py-0.5 px-1 rounded-lg bg-transparent hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
        />
      </div>

      {/* End Date */}
      <div className="w-28 px-1">
        <input
          type="date"
          value={task.end}
          onChange={(e) => {
            const newEnd = e.target.value;
            const updates: Partial<Task> = { end: newEnd };
            if (task.start > newEnd) updates.start = newEnd;
            updateTask(task.id, updates);
          }}
          aria-label="End date"
          className="w-full text-[11px] font-mono py-0.5 px-1 rounded-lg bg-transparent hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
        />
      </div>

      {/* Duration */}
      <div className="w-14 text-center text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
        {task.isMilestone ? '0d' : `${duration}d`}
      </div>

      {/* Effort (Hours) - Option B preserves unestimated */}
      <div className="w-16 px-1 flex items-center justify-center gap-0.5">
        <input
          type="number"
          min={0}
          value={task.estimatedHours ?? ''}
          placeholder="—"
          title={task.estimatedHours == null ? 'Unestimated task' : `${task.estimatedHours}h estimated effort`}
          onChange={(e) => {
            const val = e.target.value === '' ? null : Math.max(0, Number(e.target.value));
            updateTask(task.id, { estimatedHours: val });
          }}
          className={`w-11 text-center text-[11px] font-mono py-0.5 px-0.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
            task.estimatedHours == null
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold placeholder:text-amber-400'
              : 'bg-transparent border-transparent hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        />
        <span className="text-[10px] text-slate-400 font-mono">h</span>
      </div>

      {/* Progress % */}
      <div className="w-16 px-1 flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={100}
          value={task.pct}
          onChange={(e) => {
            const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
            updateTask(task.id, {
              pct: val,
              status: val === 100 ? 'Completed' : val > 0 ? 'In Progress' : 'Not Started',
            });
          }}
          aria-label="Percent complete"
          className="w-12 text-center text-[11px] font-mono py-0.5 px-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <span className="text-[10px] text-slate-400">%</span>
      </div>

      {/* Status Pill */}
      <div className="w-28 px-1.5">
        <select
          value={task.status}
          onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
          aria-label="Status"
          className={`w-full text-[10px] font-bold py-1 px-1.5 rounded-full border border-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer text-center ${
            statusColors[task.status]
          }`}
        >
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          <option value="In Review">In Review</option>
          <option value="Blocked">Blocked</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Predecessors Picker */}
      <div className="w-20 px-1 relative">
        <button
          type="button"
          onClick={() => setIsPredOpen(!isPredOpen)}
          title="Select predecessors"
          className="w-full flex items-center justify-center gap-1 py-1 px-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200/60 dark:border-slate-700"
        >
          <Link2 className="w-3 h-3" />
          <span>{task.dependsOn?.length || 0}</span>
        </button>

        {isPredOpen && (
          <div className="absolute right-0 top-8 w-56 p-2 rounded-xl clay-card z-50 shadow-xl border border-slate-300 dark:border-slate-700">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">
              Select Predecessors
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {allTasks
                .filter((t) => t.id !== task.id)
                .map((t, idx) => {
                  const isChecked = task.dependsOn?.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 p-1 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePredecessor(t.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                      />
                      <span className="truncate text-[11px] text-slate-700 dark:text-slate-300">
                        #{t.order ?? (idx + 1)} {t.name}
                      </span>
                    </label>
                  );
                })}
            </div>
            <button
              onClick={() => setIsPredOpen(false)}
              className="mt-2 w-full text-center py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* Row Actions: Details drawer, Milestone toggle & Delete */}
      <div className="w-16 px-1 flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => onOpenDetails?.(task)}
          title="Open task details drawer & comments"
          className="p-1 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => updateTask(task.id, { isMilestone: !task.isMilestone })}
          title={task.isMilestone ? 'Convert to normal task' : 'Set as milestone'}
          className={`p-1 rounded-lg transition-colors ${
            task.isMilestone
              ? 'text-amber-500 bg-amber-500/10'
              : 'text-slate-400 hover:text-amber-500'
          }`}
        >
          <Diamond className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => deleteTask(task.id)}
          title="Delete task"
          className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
