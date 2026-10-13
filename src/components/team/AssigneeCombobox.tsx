import React, { useState, useRef, useEffect } from 'react';
import { Search, UserCheck, Users, Clock, AlertCircle } from 'lucide-react';
import { TeamMember, TaskEffortAllocation } from '../../types';
import { AvatarStack } from './AvatarStack';

interface AssigneeComboboxProps {
  primaryOwnerId: string | null | undefined;
  primaryOwnerHours?: number | null;
  contributorAllocations?: TaskEffortAllocation[];
  estimatedHours?: number | null;
  legacyAssignee?: string;
  assigneeUnresolved?: boolean;
  teamMembers: TeamMember[];
  onAssignChange: (
    newOwnerId: string | null,
    newOwnerHours: number | null,
    newContributors: TaskEffortAllocation[]
  ) => void;
  disabled?: boolean;
}

export const AssigneeCombobox: React.FC<AssigneeComboboxProps> = ({
  primaryOwnerId,
  primaryOwnerHours,
  contributorAllocations = [],
  estimatedHours,
  legacyAssignee,
  assigneeUnresolved,
  teamMembers = [],
  onAssignChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const activeOwner = teamMembers.find((m) => m.id === primaryOwnerId) || null;
  const activeContributors = teamMembers.filter((m) =>
    contributorAllocations.some((c) => c.memberId === m.id)
  );

  const filteredMembers = teamMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      m.department.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate allocated effort and unallocated balance
  const ownerHrs = primaryOwnerHours ?? (estimatedHours && contributorAllocations.length === 0 ? estimatedHours : 0);
  const contributorSum = contributorAllocations.reduce((sum, c) => sum + (c.allocatedHours || 0), 0);
  const totalAllocated = (ownerHrs || 0) + contributorSum;
  const unallocated = estimatedHours != null ? Math.max(0, estimatedHours - totalAllocated) : null;
  const isOverAllocated = estimatedHours != null && totalAllocated > estimatedHours;

  const handleSelectOwner = (memberId: string | null) => {
    // If selecting an owner who was previously a contributor, remove them from contributors
    const nextContributors = contributorAllocations.filter((c) => c.memberId !== memberId);
    onAssignChange(memberId, primaryOwnerHours ?? null, nextContributors);
  };

  const handleToggleContributor = (memberId: string) => {
    if (memberId === primaryOwnerId) return; // Owner cannot also be contributor

    const exists = contributorAllocations.some((c) => c.memberId === memberId);
    let next: TaskEffortAllocation[];
    if (exists) {
      next = contributorAllocations.filter((c) => c.memberId !== memberId);
    } else {
      next = [...contributorAllocations, { memberId, allocatedHours: 4 }];
    }
    onAssignChange(primaryOwnerId ?? null, primaryOwnerHours ?? null, next);
  };

  const handleUpdateContributorHours = (memberId: string, hours: number) => {
    const safeHours = Math.max(0, Number(hours) || 0);
    const next = contributorAllocations.map((c) =>
      c.memberId === memberId ? { ...c, allocatedHours: safeHours } : c
    );
    onAssignChange(primaryOwnerId ?? null, primaryOwnerHours ?? null, next);
  };

  const handleUpdateOwnerHours = (hours: number) => {
    const safeHours = Math.max(0, Number(hours) || 0);
    onAssignChange(primaryOwnerId ?? null, safeHours, contributorAllocations);
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors text-left group cursor-pointer max-w-[200px]"
        title={activeOwner ? `${activeOwner.name} (${activeOwner.jobTitle})` : legacyAssignee || 'Unassigned'}
      >
        <AvatarStack
          primaryOwner={activeOwner}
          contributors={activeContributors}
          contributorAllocations={contributorAllocations}
          legacyAssignee={legacyAssignee}
        />
        <div className="flex flex-col min-w-0 pr-1">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
            {activeOwner?.name || legacyAssignee || 'Unassigned'}
          </span>
          {assigneeUnresolved && (
            <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">
              Unlinked
            </span>
          )}
        </div>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-80 clay-card !p-3 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Task Ownership & Effort
            </span>
            {estimatedHours != null && (
              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {estimatedHours}h Total Est.
              </span>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative my-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search team member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Effort Allocation Balance Pill */}
          {estimatedHours != null && (
            <div className={`p-2 rounded-xl my-2 text-[11px] flex items-center justify-between border ${
              isOverAllocated
                ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                : 'bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Assigned: <strong>{totalAllocated}h</strong></span>
              </div>
              {isOverAllocated ? (
                <span className="flex items-center gap-1 font-bold text-red-600">
                  <AlertCircle className="w-3 h-3" />
                  Over by {totalAllocated - estimatedHours}h
                </span>
              ) : (
                <span>Unallocated: <strong>{unallocated}h</strong></span>
              )}
            </div>
          )}

          {/* Primary Owner Selection */}
          <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pt-1">
              Primary Accountable Owner
            </div>

            {/* Unassigned Option */}
            <button
              type="button"
              onClick={() => handleSelectOwner(null)}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${
                primaryOwnerId === null
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span>None (Unassigned)</span>
              {primaryOwnerId === null && <UserCheck className="w-3.5 h-3.5 text-emerald-500" />}
            </button>

            {filteredMembers.map((m) => {
              const isSelected = m.id === primaryOwnerId;
              return (
                <div
                  key={m.id}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectOwner(m.id)}
                    className="flex items-center gap-2 flex-1 text-left min-w-0"
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] text-white shrink-0 overflow-hidden"
                      style={{ backgroundColor: m.color }}
                    >
                      {m.photoUrl || m.avatar ? (
                        <img src={m.photoUrl || m.avatar} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        m.name.charAt(0)
                      )}
                    </div>
                    <div className="truncate">
                      <div className="truncate leading-tight">{m.name}</div>
                      <div className="text-[9px] text-slate-400 font-normal truncate">
                        {m.jobTitle}
                      </div>
                    </div>
                  </button>

                  {isSelected && (
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <input
                        type="number"
                        min={0}
                        title="Hours personal to primary owner"
                        placeholder="Hrs"
                        value={primaryOwnerHours ?? ''}
                        onChange={(e) => handleUpdateOwnerHours(Number(e.target.value))}
                        className="w-12 text-center text-[10px] font-mono py-0.5 px-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                      />
                      <span className="text-[10px] text-slate-400 font-mono">h</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Contributors Section */}
          {primaryOwnerId && (
            <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Contributors
                </span>
                <span className="font-normal lowercase">({contributorAllocations.length} added)</span>
              </div>

              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {filteredMembers
                  .filter((m) => m.id !== primaryOwnerId)
                  .map((m) => {
                    const alloc = contributorAllocations.find((c) => c.memberId === m.id);
                    const isChecked = !!alloc;

                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between px-2 py-1 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                      >
                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleContributor(m.id)}
                            className="rounded accent-emerald-500 w-3.5 h-3.5"
                          />
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] text-white shrink-0 overflow-hidden"
                            style={{ backgroundColor: m.color }}
                          >
                            {m.photoUrl || m.avatar ? (
                              <img src={m.photoUrl || m.avatar} alt={m.name} className="w-full h-full object-cover" />
                            ) : (
                              m.name.charAt(0)
                            )}
                          </div>
                          <span className="text-slate-700 dark:text-slate-300 truncate text-[11px]">
                            {m.name}
                          </span>
                        </label>

                        {isChecked && (
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <input
                              type="number"
                              min={0}
                              value={alloc.allocatedHours}
                              onChange={(e) =>
                                handleUpdateContributorHours(m.id, Number(e.target.value))
                              }
                              className="w-12 text-center text-[10px] font-mono py-0.5 px-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                            />
                            <span className="text-[10px] text-slate-400 font-mono">h</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Done Button */}
          <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
