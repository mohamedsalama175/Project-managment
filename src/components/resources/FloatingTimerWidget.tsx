import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  Send,
  X,
} from 'lucide-react';
import { resourcesApi } from '../../api/resources';
import { useProjectStore } from '../../stores/useProjectStore';
import { getTodayUTC } from '../../utils/dateUtils';
import { ClayButton } from '../common/ClayButton';

interface SavedTimerState {
  taskId: string;
  projectId: string;
  secondsElapsed: number;
  isRunning: boolean;
  lastTickTimestamp: number;
  notes: string;
  billable: boolean;
}

const STORAGE_KEY = 'deliverops_active_timer';

export const FloatingTimerWidget: React.FC = () => {
  const { projects } = useProjectStore();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [seconds, setSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [billable, setBillable] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const timerRef = useRef<number | null>(null);

  // Restore timer state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SavedTimerState = JSON.parse(saved);
        setSelectedProjectId(parsed.projectId || '');
        setSelectedTaskId(parsed.taskId || '');
        setNotes(parsed.notes || '');
        setBillable(parsed.billable || false);

        let initialSecs = parsed.secondsElapsed || 0;
        if (parsed.isRunning && parsed.lastTickTimestamp) {
          const deltaSecs = Math.floor((Date.now() - parsed.lastTickTimestamp) / 1000);
          initialSecs += Math.max(0, deltaSecs);
          setIsRunning(true);
        }
        setSeconds(initialSecs);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save state to localStorage whenever changed
  useEffect(() => {
    const state: SavedTimerState = {
      taskId: selectedTaskId,
      projectId: selectedProjectId,
      secondsElapsed: seconds,
      isRunning,
      lastTickTimestamp: Date.now(),
      notes,
      billable,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }, [selectedTaskId, selectedProjectId, seconds, isRunning, notes, billable]);

  // Interval timer tick
  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  // Format seconds as HH:MM:SS
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 15-minute rounded hours
  const calculatedHours = Math.max(0.25, Math.round((seconds / 3600) * 4) / 4);

  // Selected Task / Project metadata
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const availableTasks = selectedProject?.tasks || [];
  const selectedTask = availableTasks.find((t) => t.id === selectedTaskId);

  // Toggle play/pause
  const togglePlay = () => {
    setIsRunning((prev) => !prev);
  };

  // Reset timer
  const handleReset = () => {
    setIsRunning(false);
    setSeconds(0);
  };

  // Log Time
  const handleLogTime = async () => {
    if (!selectedTaskId) {
      setFeedback({ type: 'error', message: 'Please select a task to log time for.' });
      return;
    }
    if (seconds < 60) {
      setFeedback({ type: 'error', message: 'Please log at least 1 minute.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await resourcesApi.createTimeEntry(selectedTaskId, {
        date: getTodayUTC(),
        hours: calculatedHours,
        description: notes || undefined,
        billable,
      });

      setFeedback({
        type: 'success',
        message: `Logged ${calculatedHours}h to "${selectedTask?.name}".`,
      });
      handleReset();
      setNotes('');
      setTimeout(() => {
        setFeedback(null);
        setIsExpanded(false);
      }, 3000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to log time entry.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 select-none animate-in fade-in slide-in-from-bottom-4">
      {/* Expanded Card */}
      {isExpanded ? (
        <div className="w-84 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-xl ${isRunning ? 'bg-emerald-500/10 text-emerald-600 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">Quick Time Tracker</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Timer Display */}
          <div className="flex flex-col items-center justify-center py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <span className="font-mono text-3xl font-black text-slate-900 dark:text-white tracking-wider">
              {formatTime(seconds)}
            </span>
            <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
              ≈ {calculatedHours.toFixed(2)}h (15-min rounded)
            </div>
          </div>

          {/* Controls: Play, Pause, Reset */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={togglePlay}
              className={`p-3 rounded-2xl font-bold flex items-center justify-center transition-all shadow-sm ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
              title={isRunning ? 'Pause' : 'Start'}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              onClick={handleReset}
              className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold transition-all"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Project & Task Selectors */}
          <div className="space-y-2">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setSelectedTaskId('');
                }}
                className="w-full text-xs p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 mt-1"
              >
                <option value="">-- Select Project --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Task
              </label>
              <select
                value={selectedTaskId}
                disabled={!selectedProjectId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full text-xs p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 mt-1"
              >
                <option value="">-- Select Task --</option>
                {availableTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes & Billable */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="What are you working on?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="floating_timer_billable"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <label
                htmlFor="floating_timer_billable"
                className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 cursor-pointer flex items-center gap-1"
              >
                <DollarSign className="w-3 h-3 text-blue-500" />
                Billable Time
              </label>
            </div>
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Submit Button */}
          <ClayButton
            variant="primary"
            size="sm"
            onClick={handleLogTime}
            disabled={isSubmitting || seconds === 0 || !selectedTaskId}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-bold"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Log {calculatedHours.toFixed(2)}h to Task
          </ClayButton>
        </div>
      ) : (
        /* Collapsed Floating Pill */
        <button
          onClick={() => setIsExpanded(true)}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-full backdrop-blur-2xl border shadow-xl transition-all transform hover:scale-105 ${
            isRunning
              ? 'bg-emerald-600/90 text-white border-emerald-400/40 shadow-emerald-500/20 ring-2 ring-emerald-500/30'
              : 'bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-white animate-ping' : 'bg-emerald-500'}`} />
            <Clock className="w-4 h-4" />
          </div>

          <span className="font-mono text-xs font-black tracking-wider">
            {formatTime(seconds)}
          </span>

          {selectedTask && (
            <span className="text-[11px] font-semibold opacity-90 max-w-[120px] truncate border-l border-current/20 pl-2">
              {selectedTask.name}
            </span>
          )}

          <ChevronUp className="w-3.5 h-3.5 opacity-60" />
        </button>
      )}
    </div>
  );
};
