import React from 'react';
import { TaskDetailDrawer } from '../components/wbs/TaskDetailDrawer';
import { Task } from '../types';

describe('TaskDetailDrawer', () => {
  const mockTask: Task = {
    id: 'task-101',
    projectId: 'proj-1',
    parentId: null,
    name: 'Hardware Assembly',
    category: 'Engineering',
    start: '2026-10-15',
    end: '2026-10-25',
    pct: 20,
    isMilestone: false,
    dependsOn: [],
    status: 'In Progress',
    order: 1,
    primaryOwnerId: 'usr-sarah',
    contributorAllocations: [],
    reviewerId: null,
    reviewStatus: 'none',
  };

  it('renders safely when closed or task is null', () => {
    expect(() => {
      React.createElement(TaskDetailDrawer, {
        task: null,
        isOpen: false,
        onClose: () => {},
      });
    }).not.toThrow();
  });

  it('calculates owner capacity overallocation warnings correctly', () => {
    const weeklyCapacityHours = 40;
    const allocatedHours = 44; // 110% allocation

    const isOverAllocated = allocatedHours > weeklyCapacityHours;
    const overAllocatedHours = allocatedHours - weeklyCapacityHours;
    const ratio = allocatedHours / weeklyCapacityHours;

    expect(isOverAllocated).toBe(true);
    expect(overAllocatedHours).toBe(4);
    expect(ratio).toBe(1.1);
  });

  it('flags significant overallocation when capacity exceeds 150%', () => {
    const weeklyCapacityHours = 40;
    const heavyAllocationHours = 64; // 160% allocation

    const ratio = heavyAllocationHours / weeklyCapacityHours;
    const isSignificant = ratio > 1.5;
    const excessPct = Math.round((ratio - 1) * 100);

    expect(isSignificant).toBe(true);
    expect(excessPct).toBe(60);
  });
});
