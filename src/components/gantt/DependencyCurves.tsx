import React from 'react';
import { Task } from '../../types';
import { diffCalendarDays } from '../../utils/dateUtils';

interface DependencyCurvesProps {
  tasks: Task[];
  timelineStart: Date;
  dayWidth: number;
  rowHeight: number;
  criticalTaskIds: Set<string>;
  highlightCritical: boolean;
}

export const DependencyCurves: React.FC<DependencyCurvesProps> = ({
  tasks,
  timelineStart,
  dayWidth,
  rowHeight,
  criticalTaskIds,
  highlightCritical,
}) => {
  const taskIndexMap = new Map<string, number>();
  const taskMap = new Map<string, Task>();

  tasks.forEach((t, idx) => {
    taskIndexMap.set(t.id, idx);
    taskMap.set(t.id, t);
  });

  const timelineStartStr = timelineStart.toISOString().slice(0, 10);
  const barCenterYOffset = 18; // 5px top + 13px (half of 26px bar height)

  const curves: {
    key: string;
    path: string;
    isCritical: boolean;
  }[] = [];

  tasks.forEach((succ, succIdx) => {
    if (!succ.dependsOn || succ.dependsOn.length === 0) return;

    succ.dependsOn.forEach((predId) => {
      const pred = taskMap.get(predId);
      const predIdx = taskIndexMap.get(predId);
      if (!pred || predIdx === undefined) return;

      // Pred finish X: right edge of predecessor bar
      const predStartDiff = diffCalendarDays(timelineStartStr, pred.start);
      const predDuration = Math.max(1, diffCalendarDays(pred.start, pred.end) + 1);
      const x1 = pred.isMilestone
        ? predStartDiff * dayWidth + dayWidth / 2 + 10
        : (predStartDiff + predDuration) * dayWidth;

      // Succ start X: left edge of successor bar
      const succStartDiff = diffCalendarDays(timelineStartStr, succ.start);
      const x2 = succ.isMilestone
        ? succStartDiff * dayWidth + dayWidth / 2 - 10
        : succStartDiff * dayWidth;

      // Y positions: center of each bar
      const y1 = predIdx * rowHeight + barCenterYOffset;
      const y2 = succIdx * rowHeight + barCenterYOffset;

      const isCritical =
        highlightCritical &&
        criticalTaskIds.has(pred.id) &&
        criticalTaskIds.has(succ.id);

      const dx = x2 - x1;
      const dy = y2 - y1;
      const goingDown = dy >= 0;

      let path = '';

      if (dx >= 16) {
        // Forward flow with comfortable gap:
        // Horizontal from x1 -> turn down/up at midX -> turn horizontal into x2
        const midX = x1 + dx / 2;
        const r = Math.min(5, Math.abs(dy) / 2, dx / 4);

        if (Math.abs(dy) < 2) {
          // Same row (direct horizontal line)
          path = `M ${x1} ${y1} L ${x2} ${y2}`;
        } else if (goingDown) {
          path = [
            `M ${x1} ${y1}`,
            `L ${midX - r} ${y1}`,
            `Q ${midX} ${y1} ${midX} ${y1 + r}`,
            `L ${midX} ${y2 - r}`,
            `Q ${midX} ${y2} ${midX + r} ${y2}`,
            `L ${x2} ${y2}`,
          ].join(' ');
        } else {
          path = [
            `M ${x1} ${y1}`,
            `L ${midX - r} ${y1}`,
            `Q ${midX} ${y1} ${midX} ${y1 - r}`,
            `L ${midX} ${y2 + r}`,
            `Q ${midX} ${y2} ${midX + r} ${y2}`,
            `L ${x2} ${y2}`,
          ].join(' ');
        }
      } else {
        // Backward or tight/overlapping flow:
        // Step out 10px right from pred, route via horizontal gutter between rows, then step in 10px left to succ
        const stub = 10;
        const r = 4;
        const gutterY = goingDown
          ? y1 + rowHeight / 2
          : y1 - rowHeight / 2;

        if (goingDown) {
          path = [
            `M ${x1} ${y1}`,
            `L ${x1 + stub - r} ${y1}`,
            `Q ${x1 + stub} ${y1} ${x1 + stub} ${y1 + r}`,
            `L ${x1 + stub} ${gutterY - r}`,
            `Q ${x1 + stub} ${gutterY} ${x1 + stub - r} ${gutterY}`,
            `L ${x2 - stub + r} ${gutterY}`,
            `Q ${x2 - stub} ${gutterY} ${x2 - stub} ${gutterY + r}`,
            `L ${x2 - stub} ${y2 - r}`,
            `Q ${x2 - stub} ${y2} ${x2 - stub + r} ${y2}`,
            `L ${x2} ${y2}`,
          ].join(' ');
        } else {
          path = [
            `M ${x1} ${y1}`,
            `L ${x1 + stub - r} ${y1}`,
            `Q ${x1 + stub} ${y1} ${x1 + stub} ${y1 - r}`,
            `L ${x1 + stub} ${gutterY + r}`,
            `Q ${x1 + stub} ${gutterY} ${x1 + stub - r} ${gutterY}`,
            `L ${x2 - stub + r} ${gutterY}`,
            `Q ${x2 - stub} ${gutterY} ${x2 - stub} ${gutterY - r}`,
            `L ${x2 - stub} ${y2 + r}`,
            `Q ${x2 - stub} ${y2} ${x2 - stub + r} ${y2}`,
            `L ${x2} ${y2}`,
          ].join(' ');
        }
      }

      curves.push({
        key: `${predId}->${succ.id}`,
        path,
        isCritical,
      });
    });
  });

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10 overflow-visible"
      style={{ width: '100%', height: `${tasks.length * rowHeight}px` }}
    >
      <defs>
        {/* Normal arrow marker */}
        <marker
          id="arrowhead-default"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0.5, 6 3, 0 5.5"
            className="fill-slate-400 dark:fill-slate-500"
          />
        </marker>

        {/* Critical arrow marker */}
        <marker
          id="arrowhead-critical"
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0.5, 7 3.5, 0 6.5" fill="#ef4444" />
        </marker>
      </defs>

      {curves.map((curve) => (
        <path
          key={curve.key}
          d={curve.path}
          fill="none"
          stroke={curve.isCritical ? '#ef4444' : '#94a3b8'}
          strokeWidth={curve.isCritical ? 2.2 : 1.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={curve.isCritical ? 1 : 0.75}
          markerEnd={
            curve.isCritical
              ? 'url(#arrowhead-critical)'
              : 'url(#arrowhead-default)'
          }
          className={curve.isCritical ? 'animate-pulse' : ''}
        />
      ))}
    </svg>
  );
};
