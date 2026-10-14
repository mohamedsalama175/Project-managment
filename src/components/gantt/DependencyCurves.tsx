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
  hoveredTaskId?: string | null;
  hoveredPredId?: string | null;
}

export const DependencyCurves: React.FC<DependencyCurvesProps> = ({
  tasks,
  timelineStart,
  dayWidth,
  rowHeight = 40,
  criticalTaskIds,
  highlightCritical,
  hoveredTaskId,
  hoveredPredId,
}) => {
  const taskIndexMap = new Map<string, number>();
  const taskMap = new Map<string, Task>();

  tasks.forEach((t, idx) => {
    taskIndexMap.set(t.id, idx);
    taskMap.set(t.id, t);
  });

  const timelineStartStr = timelineStart.toISOString().slice(0, 10);
  const barCenterYOffset = rowHeight / 2; // Exact center of 40px row = 20px

  const curves: {
    key: string;
    path: string;
    isCritical: boolean;
    isHighlighted: boolean;
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
        ? predStartDiff * dayWidth + 24
        : (predStartDiff + predDuration) * dayWidth;

      // Succ start X: left edge of successor bar
      const succStartDiff = diffCalendarDays(timelineStartStr, succ.start);
      const x2 = succ.isMilestone
        ? succStartDiff * dayWidth
        : succStartDiff * dayWidth;

      // Y positions: center of each row
      const y1 = predIdx * rowHeight + barCenterYOffset;
      const y2 = succIdx * rowHeight + barCenterYOffset;

      const isCritical =
        highlightCritical &&
        criticalTaskIds.has(pred.id) &&
        criticalTaskIds.has(succ.id);

      const isHighlighted =
        hoveredTaskId === pred.id ||
        hoveredTaskId === succ.id ||
        hoveredPredId === pred.id ||
        hoveredPredId === succ.id;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const goingDown = dy >= 0;

      let path = '';

      if (dx >= 16) {
        // Forward orthogonal flow with clean curve
        const midX = x1 + dx / 2;
        const r = Math.min(6, Math.abs(dy) / 2, dx / 4);

        if (Math.abs(dy) < 2) {
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
        // Backward or tight/overlapping flow: step out 12px right, route via gutter
        const stub = 12;
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
        isHighlighted,
      });
    });
  });

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10 overflow-visible"
      style={{ width: '100%', height: `${tasks.length * rowHeight}px` }}
    >
      <defs>
        {/* Default slate arrow marker */}
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
            fill="#94a3b8"
          />
        </marker>

        {/* Hovered / Active Emerald arrow marker */}
        <marker
          id="arrowhead-hover"
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0.5, 7 3.5, 0 6.5" fill="#059669" />
        </marker>

        {/* Critical Red arrow marker */}
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

      {curves.map((curve) => {
        const strokeColor = curve.isHighlighted
          ? '#059669'
          : curve.isCritical
          ? '#ef4444'
          : '#94a3b8';

        const strokeWidth = curve.isHighlighted ? 2.5 : curve.isCritical ? 2 : 1.5;
        const marker = curve.isHighlighted
          ? 'url(#arrowhead-hover)'
          : curve.isCritical
          ? 'url(#arrowhead-critical)'
          : 'url(#arrowhead-default)';

        return (
          <path
            key={curve.key}
            d={curve.path}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={curve.isHighlighted ? 1 : curve.isCritical ? 0.95 : 0.8}
            markerEnd={marker}
            className={`transition-colors duration-150 ${curve.isCritical ? 'animate-pulse' : ''}`}
          />
        );
      })}
    </svg>
  );
};
