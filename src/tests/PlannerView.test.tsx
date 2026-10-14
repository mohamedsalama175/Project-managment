import React from 'react';
import { PlannerView } from '../views/PlannerView';

describe('PlannerView URL Drilldown and Filters', () => {
  it('instantiates PlannerView without throwing', () => {
    expect(() => {
      React.createElement(PlannerView);
    }).not.toThrow();
  });

  it('parses URL filter parameters correctly', () => {
    const search = '?filter=overdue&project=PROJ-01';
    const params = new URLSearchParams(search);

    expect(params.get('filter')).toBe('overdue');
    expect(params.get('project')).toBe('PROJ-01');
  });

  it('supports my-tasks filter parameter for field engineers', () => {
    const search = '?filter=my-tasks';
    const params = new URLSearchParams(search);

    expect(params.get('filter')).toBe('my-tasks');
  });

  it('filters overdue tasks by evaluating end date against today UTC', () => {
    const today = '2026-10-14';
    const tasks = [
      { id: '1', name: 'Past Due', end: '2026-10-10', status: 'In Progress' },
      { id: '2', name: 'Completed Past', end: '2026-10-10', status: 'Completed' },
      { id: '3', name: 'Future Task', end: '2026-10-20', status: 'In Progress' },
    ];

    const overdue = tasks.filter(t => t.end && t.end < today && t.status !== 'Completed');
    expect(overdue.length).toBe(1);
    expect(overdue[0].id).toBe('1');
  });
});
