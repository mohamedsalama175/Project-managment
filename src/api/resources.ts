/**
 * DeliverOps Resource Management, Capacity Planning & Time Tracking API Client
 * Interfaces with Laravel 12 /api/v1/ endpoints
 */

import { apiClient } from './client';

export interface TimeOffRequest {
  id: string;
  organization_id: string;
  user_id: string;
  type: 'vacation' | 'sick' | 'personal' | 'holiday';
  start_date: string;
  end_date: string;
  hours_off: number | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by_id?: string | null;
  approved_by_ulid_snapshot?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    department?: string;
  };
  warnings?: Array<{ code: string; message: string }>;
}

export interface Skill {
  id: string;
  organization_id: string;
  name: string;
  category: string;
  is_active: boolean;
  users_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserSkillItem {
  id?: string;
  skill_id: string;
  skill_name?: string;
  category?: string;
  proficiency: number; // 1-5
  years_experience: number;
}

export interface CapacityUserWeek {
  iso_week: string;
  start_date: string;
  end_date: string;
  base_capacity_hours: number;
  time_off_hours: number;
  effective_capacity_hours: number;
  allocated_hours: number;
  load_percent: number;
  status: 'underallocated' | 'optimal' | 'overallocated' | 'zero_capacity';
}

export interface CapacityForecastUser {
  user_id: string;
  name: string;
  department: string;
  job_title: string;
  weekly_base_capacity: number;
  weeks: CapacityUserWeek[];
}

export interface CapacityForecastResponse {
  generated_at: string;
  weeks: number;
  version: string;
  summary: {
    total_base_capacity: number;
    total_effective_capacity: number;
    total_allocated_hours: number;
    average_load_percent: number;
    overallocated_weeks_count: number;
    zero_capacity_weeks_count: number;
  };
  users: CapacityForecastUser[];
}

export interface HiringRecommendation {
  skill_id: string;
  skill_name: string;
  category: string;
  consecutive_deficit_weeks: number;
  recommended_headcount: number;
  peak_weekly_deficit_hours: number;
  total_deficit_hours: number;
  reason: string;
}

export interface LevelingProposal {
  task_id: string;
  task_name: string;
  current_start: string;
  current_end: string;
  proposed_start: string;
  proposed_end: string;
  shift_days: number;
  total_float: number;
  is_critical: boolean;
  reason: string;
}

export interface LevelingResponse {
  project_id: string;
  mode: 'minimize_overallocation' | 'smooth_weekly_load' | 'protect_critical_path';
  state_hash: string;
  cpm_critical_path_protected: boolean;
  proposals: LevelingProposal[];
  summary: {
    total_tasks_evaluated: number;
    tasks_shifted_count: number;
    critical_tasks_preserved: number;
    max_delay_days: number;
  };
}

export interface UserAllocation {
  task_id: string;
  task_name: string;
  project_id: string;
  project_name: string;
  project_code: string;
  start_date: string;
  end_date: string;
  status: string;
  estimated_hours: number;
  daily_allocated_hours: number;
}

export interface TimeEntry {
  id: string;
  organization_id: string;
  project_id: string;
  task_id: string;
  user_id: string;
  date: string;
  hours: number;
  description?: string | null;
  billable: boolean;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  approved_by_id?: string | null;
  approved_by_ulid_snapshot?: string | null;
  approved_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
  task?: { id: string; name: string };
  project?: { id: string; name: string; code: string };
  user?: { id: string; name: string };
}

export interface TimesheetDayCell {
  entry_id?: string | null;
  hours: number;
  billable: boolean;
  status: 'none' | 'draft' | 'submitted' | 'approved' | 'rejected';
  rejection_reason?: string | null;
}

export interface TimesheetTaskRow {
  task_id: string;
  task_name: string;
  project_id?: string;
  project_name?: string;
  project_code?: string;
  days: Record<string, TimesheetDayCell>;
  total_hours: number;
}

export interface TimesheetGridResponse {
  week: string;
  start_date: string;
  end_date: string;
  user: {
    id: string;
    name: string;
    weekly_capacity_hours: number;
  };
  days_meta: Array<{
    day_name: string;
    date: string;
    is_weekend: boolean;
  }>;
  summary: {
    total_hours: number;
    billable_hours: number;
    non_billable_hours: number;
  };
  tasks: TimesheetTaskRow[];
}

export interface BillabilityReport {
  date_from: string;
  date_to: string;
  summary: {
    total_hours: number;
    billable_hours: number;
    non_billable_hours: number;
    billable_percent: number;
    total_cost: number;
  };
  breakdown_by_project: Array<{
    project_id: string;
    project_name: string;
    project_code: string;
    total_hours: number;
    billable_hours: number;
    total_cost: number;
  }>;
  breakdown_by_user: Array<{
    user_id: string;
    user_name: string;
    total_hours: number;
    billable_hours: number;
    billable_rate: number;
    total_cost: number;
  }>;
}

export const resourcesApi = {
  // Time-Off
  getTimeOffRequests: (status?: string, userId?: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (userId) params.set('user_id', userId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.request<{ data: TimeOffRequest[] }>(`/time-off${qs}`);
  },

  createTimeOffRequest: (data: {
    type: 'vacation' | 'sick' | 'personal' | 'holiday';
    start_date: string;
    end_date: string;
    hours_off?: number;
    notes?: string;
  }) => {
    return apiClient.request<{ data: TimeOffRequest; warnings?: Array<{ code: string; message: string }> }>('/time-off', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  approveTimeOffRequest: (id: string) => {
    return apiClient.request<{ message: string; data: TimeOffRequest }>(`/time-off/${id}/approve`, {
      method: 'PUT',
    });
  },

  rejectTimeOffRequest: (id: string, notes?: string) => {
    return apiClient.request<{ message: string; data: TimeOffRequest }>(`/time-off/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    });
  },

  deleteTimeOffRequest: (id: string) => {
    return apiClient.request<void>(`/time-off/${id}`, {
      method: 'DELETE',
    });
  },

  // Skills Catalog
  getSkills: () => {
    return apiClient.request<{ data: Skill[] }>('/skills');
  },

  createSkill: (data: { name: string; category: string }) => {
    return apiClient.request<{ data: Skill }>('/skills', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateSkill: (id: string, data: { name?: string; category?: string; is_active?: boolean }) => {
    return apiClient.request<{ data: Skill }>(`/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteSkill: (id: string) => {
    return apiClient.request<{ message: string; mode?: 'soft_disabled' | 'deleted'; data?: Skill }>(`/skills/${id}`, {
      method: 'DELETE',
    });
  },

  bulkAssignSkills: (userId: string, skills: Array<{ skill_id: string; proficiency: number; years_experience?: number }>) => {
    return apiClient.request<{ message: string; count: number }>(`/users/${userId}/skills/bulk`, {
      method: 'POST',
      body: JSON.stringify({ skills }),
    });
  },

  searchSkills: (skills: string[], minProficiency?: number, matchMode: 'all' | 'any' = 'all') => {
    const params = new URLSearchParams();
    params.set('skills', skills.join(','));
    if (minProficiency) params.set('min_proficiency', String(minProficiency));
    params.set('match_mode', matchMode);
    return apiClient.request<{
      data: Array<{
        user_id: string;
        name: string;
        email: string;
        department: string;
        weekly_capacity_hours: number;
        matching_skills_count: number;
        matched_skills: Array<{
          skill_id: string;
          skill_name: string;
          proficiency: number;
          years_experience: number;
        }>;
      }>;
    }>(`/skills/search?${params.toString()}`);
  },

  // Capacity & Forecasting
  getCurrentCapacity: () => {
    return apiClient.request<{
      organization_id: string;
      total_team_members: number;
      total_weekly_capacity_hours: number;
      users: Array<{
        user_id: string;
        name: string;
        email: string;
        department: string;
        weekly_capacity_hours: number;
        status: string;
      }>;
    }>('/organizations/current/capacity');
  },

  getCapacityForecast: (weeks: number = 8) => {
    return apiClient.request<CapacityForecastResponse>(`/organizations/current/capacity/forecast?weeks=${weeks}`);
  },

  getHiringRecommendations: () => {
    return apiClient.request<{
      analysis_window_weeks: number;
      recommendations: HiringRecommendation[];
    }>('/organizations/current/capacity/hiring-recommendations');
  },

  // Advisory Resource Leveling
  proposeLeveling: (projectId: string, mode: 'minimize_overallocation' | 'smooth_weekly_load' | 'protect_critical_path' = 'minimize_overallocation') => {
    return apiClient.request<LevelingResponse>(`/projects/${projectId}/level-resources`, {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  },

  applyLeveling: (projectId: string, stateHash: string, taskIds: string[]) => {
    return apiClient.request<{
      message: string;
      applied_count: number;
      applied_task_ids: string[];
    }>(`/projects/${projectId}/level-resources/apply`, {
      method: 'POST',
      body: JSON.stringify({ state_hash: stateHash, task_ids: taskIds }),
    });
  },

  // Cross-Project Allocations
  getUserAllocations: (userId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.request<{
      user: { id: string; name: string; weekly_capacity_hours: number };
      allocations_count: number;
      allocations: UserAllocation[];
    }>(`/users/${userId}/allocations${qs}`);
  },

  // Time Tracking & Timesheets
  createTimeEntry: (taskId: string, data: {
    date: string;
    hours: number;
    description?: string;
    billable?: boolean;
  }) => {
    return apiClient.request<{ data: TimeEntry }>(`/tasks/${taskId}/time-entries`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateTimeEntry: (id: string, data: {
    date?: string;
    hours?: number;
    description?: string;
    billable?: boolean;
  }) => {
    return apiClient.request<{ data: TimeEntry }>(`/time-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteTimeEntry: (id: string) => {
    return apiClient.request<void>(`/time-entries/${id}`, {
      method: 'DELETE',
    });
  },

  getTimesheetGrid: (userId: string, week: string) => {
    return apiClient.request<TimesheetGridResponse>(`/users/${userId}/timesheet?week=${week}`);
  },

  submitTimesheet: (entryIds: string[]) => {
    return apiClient.request<{
      message: string;
      submitted_count: number;
      submitted_ids: string[];
    }>('/timesheets/submit', {
      method: 'POST',
      body: JSON.stringify({ entry_ids: entryIds }),
    });
  },

  rejectTimesheet: (id: string, reason: string) => {
    return apiClient.request<{
      message: string;
      data: TimeEntry;
    }>(`/timesheets/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  bulkApproveTimesheets: (entryIds: string[]) => {
    return apiClient.request<{
      approved_count: number;
      failed_count: number;
      approved_ids: string[];
      failed_ids: Array<{ id: string; reason: string }>;
      reason_summary: {
        self_approval_prohibited: number;
        already_approved: number;
        not_submitted: number;
        not_found: number;
      };
    }>('/timesheets/bulk-approve', {
      method: 'PUT',
      body: JSON.stringify({ entry_ids: entryIds }),
    });
  },

  bulkRejectTimesheets: (entryIds: string[], reason: string) => {
    return apiClient.request<{
      rejected_count: number;
      failed_count: number;
      rejected_ids: string[];
      failed_ids: Array<{ id: string; reason: string }>;
    }>('/timesheets/bulk-reject', {
      method: 'PUT',
      body: JSON.stringify({ entry_ids: entryIds, reason }),
    });
  },

  getBillabilityReport: (dateFrom?: string, dateTo?: string, projectId?: string) => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (projectId) params.set('project_id', projectId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.request<BillabilityReport>(`/reports/billability${qs}`);
  },
};
