/**
 * DeliverOps Integrations, Webhooks & Public API Client
 * Interfaces with Laravel 12 /api/v1/ endpoints
 */

import { apiClient, API_BASE_URL, PaginatedResponse } from './client';

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_minute: number;
  last_used_at?: string | null;
  expires_at?: string | null;
  revoked_at?: string | null;
  created_at: string;
  raw_key?: string;
}

export interface OAuthClient {
  id: string;
  name: string;
  client_id: string;
  redirect_uris: string[];
  scopes: string[];
  is_confidential: boolean;
  created_by_name?: string | null;
  created_by_email?: string | null;
  created_at: string;
  raw_secret?: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  description?: string | null;
  active: boolean;
  is_active?: boolean;
  disabled_at?: string | null;
  secret_prefix?: string;
  consecutive_failed_attempts: number;
  deliveries_count?: number;
  created_at: string;
  secret?: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_endpoint_id: string;
  endpoint_id?: string;
  event_type: string;
  payload: Record<string, any>;
  response_status?: number | null;
  response_body?: string | null;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  attempt: number;
  next_retry_at?: string | null;
  delivered_at?: string | null;
  error_message?: string | null;
  created_at: string;
  endpoint?: {
    id: string;
    url: string;
    events: string[];
  };
}

export interface IntegrationConnection {
  id: string;
  provider: 'slack' | 'teams' | 'github';
  status: 'connected' | 'disconnected' | 'error';
  settings?: {
    webhook_url?: string;
    channel?: string;
    [key: string]: any;
  };
  updated_at?: string;
}

export interface ImportBatch {
  id: string;
  project_id: string;
  provider: string;
  source_tool?: string;
  tasks_count: number;
  dependencies_count: number;
  errors?: string[];
  summary?: {
    tasks_count: number;
    dependencies_count: number;
    errors?: string[];
  };
  created_at: string;
  project?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
  };
}

export const integrationsApi = {
  // --- API Keys ---
  getApiKeys: async (): Promise<{ api_keys: ApiKey[] }> => {
    return apiClient.get('/api-keys');
  },

  createApiKey: async (data: {
    name: string;
    scopes?: string[];
    rate_limit_per_minute?: number;
    expires_at?: string | null;
  }): Promise<{ message: string; api_key: ApiKey; raw_key: string }> => {
    return apiClient.post('/api-keys', data);
  },

  revokeApiKey: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete(`/api-keys/${id}`);
  },

  // --- OAuth Apps ---
  getOAuthClients: async (): Promise<{ oauth_clients: OAuthClient[] }> => {
    return apiClient.get('/oauth-apps');
  },

  createOAuthClient: async (data: {
    name: string;
    redirect_uris: string[];
    scopes?: string[];
    is_confidential?: boolean;
  }): Promise<{ message: string; oauth_client: OAuthClient; client_secret?: string }> => {
    return apiClient.post('/oauth-apps', data);
  },

  updateOAuthClient: async (
    id: string,
    data: { name?: string; redirect_uris?: string[]; scopes?: string[] }
  ): Promise<{ message: string; oauth_client: OAuthClient }> => {
    return apiClient.put(`/oauth-apps/${id}`, data);
  },

  deleteOAuthClient: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete(`/oauth-apps/${id}`);
  },

  // --- Webhooks ---
  getWebhooks: async (): Promise<{ webhook_endpoints: WebhookEndpoint[] }> => {
    return apiClient.get('/webhooks');
  },

  createWebhook: async (data: {
    url: string;
    events: string[];
    description?: string;
  }): Promise<{ message: string; webhook_endpoint: WebhookEndpoint; secret: string }> => {
    return apiClient.post('/webhooks', data);
  },

  updateWebhook: async (
    id: string,
    data: { url?: string; events?: string[]; description?: string; active?: boolean; is_active?: boolean }
  ): Promise<{ message: string; webhook_endpoint: WebhookEndpoint }> => {
    return apiClient.put(`/webhooks/${id}`, data);
  },

  deleteWebhook: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete(`/webhooks/${id}`);
  },

  testWebhook: async (id: string): Promise<{ message: string; delivery: WebhookDelivery }> => {
    return apiClient.post(`/webhooks/${id}/test`);
  },

  rotateWebhookSecret: async (id: string): Promise<{ message: string; new_secret: string }> => {
    return apiClient.post(`/webhooks/${id}/rotate-secret`);
  },

  // --- Webhook Deliveries ---
  getWebhookDeliveries: async (params?: {
    webhook_endpoint_id?: string;
    status?: string;
    page?: number;
  }): Promise<PaginatedResponse<WebhookDelivery>> => {
    return apiClient.get('/webhooks/deliveries', { params });
  },

  retryWebhookDelivery: async (id: string): Promise<{ message: string }> => {
    return apiClient.post(`/webhooks/deliveries/${id}/retry`);
  },

  // --- Connectors: Slack ---
  getSlackStatus: async (): Promise<{ connected: boolean; connection?: any }> => {
    return apiClient.get('/integrations/slack');
  },

  connectSlack: async (data: {
    webhook_url: string;
    channel?: string;
  }): Promise<{ message: string; connection: any }> => {
    return apiClient.post('/integrations/slack/connect', data);
  },

  disconnectSlack: async (): Promise<{ message: string }> => {
    return apiClient.post('/integrations/slack/disconnect');
  },

  testSlack: async (): Promise<{ message: string }> => {
    return apiClient.post('/integrations/slack/test');
  },

  // --- Connectors: Microsoft Teams ---
  getTeamsStatus: async (): Promise<{ connected: boolean; connection?: any }> => {
    return apiClient.get('/integrations/teams');
  },

  connectTeams: async (data: {
    webhook_url: string;
  }): Promise<{ message: string; connection: any }> => {
    return apiClient.post('/integrations/teams/connect', data);
  },

  disconnectTeams: async (): Promise<{ message: string }> => {
    return apiClient.post('/integrations/teams/disconnect');
  },

  testTeams: async (): Promise<{ message: string }> => {
    return apiClient.post('/integrations/teams/test');
  },

  // --- Competitor Importers ---
  importProject: async (params: {
    project_id: string;
    provider: 'jira' | 'asana' | 'monday' | 'ms_project';
    content?: string;
    file?: File;
  }): Promise<{ message: string; batch: ImportBatch }> => {
    if (params.file) {
      const formData = new FormData();
      formData.append('project_id', params.project_id);
      formData.append('provider', params.provider);
      formData.append('file', params.file);
      const authToken = localStorage.getItem('deliverops_auth_token');
      const activeOrgId = localStorage.getItem('deliverops_current_org_id');

      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      if (activeOrgId) headers['X-Organization-Id'] = activeOrgId;

      const res = await fetch(`${API_BASE_URL}/integrations/import`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Import failed');
      }

      return res.json();
    }

    return apiClient.post('/integrations/import', {
      project_id: params.project_id,
      provider: params.provider,
      content: params.content,
    });
  },

  getImportBatches: async (
    projectId?: string
  ): Promise<PaginatedResponse<ImportBatch>> => {
    return apiClient.get('/integrations/import/batches', {
      params: projectId ? { project_id: projectId } : undefined,
    });
  },
};
