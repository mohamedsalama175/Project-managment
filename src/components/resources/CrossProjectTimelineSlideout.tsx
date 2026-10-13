import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Briefcase,
  Layers,
} from 'lucide-react';
import { resourcesApi, UserAllocation } from '../../api/resources';

interface CrossProjectTimelineSlideoutProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export const CrossProjectTimelineSlideout: React.FC<CrossProjectTimelineSlideoutProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
}) => {
  const [allocations, setAllocations] = useState<UserAllocation[]>([]);
  const [weeklyCapacity, setWeeklyCapacity] = useState<number>(40);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      setIsLoading(true);
      setError(null);
      resourcesApi
        .getUserAllocations(userId)
        .then((res) => {
          setAllocations(res.allocations || []);
          if (res.user?.weekly_capacity_hours) {
            setWeeklyCapacity(res.user.weekly_capacity_hours);
          }
        })
        .catch((err: any) => {
          setError(err?.message || 'Failed to load user allocations.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const totalEstimatedHours = allocations.reduce((acc, a) => acc + (a.estimated_hours || 0), 0);
  const uniqueProjects = Array.from(new Set(allocations.map((a) => a.project_name)));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
          {/* Slideout Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Cross-Project Allocations
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {userName} · {weeklyCapacity}h/wk target capacity
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

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-3 gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-xs">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Tasks</div>
              <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                {allocations.length}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Projects</div>
              <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                {uniqueProjects.length}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Est. Hours</div>
              <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {totalEstimatedHours}h
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="w-7 h-7 text-emerald-500 animate-spin mb-2" />
                <p className="text-xs text-slate-500 font-medium">Aggregating cross-project tasks...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : allocations.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Briefcase className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs">No active task allocations found for this resource.</p>
              </div>
            ) : (
              allocations.map((alloc) => (
                <div
                  key={alloc.task_id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-emerald-500/40 transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {alloc.project_code}
                        </span>
                        <span className="text-xs text-slate-400 font-medium truncate max-w-[200px]">
                          {alloc.project_name}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                        {alloc.task_name}
                      </h4>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                      {alloc.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{alloc.start_date} → {alloc.end_date}</span>
                    </div>

                    <div className="flex items-center gap-2 font-semibold">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {alloc.daily_allocated_hours}h / day
                      </span>
                      <span className="text-slate-400 font-normal">
                        ({alloc.estimated_hours}h total)
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Close Drawer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
