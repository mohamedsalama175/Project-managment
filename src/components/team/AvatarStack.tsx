import React from 'react';
import { TeamMember, TaskEffortAllocation } from '../../types';

interface AvatarStackProps {
  primaryOwner: TeamMember | null | undefined;
  contributors?: TeamMember[];
  contributorAllocations?: TaskEffortAllocation[];
  legacyAssignee?: string;
  size?: 'sm' | 'md';
  maxVisible?: number;
  showNameFallback?: boolean;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
  primaryOwner,
  contributors = [],
  contributorAllocations = [],
  legacyAssignee,
  size = 'sm',
  maxVisible = 2,
  showNameFallback = true,
}) => {
  const dim = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-7 h-7 text-xs';
  const borderDim = 'ring-1 ring-white/60 dark:ring-slate-900';
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // If no primary owner and no contributors, render an avatar circle with initials for legacy assignee
  if (!primaryOwner && contributors.length === 0) {
    if (legacyAssignee && legacyAssignee !== 'Unassigned') {
      return (
        <div
          className={`rounded-full ${dim} aspect-square overflow-hidden flex items-center justify-center font-bold font-mono select-none ring-white dark:ring-[#161d24] ${borderDim} shadow-sm shrink-0 bg-emerald-700 text-white`}
          title={`Assigned: ${legacyAssignee}`}
        >
          <span>{getInitials(legacyAssignee)}</span>
        </div>
      );
    }
    return (
      <div
        className={`rounded-full ${dim} aspect-square border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 text-[10px] select-none shrink-0`}
        title="Unassigned"
      >
        —
      </div>
    );
  }

  const allMembers = primaryOwner ? [primaryOwner, ...contributors] : contributors;
  const visible = allMembers.slice(0, maxVisible);
  const remainingCount = allMembers.length - maxVisible;

  const getTooltip = () => {
    const lines: string[] = [];
    if (primaryOwner) {
      lines.push(`Primary Owner: ${primaryOwner.name} (${primaryOwner.jobTitle})`);
    }
    if (contributors.length > 0) {
      lines.push('Contributors:');
      contributors.forEach((c) => {
        const alloc = contributorAllocations.find((a) => a.memberId === c.id);
        const hrs = alloc ? ` - ${alloc.allocatedHours}h` : '';
        lines.push(` • ${c.name}${hrs}`);
      });
    }
    return lines.join('\n');
  };

  return (
    <div className="flex items-center -space-x-1.5 overflow-hidden" title={getTooltip()}>
      {visible.map((m, idx) => {
        const isOwner = primaryOwner && m.id === primaryOwner.id;
        return (
          <div
            key={m.id}
            className={`relative rounded-full ${dim} aspect-square overflow-hidden flex items-center justify-center font-bold font-mono select-none ring-white dark:ring-[#161d24] ${borderDim} shadow-sm shrink-0 transition-transform hover:scale-110 hover:z-20`}
            style={{
              backgroundColor: m.color || '#1f8a70',
              color: '#ffffff',
              zIndex: 10 - idx,
            }}
          >
            {m.photoUrl || m.avatar ? (
              <img
                src={m.photoUrl || m.avatar}
                alt={m.name}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <span>{getInitials(m.name)}</span>
            )}
            {isOwner && (
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-white dark:ring-slate-900"
                title="Primary Owner"
              />
            )}
          </div>
        );
      })}

      {remainingCount > 0 && (
        <div
          className={`rounded-full ${dim} flex items-center justify-center font-bold text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 ring-white dark:ring-[#161d24] ${borderDim} shadow-sm shrink-0`}
          style={{ zIndex: 5 }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};
