/**
 * DeliverOps AI API Client
 * Interfaces with Laravel /api/v1/ai and project-scoped AI endpoints
 */

import { apiClient } from './client';

export interface TaskEstimationRequest {
  name: string;
  description?: string;
  category?: string;
  project_id?: string;
}

export interface TaskEstimationResponse {
  estimated_hours: number;
  confidence: number;
  reasoning: string;
  suggested_breakdown?: Array<{ name: string; hours: number }>;
}

export interface RiskFactor {
  factor: string;
  weight: number;
  description: string;
  mitigation_hint?: string;
}

export interface ProjectRiskScoreResponse {
  project_id: string;
  risk_score: number;
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  top_factors: RiskFactor[];
}

export interface SummarizationRequest {
  scope: 'project' | 'task' | 'portfolio';
  target_id: string;
  time_range?: '24h' | '7d' | '30d' | '90d';
}

export interface SummarizationResponse {
  headline: string;
  progress_summary: string;
  key_risks: string[];
  blockers: string[];
  recommended_actions: string[];
  generated_at: string;
}

export interface NaturalLanguageTaskParseRequest {
  text: string;
  project_id?: string;
}

export interface ParsedTaskResponse {
  name: string;
  description?: string | null;
  assignee_name?: string | null;
  assignee_id?: string | null;
  due_date?: string | null;
  estimated_hours?: number | null;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  category: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiActionTaken {
  action_log_id: string;
  action_type: string;
  target_id: string;
  description: string;
}

export interface AiChatResponse {
  reply: string;
  actions_taken: AiActionTaken[];
  tool_executions: Array<{ tool: string; output: any }>;
}

export interface AiRollbackResponse {
  action_log_id: string;
  reverted: boolean;
  reverted_at: string;
}

export interface AiFeatureUsage {
  feature: string;
  requests_count: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_cost_usd: number;
}

export interface AiUsageLogItem {
  id: string;
  feature: string;
  provider: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  created_at: string;
}

export interface AiUsageResponse {
  monthly_budget_usd: number;
  current_month_spend_usd: number;
  remaining_budget_usd: number;
  burn_percentage: number;
  features: AiFeatureUsage[];
  recent_logs: AiUsageLogItem[];
  ai_settings: Record<string, any>;
}

export interface ProjectAnomaly {
  id: string;
  project_id: string;
  metric: string;
  current_value: number;
  baseline_mean: number;
  baseline_stddev: number;
  z_score: number;
  severity: 'warning' | 'critical';
  explanation: string;
  acknowledged_at?: string | null;
  acknowledged_by?: { id: string; name: string } | null;
  created_at: string;
}

export const aiApi = {
  estimateTask: async (data: TaskEstimationRequest): Promise<TaskEstimationResponse> => {
    return apiClient.post<TaskEstimationResponse>('/api/v1/ai/estimate-task', data);
  },

  getProjectRiskScore: async (projectId: string): Promise<ProjectRiskScoreResponse> => {
    return apiClient.get<ProjectRiskScoreResponse>(`/api/v1/projects/${projectId}/ai/risk-score`);
  },

  summarizeScope: async (data: SummarizationRequest): Promise<SummarizationResponse> => {
    return apiClient.post<SummarizationResponse>('/api/v1/ai/summarize', data);
  },

  parseNaturalLanguageTask: async (data: NaturalLanguageTaskParseRequest): Promise<ParsedTaskResponse> => {
    return apiClient.post<ParsedTaskResponse>('/api/v1/ai/parse-task', data);
  },

  chat: async (messages: ChatMessage[], projectId?: string): Promise<AiChatResponse> => {
    return apiClient.post<AiChatResponse>('/api/v1/ai/chat', { messages, project_id: projectId });
  },

  rollbackAction: async (actionLogId: string): Promise<AiRollbackResponse> => {
    return apiClient.post<AiRollbackResponse>(`/api/v1/ai/actions/${actionLogId}/rollback`, {});
  },

  getUsage: async (): Promise<AiUsageResponse> => {
    return apiClient.get<AiUsageResponse>('/api/v1/ai/usage');
  },

  updateSettings: async (payload: {
    ai_monthly_budget_usd?: number;
    ai_settings?: Record<string, any>;
    credentials?: {
      openai_key?: string;
      anthropic_key?: string;
      gemini_key?: string;
      ollama_url?: string;
    };
  }): Promise<{ message: string; ai_monthly_budget_usd: number; ai_settings: any }> => {
    return apiClient.put('/api/v1/ai/settings', payload);
  },

  getProjectAnomalies: async (projectId: string): Promise<{ project_id: string; anomalies: ProjectAnomaly[] }> => {
    return apiClient.get<{ project_id: string; anomalies: ProjectAnomaly[] }>(`/api/v1/projects/${projectId}/ai/anomalies`);
  },

  acknowledgeAnomaly: async (anomalyId: string): Promise<{ anomaly: ProjectAnomaly; message: string }> => {
    return apiClient.post<{ anomaly: ProjectAnomaly; message: string }>(`/api/v1/ai/anomalies/${anomalyId}/acknowledge`, {});
  },
};
