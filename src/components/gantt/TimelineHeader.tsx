import React from 'react';
import { MONTH_NAMES, isWeekendDay } from '../../utils/dateUtils';

interface TimelineHeaderProps {
  timelineStart: Date;
  totalDays: number;
  dayWidth: number;
  weekendDays: number[];
  todayStr: string;
}

const WEEKDAY_SINGLE: Record<number, string> = {
  0: 'S',
  1: 'M',
  2: 'T',
  3: 'W',
  4: 'T',
  5: 'F',
  6: 'S',
};

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  timelineStart,
  totalDays,
  dayWidth,
  weekendDays,
  todayStr,
}) => {
  interface MonthGroup {
    label: string;
    daysCount: number;
    startDayIndex: number;
  }

  const monthGroups: MonthGroup[] = [];
  const days: { date: Date; dateStr: string; isWk: boolean; isToday: boolean; dayIndex: number }[] = [];

  let currentMonthKey = -1;
  let currentGroup: MonthGroup | null = null;

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(timelineStart.getTime() + i * 86400000);
    const mKey = d.getUTCFullYear() * 12 + d.getUTCMonth();
    const isWk = isWeekendDay(d, weekendDays);
    const dateStr = d.toISOString().slice(0, 10);
    const isToday = dateStr === todayStr;

    days.push({ date: d, dateStr, isWk, isToday, dayIndex: i });

    if (mKey !== currentMonthKey) {
      if (currentGroup) {
        monthGroups.push(currentGroup);
      }
      currentMonthKey = mKey;
      currentGroup = {
        label: `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
        daysCount: 1,
        startDayIndex: i,
      };
    } else if (currentGroup) {
      currentGroup.daysCount++;
    }
  }
  if (currentGroup) {
    monthGroups.push(currentGroup);
  }

  const todayItem = days.find((d) => d.isToday);

  return (
    <div className="sticky top-0 z-30 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 select-none">
      {/* Top Tier (h-6, 24px): Month & Year with sticky left positioning */}
      <div className="flex h-6 items-center border-b border-slate-200/80 dark:border-slate-800/80">
        {monthGroups.map((mg, idx) => {
          const widthPx = mg.daysCount * dayWidth;
          const showLabel = widthPx >= 60;
          return (
            <div
              key={idx}
              style={{ width: `${widthPx}px` }}
              className="h-full px-2 flex items-center border-r border-slate-200/60 dark:border-slate-800/60 overflow-hidden whitespace-nowrap text-left"
            >
              {showLabel && (
                <span className="sticky left-2 text-[11px] font-bold text-slate-700 dark:text-slate-200 tracking-tight">
                  {mg.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Tier (h-6, 24px): Day number + single-letter weekday (12 M, 13 T, 14 W) */}
      <div className="flex h-6 items-center relative">
        {days.map((item) => {
          const dayNum = item.date.getUTCDate();
          const singleWeekday = WEEKDAY_SINGLE[item.date.getUTCDay()];

          return (
            <div
              key={item.dayIndex}
              style={{ width: `${dayWidth}px` }}
              className={`h-full flex items-center justify-center gap-0.5 text-[10px] border-r border-slate-200/50 dark:border-slate-800/50 tabular-nums ${
                item.isWk
                  ? 'bg-slate-100/60 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500'
                  : 'text-slate-600 dark:text-slate-300'
              } ${item.isToday ? 'bg-rose-500/10 font-bold text-rose-600 dark:text-rose-400' : ''}`}
            >
              <span className={`font-mono ${item.isToday ? 'font-bold text-rose-600' : ''}`}>
                {dayNum}
              </span>
              <span className="text-[9px] font-medium opacity-60">
                {singleWeekday}
              </span>
            </div>
          );
        })}

        {/* High-visibility Today Pill Badge in timeline header */}
        {todayItem && (
          <div
            style={{
              left: `${todayItem.dayIndex * dayWidth + dayWidth / 2}px`,
              transform: 'translateX(-50%)',
            }}
            className="absolute top-0.5 z-40 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold shadow-xs whitespace-nowrap pointer-events-none flex items-center gap-1"
          >
            <span>Today · {todayItem.date.getUTCDate()} {MONTH_NAMES[todayItem.date.getUTCMonth()].slice(0, 3)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
