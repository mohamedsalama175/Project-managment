import React from 'react';
import { Task } from '../../types';
import { diffCalendarDays, parseDateUTC } from '../../utils/dateUtils';

interface BaselineBarProps {
  task: Task;
  timelineStart: Date;
  dayWidth: number;
}

export const BaselineBar: React.FC<BaselineBarProps> = ({
  task,
  timelineStart,
  dayWidth,
}) => {
  if (!task.baselineStart || !task.baselineEnd) return null;

  const startDiff = diffCalendarDays(
    timelineStart.toISOString().slice(0, 10),
    task.baselineStart
  );
  const duration = Math.max(
    1,
    diffCalendarDays(task.baselineStart, task.baselineEnd) + 1
  );

  const left = startDiff * dayWidth;
  const width = task.isMilestone ? 18 : duration * dayWidth;

  const drift = diffCalendarDays(task.baselineEnd, task.end);
  const driftColor =
    drift > 0
      ? 'border-amber-400 bg-amber-400/20 text-amber-600 dark:text-amber-300'
      : drift < 0
      ? 'border-emerald-400 bg-emerald-400/20 text-emerald-600 dark:text-emerald-300'
      : 'border-slate-400 bg-slate-400/20 text-slate-500';

  return (
    <div
      style={{
        left: `${left}px`,
        width: `${width}px`,
        top: '32px',
        height: '5px',
      }}
      title={`Baseline: ${task.baselineStart} to ${task.baselineEnd} (${
        drift > 0 ? `+${drift}d delayed` : drift < 0 ? `${drift}d earlier` : 'On track'
      })`}
      className={`absolute rounded-full border border-dashed opacity-80 pointer-events-none transition-all ${driftColor}`}
    />
  );
};
