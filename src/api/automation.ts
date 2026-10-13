/**
 * DeliverOps Automation Engine API Client
 * Interfaces with Laravel /api/v1/automation endpoints
 */

import { apiClient, PaginatedResponse } from './client';

export interface AutomationCondition {
  field: string;
  operator: string;
  value: any;
}

export interface AutomationAction {
  type: string;
  params: Record<string, any>;
}

export interface AutomationTrigger {
  event: string;
  [key: string]: any;
}

export interface AutomationRule {
  id: string;
  organization_id: string;
  project_id?: string | null;
  name: string;
  description?: string | null;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  enabled: boolean;
  created_by_id?: string | null;
  creator?: { id: string; name: string } | null;
  project?: { id: string; name: string; code: string } | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationRun {
  id: string;
  organization_id: string;
  rule_id: string;
  trigger_event_id?: string | null;
  status: 'pending' | 'success' | 'failed' | 'skipped';
  depth: number;
  output?: Record<string, any> | null;
  error_message?: string | null;
  duration_ms: number;
  executed_at: string;
  rule?: AutomationRule | null;
}

export interface AutomationTemplate {
  id: string;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  conditions: Record<string, any> | AutomationCondition[];
  actions: AutomationAction[];
}

export const automationApi = {
  getRules: async (projectId?: string, enabled?: boolean): Promise<{ rules: AutomationRule[] }> => {
    const params = new URLSearchParams();
    if (projectId) params.append('project_id', projectId);
    if (enabled !== undefined) params.append('enabled', String(enabled));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<{ rules: AutomationRule[] }>(`/api/v1/automation/rules${qs}`);
  },

  createRule: async (data: Partial<AutomationRule>): Promise<{ rule: AutomationRule; message: string }> => {
    return apiClient.post<{ rule: AutomationRule; message: string }>('/api/v1/automation/rules', data);
  },

  getRule: async (id: string): Promise<{ rule: AutomationRule; recent_runs: AutomationRun[] }> => {
    return apiClient.get<{ rule: AutomationRule; recent_runs: AutomationRun[] }>(`/api/v1/automation/rules/${id}`);
  },

  updateRule: async (id: string, data: Partial<AutomationRule>): Promise<{ rule: AutomationRule; message: string }> => {
    return apiClient.put<{ rule: AutomationRule; message: string }>(`/api/v1/automation/rules/${id}`, data);
  },

  deleteRule: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/api/v1/automation/rules/${id}`);
  },

  toggleRule: async (id: string): Promise<{ rule: AutomationRule; message: string }> => {
    return apiClient.patch<{ rule: AutomationRule; message: string }>(`/api/v1/automation/rules/${id}/toggle`, {});
  },

  getRuns: async (params?: { rule_id?: string; status?: string; page?: number }): Promise<PaginatedResponse<AutomationRun>> => {
    const query = new URLSearchParams();
    if (params?.rule_id) query.append('rule_id', params.rule_id);
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', String(params.page));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get<PaginatedResponse<AutomationRun>>(`/api/v1/automation/runs${qs}`);
  },

  getRun: async (id: string): Promise<{ run: AutomationRun }> => {
    return apiClient.get<{ run: AutomationRun }>(`/api/v1/automation/runs/${id}`);
  },

  getTemplates: async (): Promise<{ templates: AutomationTemplate[] }> => {
    return apiClient.get<{ templates: AutomationTemplate[] }>('/api/v1/automation/templates');
  },

  instantiateTemplate: async (templateId: string, payload?: { project_id?: string; name?: string }): Promise<{ rule: AutomationRule; message: string }> => {
    return apiClient.post<{ rule: AutomationRule; message: string }>(`/api/v1/automation/templates/${templateId}/instantiate`, payload || {});
  },
};
