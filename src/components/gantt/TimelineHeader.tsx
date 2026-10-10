import React from 'react';
import { MONTH_NAMES, DAY_NAMES, isWeekendDay } from '../../utils/dateUtils';

interface TimelineHeaderProps {
  timelineStart: Date;
  totalDays: number;
  dayWidth: number;
  weekendDays: number[];
  todayStr: string;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  timelineStart,
  totalDays,
  dayWidth,
  weekendDays,
  todayStr,
}) => {
  // Group days into months
  interface MonthGroup {
    label: string;
    daysCount: number;
  }

  const monthGroups: MonthGroup[] = [];
  const days: { date: Date; dateStr: string; isWk: boolean; isToday: boolean }[] = [];

  let currentMonthKey = -1;
  let currentGroup: MonthGroup | null = null;

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(timelineStart.getTime() + i * 86400000);
    const mKey = d.getUTCFullYear() * 12 + d.getUTCMonth();
    const isWk = isWeekendDay(d, weekendDays);
    const dateStr = d.toISOString().slice(0, 10);
    const isToday = dateStr === todayStr;

    days.push({ date: d, dateStr, isWk, isToday });

    if (mKey !== currentMonthKey) {
      if (currentGroup) {
        monthGroups.push(currentGroup);
      }
      currentMonthKey = mKey;
      currentGroup = {
        label: `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
        daysCount: 1,
      };
    } else if (currentGroup) {
      currentGroup.daysCount++;
    }
  }
  if (currentGroup) {
    monthGroups.push(currentGroup);
  }

  return (
    <div className="sticky top-0 z-20 bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200/80 dark:border-slate-800">
      {/* Tier 1: Months */}
      <div className="flex h-8 items-center border-b border-slate-200/60 dark:border-slate-800">
        {monthGroups.map((mg, idx) => (
          <div
            key={idx}
            style={{ width: `${mg.daysCount * dayWidth}px` }}
            className="h-full px-3 flex items-center text-xs font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200/60 dark:border-slate-800 overflow-hidden whitespace-nowrap text-left"
          >
            {mg.label}
          </div>
        ))}
      </div>

      {/* Tier 2: Days */}
      <div className="flex h-9 items-center">
        {days.map((item, idx) => {
          const dayNum = item.date.getUTCDate();
          const dayShort = DAY_NAMES[item.date.getUTCDay()];
          return (
            <div
              key={idx}
              style={{ width: `${dayWidth}px` }}
              className={`h-full flex flex-col items-center justify-center text-[11px] border-r border-slate-200/50 dark:border-slate-800/60 select-none ${
                item.isWk
                  ? 'bg-slate-200/40 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500'
                  : 'text-slate-600 dark:text-slate-400'
              } ${item.isToday ? 'bg-red-500/10 font-bold text-red-600 dark:text-red-400' : ''}`}
            >
              <span className="text-[9px] font-semibold opacity-75">{dayShort}</span>
              <span className={`leading-none ${item.isToday ? 'font-black' : ''}`}>
                {dayNum}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
