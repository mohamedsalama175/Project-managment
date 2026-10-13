import { apiClient } from './client';

export interface AuditVerificationResult {
  valid: boolean;
  total_verified: number;
  last_verified_id: string | null;
  latest_hash: string | null;
  cursor?: {
    next_since_id: string | null;
    has_more: boolean;
  };
  errors?: string[];
  message?: string;
}

export interface LegalHoldItem {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  scope_type: 'organization' | 'project' | 'user';
  scope_id?: string | null;
  active: boolean;
  issued_by: string;
  issued_at: string;
  released_at?: string | null;
  created_at: string;
}

export interface ComplianceDsarRequestItem {
  id: string;
  organization_id: string;
  target_user_id: string;
  requested_by_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  download_token?: string | null;
  expires_at?: string | null;
  download_url?: string | null;
  error_message?: string | null;
  created_at: string;
}

export interface SsoConfigItem {
  id?: string;
  organization_id?: string;
  provider: 'saml' | 'oidc';
  idp_entity_id: string;
  sso_url: string;
  metadata_url?: string | null;
  certificate?: string | null;
  client_id?: string | null;
  client_secret?: string | null;
  attribute_mapping?: Record<string, string>;
  role_mapping?: Record<string, string>;
  enabled: boolean;
}

export interface ScimTokenItem {
  id: string;
  name: string;
  token_hash?: string;
  last_used_at?: string | null;
  expires_at?: string | null;
  created_at: string;
}

export interface SlaStatusResponse {
  status: 'operational' | 'degraded' | 'outage';
  uptime_percentage_30d: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  total_requests_recorded: number;
  last_updated: string;
  services: Array<{
    name: string;
    status: 'operational' | 'degraded';
    latency_ms: number;
  }>;
}

export interface Soc2EvidenceResponse {
  timestamp: string;
  organization: {
    id: string;
    name: string;
    region: string;
    plan: string;
  };
  evidence_matrix: {
    cc6_access_control: {
      sso_enforced: boolean;
      scim_active: boolean;
      mfa_configured: boolean;
    };
    cc7_audit_integrity: {
      chain_status: string;
      latest_row_hash: string | null;
      verified_logs_count: number;
    };
    pi1_legal_holds: {
      active_holds_count: number;
      deletion_guards_enforced: boolean;
    };
    a1_uptime_sla: {
      uptime_30d: number;
      cluster_region: string;
    };
  };
}

export const complianceApi = {
  // Audit Log Verification
  verifyAuditChain(params?: { since_id?: string; limit?: number }) {
    return apiClient.get<AuditVerificationResult>('/audit/verify', { params });
  },

  // Legal Holds
  getLegalHolds() {
    return apiClient.get<{ legal_holds: LegalHoldItem[] }>('/compliance/legal-holds');
  },

  createLegalHold(payload: {
    name: string;
    description?: string;
    scope_type: 'organization' | 'project' | 'user';
    scope_id?: string;
  }) {
    return apiClient.post<{ message: string; legal_hold: LegalHoldItem }>('/compliance/legal-holds', payload);
  },

  releaseLegalHold(id: string) {
    return apiClient.post<{ message: string; legal_hold: LegalHoldItem }>(`/compliance/legal-holds/${id}/release`);
  },

  exportEdiscovery(payload: {
    project_ids?: string[];
    user_ids?: string[];
    start_date?: string;
    end_date?: string;
  }) {
    return apiClient.post<{ message: string; ediscovery_export: any }>('/compliance/ediscovery/export', payload);
  },

  // GDPR DSAR & Erasure
  requestDsarExport(payload: { user_id: string }) {
    return apiClient.post<{ message: string; dsar_request: ComplianceDsarRequestItem }>(
      '/compliance/dsar/export',
      payload
    );
  },

  listDsarRequests() {
    return apiClient.get<{ dsar_requests: ComplianceDsarRequestItem[] }>('/compliance/dsar/requests');
  },

  executeErasure(payload: { user_id: string }) {
    return apiClient.post<{ message: string; user: any }>('/compliance/erasure', payload);
  },

  getSoc2Evidence() {
    return apiClient.get<Soc2EvidenceResponse>('/compliance/soc2/evidence');
  },

  // SSO & SCIM
  getSsoConfig() {
    return apiClient.get<{ sso_configuration: SsoConfigItem | null }>('/auth/sso/config');
  },

  updateSsoConfig(payload: Partial<SsoConfigItem>) {
    return apiClient.post<{ message: string; sso_configuration: SsoConfigItem }>('/auth/sso/config', payload);
  },

  createScimToken(payload: { name: string; expires_days?: number }) {
    return apiClient.post<{
      message: string;
      plain_text_token: string;
      scim_token: ScimTokenItem;
    }>('/auth/sso/scim-tokens', payload);
  },

  revokeScimToken(id: string) {
    return apiClient.delete<{ message: string }>(`/auth/sso/scim-tokens/${id}`);
  },

  // Push Notifications
  registerPushToken(payload: { platform: 'ios' | 'android' | 'web'; token: string; device_name?: string }) {
    return apiClient.post<{ message: string; push_token: any }>('/push/tokens', payload);
  },

  revokePushToken(id: string) {
    return apiClient.delete<{ message: string }>(`/push/tokens/${id}`);
  },

  // SLA & Status
  getPublicSlaStatus() {
    return apiClient.get<SlaStatusResponse>('/status/public');
  },
};
