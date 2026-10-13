/**
 * DeliverOps API Client
 * Enterprise-grade client interfacing with Laravel 12 REST API under /api/v1/
 * Supports Laravel Sanctum stateful HttpOnly sessions, CSRF protection, and Tenant Scoping.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
const SANCTUM_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  avatarPath?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  skills: string[];
  weeklyCapacityHours: number;
  status: 'active' | 'on_leave' | 'inactive';
  color: string;
  roles: string[];
  primaryRole: string;
  mfaEnabled: boolean;
  defaultOrganizationId?: string | null;
  organizations?: ApiOrganization[];
  defaultOrganization?: ApiOrganization | null;
  mustChangePassword?: boolean;
  failedLoginAttempts?: number;
  lockedUntil?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiOrganization {
  id: string;
  name: string;
  slug: string;
  industry?: string | null;
  region?: string | null;
  plan: 'free' | 'pro' | 'enterprise' | 'trial' | 'starter' | 'professional';
  trialEndsAt?: string | null;
  billingEmail?: string | null;
  timezone?: string;
  status: 'active' | 'suspended' | 'cancelled';
  isOwner?: boolean;
  logoPath?: string | null;
  sample_project_id?: string | null;
  has_sample_data?: boolean;
  settings?: {
    default_calendar?: string;
    [key: string]: any;
  };
  planLimits?: {
    max_projects?: number;
    max_users?: number;
    [key: string]: any;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiOnboardingProgress {
  id: string;
  organization_id: string;
  user_id: string;
  flow_type: 'owner' | 'invited_member';
  current_step: number;
  total_steps: number;
  completed_steps: number[];
  skipped_steps: number[];
  is_completed: boolean;
  tour_completed: boolean;
  completed_at?: string | null;
}

export interface ApiProjectTemplate {
  id: string;
  organization_id?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  industry: string;
  category: string;
  is_system: boolean;
  version: number;
  tasks_count: number;
  dependencies_count: number;
  risks_count: number;
  task_count?: number;
  risk_count?: number;
  estimated_duration_days?: number;
  template_data: {
    tasks: any[];
    dependencies: any[];
    risks: any[];
  };
  created_at?: string;
}

export interface ApiImportDryRunResult {
  dry_run: boolean;
  code?: string;
  message: string;
  summary: {
    tasks_count: number;
    dependencies_count: number;
    total_rows?: number;
    valid_rows?: number;
    invalid_rows?: number;
  };
  tasks?: any[];
  preview?: any[];
  errors?: Array<{ row?: number; field?: string; message?: string; errors?: string[] }>;
  total_rows?: number;
  valid_rows?: number;
  invalid_rows?: number;
}

export interface ApiOrganizationMember {
  id: string;
  name: string;
  email: string;
  jobTitle?: string | null;
  department?: string | null;
  avatarUrl?: string | null;
  isOwner: boolean;
  role: string;
  roles: string[];
  joinedAt: string;
}

export interface ApiOrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  token?: string;
  invitedBy?: { id: string; name: string };
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
}

export interface ApiRole {
  id: string;
  name: string;
  displayName: string;
  description?: string | null;
  isSystem: boolean;
  usersCount: number;
  permissions: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiPermission {
  id: string;
  name: string;
  guard_name: string;
  group_name: string;
  description?: string;
}

export interface ApiSession {
  id: string;
  ip_address: string;
  user_agent: string;
  device_type: string;
  browser: string;
  platform: string;
  last_activity: string;
  is_current: boolean;
}

export interface ApiAuthEvent {
  id: string;
  user_id?: string | null;
  email_attempted?: string | null;
  event_type: string;
  event: string;
  ip_address: string;
  user_agent?: string | null;
  geo_country?: string | null;
  created_at: string;
}

export interface LoginResponse {
  token?: string;
  user?: ApiUser;
  permissions?: string[];
  organizations?: ApiOrganization[];
  currentOrganization?: ApiOrganization | null;
  code?: string;
  message?: string;
  challengeToken?: string;
  mfa_required?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
  };
}

export interface ApiCommentUser {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string | null;
}

export interface ApiCommentReaction {
  count: number;
  has_reacted: boolean;
  users: string[];
}

export interface ApiTaskComment {
  id: string;
  task_id: string;
  user_id: string;
  parent_comment_id?: string | null;
  content: string;
  mentions: string[];
  is_edited: boolean;
  edited_at?: string | null;
  is_tombstone: boolean;
  created_at: string;
  user?: ApiCommentUser | null;
  reactions?: Record<string, ApiCommentReaction>;
  replies?: ApiTaskComment[];
}

export interface ApiTaskWatcher {
  id: string;
  task_id: string;
  user?: ApiCommentUser | null;
  created_at: string;
}

export interface ApiActivityEvent {
  id: string;
  project_id?: string | null;
  task_id?: string | null;
  action: string;
  metadata?: Record<string, any>;
  created_at: string;
  actor?: ApiCommentUser | null;
}

export interface ApiAttachment {
  id: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  scan_status: 'pending' | 'clean' | 'infected' | 'error';
  scan_details?: string | null;
  download_url?: string;
  uploaded_by?: string;
  uploader?: ApiCommentUser | null;
  created_at: string;
}

export interface ApiNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  action_url?: string | null;
  event_type: string;
  task_id?: string | null;
  project_id?: string | null;
  read_at?: string | null;
  created_at: string;
  data?: Record<string, any>;
}

export interface ApiNotificationPreference {
  id?: string;
  event_type: string;
  channel: 'in_app' | 'email';
  enabled: boolean;
  digest_frequency?: 'instant' | 'daily' | 'weekly';
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, code?: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

class ApiClient {
  private activeOrgId: string | null = localStorage.getItem('deliverops_current_org_id');
  private authToken: string | null = localStorage.getItem('deliverops_auth_token');
  private csrfInitialized = false;

  setActiveOrganizationId(orgId: string | null): void {
    this.activeOrgId = orgId;
    if (orgId) {
      localStorage.setItem('deliverops_current_org_id', orgId);
    } else {
      localStorage.removeItem('deliverops_current_org_id');
    }
  }

  getActiveOrganizationId(): string | null {
    return this.activeOrgId;
  }

  setAuthToken(token: string | null): void {
    this.authToken = token;
    if (token) {
      localStorage.setItem('deliverops_auth_token', token);
    } else {
      localStorage.removeItem('deliverops_auth_token');
    }
  }

  private getXsrfToken(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^|;\\s*)XSRF-TOKEN=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  async csrf(): Promise<void> {
    try {
      await fetch(`${SANCTUM_BASE_URL}/sanctum/csrf-cookie`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });
      this.csrfInitialized = true;
    } catch {
      // Ignore if unavailable during headless tests
    }
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.activeOrgId) {
      headers['X-Organization-Id'] = this.activeOrgId;
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const xsrf = this.getXsrfToken();
    if (xsrf) {
      headers['X-XSRF-TOKEN'] = xsrf;
    }

    return headers;
  }

  private broadcastUnauthorized(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('deliverops:unauthorized'));
      try {
        localStorage.setItem(
          'deliverops_auth_event',
          JSON.stringify({ type: 'logout', at: Date.now() })
        );
      } catch {
        // Storage restricted
      }
    }
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();

    // Ensure CSRF cookie exists before mutating requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !this.csrfInitialized && !this.getXsrfToken()) {
      await this.csrf();
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const defaultHeaders = await this.getHeaders();
    const headers: Record<string, string> = {
      ...(defaultHeaders as Record<string, string>),
      ...((options.headers as Record<string, string>) || {}),
    };

    if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    const res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    });

    if (!res.ok) {
      let errorMessage = `Request failed with status ${res.status}`;
      let errorCode: string | undefined;
      let errorFields: Record<string, string[]> | undefined;

      try {
        const errorData = await res.json();
        if (errorData.message) errorMessage = errorData.message;
        if (errorData.code) errorCode = errorData.code;
        if (errorData.errors) {
          errorFields = errorData.errors;
          const firstErr = Object.values(errorData.errors).flat()[0];
          if (firstErr) errorMessage = String(firstErr);
        }
      } catch {
        // Non-JSON response
      }

      if (res.status === 401) {
        this.broadcastUnauthorized();
      }

      throw new ApiError(errorMessage, res.status, errorCode, errorFields);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return res.json() as Promise<T>;
  }

  public async get<T>(
    endpoint: string,
    options: { params?: Record<string, any>; headers?: Record<string, string> } = {}
  ): Promise<T> {
    let url = endpoint;
    if (options.params) {
      const sp = new URLSearchParams();
      Object.entries(options.params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          sp.append(k, String(v));
        }
      });
      const qs = sp.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }
    return this.request<T>(url, { method: 'GET', headers: options.headers });
  }

  public async post<T>(
    endpoint: string,
    body?: any,
    options: { headers?: Record<string, string> } = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      headers: options.headers,
    });
  }

  public async put<T>(
    endpoint: string,
    body?: any,
    options: { headers?: Record<string, string> } = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      headers: options.headers,
    });
  }

  public async delete<T>(
    endpoint: string,
    options: { headers?: Record<string, string> } = {}
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', headers: options.headers });
  }

  public async patch<T>(
    endpoint: string,
    body?: any,
    options: { headers?: Record<string, string> } = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      headers: options.headers,
    });
  }

  // --- System & First-Run Status ---

  async getSystemStatus(): Promise<{ installed: boolean; admin_exists: boolean; version?: string }> {
    return this.request<{ installed: boolean; admin_exists: boolean; version?: string }>('/system/status');
  }

  // --- Auth Endpoints ---

  async login(credentials: { email: string; password: string; remember?: boolean }): Promise<LoginResponse> {
    await this.csrf();
    const res = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (res.token) {
      this.setAuthToken(res.token);
    }
    if (res.user?.defaultOrganizationId) {
      this.setActiveOrganizationId(res.user.defaultOrganizationId);
    } else if (res.organizations && res.organizations.length > 0) {
      this.setActiveOrganizationId(res.organizations[0].id);
    }

    return res;
  }

  async mfaChallenge(challengeToken: string, code: string): Promise<LoginResponse> {
    const res = await this.request<LoginResponse>('/auth/mfa/challenge', {
      method: 'POST',
      body: JSON.stringify({ challengeToken, code }),
    });

    if (res.token) {
      this.setAuthToken(res.token);
    }
    if (res.user?.defaultOrganizationId) {
      this.setActiveOrganizationId(res.user.defaultOrganizationId);
    } else if (res.organizations && res.organizations.length > 0) {
      this.setActiveOrganizationId(res.organizations[0].id);
    }

    return res;
  }

  async register(payload: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    organization_name: string;
    slug?: string;
  }): Promise<{ message: string; token?: string; user: ApiUser; organization: ApiOrganization }> {
    await this.csrf();
    const res = await this.request<{ message: string; token?: string; user: ApiUser; organization: ApiOrganization }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    if (res.token) {
      this.setAuthToken(res.token);
    }
    if (res.organization?.id) {
      this.setActiveOrganizationId(res.organization.id);
    }

    return res;
  }

  async signup(payload: {
    name: string;
    email: string;
    password: string;
    password_confirmation?: string;
    company_name: string;
    industry?: string;
    region?: string;
    timezone?: string;
    terms_accepted?: boolean;
  }): Promise<{ message: string; token?: string; user: ApiUser; organization: ApiOrganization }> {
    await this.csrf();
    const res = await this.request<{ message: string; token?: string; user: ApiUser; organization: ApiOrganization }>(
      '/auth/signup',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    if (res.token) {
      this.setAuthToken(res.token);
    }
    if (res.organization?.id) {
      this.setActiveOrganizationId(res.organization.id);
    }

    return res;
  }

  async verifyEmail(id: string, hash: string): Promise<{ message: string; user: ApiUser }> {
    return this.request<{ message: string; user: ApiUser }>(`/auth/email/verify/${id}/${hash}`);
  }

  async resendVerification(email?: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/email/resend', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/password/forgot', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(payload: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getSessions(): Promise<ApiSession[]> {
    const res = await this.request<{ data: ApiSession[] }>('/auth/sessions');
    return res.data || [];
  }

  async revokeSession(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/auth/sessions/${id}`, {
      method: 'DELETE',
    });
  }

  async revokeOtherSessions(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/sessions', {
      method: 'DELETE',
    });
  }

  async getAdminAuthEvents(filters?: {
    user_id?: string;
    email?: string;
    event?: string;
    from?: string;
    to?: string;
    page?: number;
  }): Promise<PaginatedResponse<ApiAuthEvent>> {
    const params = new URLSearchParams();
    if (filters?.user_id) params.set('user_id', filters.user_id);
    if (filters?.email) params.set('email', filters.email);
    if (filters?.event) params.set('event', filters.event);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    if (filters?.page) params.set('page', String(filters.page));

    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedResponse<ApiAuthEvent>>(`/admin/auth-events${qs}`);
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setAuthToken(null);
      this.setActiveOrganizationId(null);
      this.broadcastUnauthorized();
    }
  }

  async logoutAll(): Promise<void> {
    try {
      await this.request('/auth/logout-all', { method: 'POST' });
    } finally {
      this.setAuthToken(null);
      this.setActiveOrganizationId(null);
      this.broadcastUnauthorized();
    }
  }

  async me(): Promise<{
    user: ApiUser;
    organizations: ApiOrganization[];
    defaultOrganization: ApiOrganization | null;
    permissions: string[];
    workloadSummary?: { activeTasksCount: number; weeklyCapacityHours: number };
  }> {
    const res = await this.request<{
      user: ApiUser;
      organizations: ApiOrganization[];
      defaultOrganization: ApiOrganization | null;
      permissions: string[];
      workloadSummary?: { activeTasksCount: number; weeklyCapacityHours: number };
    }>('/auth/me');

    // Auto-synchronize active tenant if not set or invalid
    if (res.defaultOrganization?.id && !this.activeOrgId) {
      this.setActiveOrganizationId(res.defaultOrganization.id);
    } else if (res.organizations?.length > 0 && !this.activeOrgId) {
      this.setActiveOrganizationId(res.organizations[0].id);
    }

    return res;
  }

  async updateProfile(payload: {
    name?: string;
    phone?: string | null;
    job_title?: string;
    department?: string;
    avatar_path?: string | null;
    skills?: string[];
  }): Promise<{ message: string; user: ApiUser }> {
    return this.request<{ message: string; user: ApiUser }>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async changePassword(payload: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/password/change', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- MFA Endpoints ---

  async setupMfa(): Promise<{ secret: string; qrCodeUri: string }> {
    return this.request<{ secret: string; qrCodeUri: string }>('/auth/mfa/setup', {
      method: 'POST',
    });
  }

  async confirmMfa(code: string): Promise<{ message: string; recoveryCodes: string[] }> {
    return this.request<{ message: string; recoveryCodes: string[] }>('/auth/mfa/confirm', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async disableMfa(password: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async getMfaRecoveryCodesStatus(): Promise<{ enabled: boolean; count: number; max: number }> {
    return this.request<{ enabled: boolean; count: number; max: number }>('/auth/mfa/recovery-codes/status');
  }

  async regenerateMfaRecoveryCodes(password: string): Promise<{ message: string; recoveryCodes: string[] }> {
    return this.request<{ message: string; recoveryCodes: string[] }>('/auth/mfa/recovery-codes/regenerate', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  // --- Organization & Tenancy Endpoints ---

  async createOrganization(payload: {
    name: string;
    slug?: string;
    industry?: string;
    region?: string;
    timezone?: string;
  }): Promise<{ message: string; organization: ApiOrganization }> {
    const res = await this.request<{ message: string; organization: ApiOrganization }>('/organizations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.organization?.id) {
      this.setActiveOrganizationId(res.organization.id);
    }
    return res;
  }

  async switchOrganization(organizationId: string): Promise<{
    message: string;
    organization: ApiOrganization;
    permissions: string[];
  }> {
    const res = await this.request<{
      message: string;
      organization: ApiOrganization;
      permissions: string[];
    }>('/organizations/switch', {
      method: 'POST',
      body: JSON.stringify({ organization_id: organizationId }),
    });

    this.setActiveOrganizationId(organizationId);
    return res;
  }

  async getCurrentOrganization(): Promise<{ organization: ApiOrganization }> {
    return this.request<{ organization: ApiOrganization }>('/organizations/current');
  }

  async updateCurrentOrganization(payload: {
    name?: string;
    billing_email?: string;
    timezone?: string;
    industry?: string;
    region?: string;
    default_calendar?: string;
    logo?: string;
    settings?: Record<string, any>;
  }): Promise<{ message: string; organization: ApiOrganization }> {
    return this.request<{ message: string; organization: ApiOrganization }>('/organizations/current', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async transferOwnership(newOwnerId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/organizations/current/transfer-ownership', {
      method: 'POST',
      body: JSON.stringify({ new_owner_id: newOwnerId }),
    });
  }

  async getMembers(): Promise<{ members: ApiOrganizationMember[] }> {
    return this.request<{ members: ApiOrganizationMember[] }>('/organizations/current/members');
  }

  async updateMemberRole(userId: string, role: string): Promise<{ message: string; member: ApiOrganizationMember }> {
    return this.request<{ message: string; member: ApiOrganizationMember }>(
      `/organizations/current/members/${userId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ role }),
      }
    );
  }

  async removeMember(userId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/organizations/current/members/${userId}`, {
      method: 'DELETE',
    });
  }

  async getInvitations(): Promise<{ invitations: ApiOrganizationInvitation[] }> {
    return this.request<{ invitations: ApiOrganizationInvitation[] }>('/organizations/invitations');
  }

  async inviteMember(
    email: string,
    role: string
  ): Promise<{ message: string; invitation: ApiOrganizationInvitation; inviteUrl: string }> {
    return this.request<{ message: string; invitation: ApiOrganizationInvitation; inviteUrl: string }>(
      '/organizations/invitations',
      {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      }
    );
  }

  async inviteByOrgId(
    organizationId: string,
    email: string,
    role: string
  ): Promise<{ message: string; invitation: ApiOrganizationInvitation; inviteUrl: string }> {
    return this.request<{ message: string; invitation: ApiOrganizationInvitation; inviteUrl: string }>(
      `/organizations/${organizationId}/invitations`,
      {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      }
    );
  }

  async revokeInvitation(invitationId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/organizations/invitations/${invitationId}`, {
      method: 'DELETE',
    });
  }

  async resendInvitation(
    invitationId: string
  ): Promise<{ message: string; invitation: ApiOrganizationInvitation; inviteUrl: string }> {
    return this.request<{ message: string; invitation: ApiOrganizationInvitation; inviteUrl: string }>(
      `/organizations/invitations/${invitationId}/resend`,
      {
        method: 'POST',
      }
    );
  }

  async acceptInvitation(token: string): Promise<{ message: string; organization: ApiOrganization }> {
    const res = await this.request<{ message: string; organization: ApiOrganization }>(
      '/organizations/invitations/accept',
      {
        method: 'POST',
        body: JSON.stringify({ token }),
      }
    );

    if (res.organization?.id) {
      this.setActiveOrganizationId(res.organization.id);
    }
    return res;
  }

  async acceptInvitationByToken(
    token: string,
    payload: { name?: string; password?: string } = {}
  ): Promise<{ message: string; user?: any; token?: string }> {
    const res = await this.request<{ message: string; user?: any; token?: string }>(
      `/invitations/${token}/accept`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res;
  }

  // --- Users Endpoints ---

  async getUsers(
    params: { search?: string; status?: string; department?: string; page?: number } = {}
  ): Promise<PaginatedResponse<ApiUser>> {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.status) searchParams.set('status', params.status);
    if (params.department) searchParams.set('department', params.department);
    if (params.page) searchParams.set('page', String(params.page));

    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<PaginatedResponse<ApiUser>>(`/users${qs}`);
  }

  async createUser(payload: {
    name: string;
    email: string;
    password?: string;
    phone?: string | null;
    avatarUrl?: string | null;
    jobTitle?: string | null;
    department?: string | null;
    weeklyCapacityHours?: number;
    status?: 'active' | 'on_leave' | 'inactive';
    color?: string;
    skills?: string[];
    roles?: string[];
  }): Promise<{ message: string; data: ApiUser }> {
    return this.request<{ message: string; data: ApiUser }>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateUser(
    id: string,
    payload: {
      name?: string;
      email?: string;
      password?: string;
      phone?: string | null;
      avatarUrl?: string | null;
      jobTitle?: string | null;
      department?: string | null;
      weeklyCapacityHours?: number;
      status?: 'active' | 'on_leave' | 'inactive';
      color?: string;
      skills?: string[];
      roles?: string[];
    }
  ): Promise<{ message: string; data: ApiUser }> {
    return this.request<{ message: string; data: ApiUser }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Roles & Permissions Endpoints ---

  async getRoles(): Promise<{ data: ApiRole[] }> {
    return this.request<{ data: ApiRole[] }>('/roles');
  }

  async getPermissions(): Promise<{ data: Record<string, ApiPermission[]> }> {
    return this.request<{ data: Record<string, ApiPermission[]> }>('/permissions');
  }

  async createRole(payload: {
    name: string;
    displayName: string;
    description?: string;
    permissions: string[];
  }): Promise<{ data: ApiRole }> {
    return this.request<{ data: ApiRole }>('/roles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateRole(
    id: string,
    payload: {
      displayName?: string;
      description?: string;
      permissions?: string[];
    }
  ): Promise<{ message: string; data: ApiRole }> {
    return this.request<{ message: string; data: ApiRole }>(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteRole(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/roles/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Phase 3: System Installation Endpoints ---

  async getInstallStatus(): Promise<{ is_installed: boolean; app_version: string; installed_at?: string }> {
    return this.request('/system/install/status');
  }

  async installSystem(payload: {
    name: string;
    email: string;
    password: string;
    organization_name: string;
    industry?: string;
    region?: string;
  }): Promise<{ message: string; admin_user: any; organization: any }> {
    return this.request('/system/install', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Phase 3: Onboarding & Interactive Tour Endpoints ---

  async getOnboardingProgress(): Promise<{ data: ApiOnboardingProgress }> {
    return this.request('/onboarding/progress');
  }

  async saveOnboardingStep(step: number, data: any): Promise<{ data: ApiOnboardingProgress }> {
    return this.request(`/onboarding/step/${step}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async skipOnboardingStep(step: number): Promise<{ data: ApiOnboardingProgress }> {
    return this.request(`/onboarding/step/${step}/skip`, {
      method: 'POST',
    });
  }

  async completeOnboardingTour(): Promise<{ data: ApiOnboardingProgress }> {
    return this.request('/onboarding/tour/complete', {
      method: 'POST',
    });
  }

  // --- Phase 3: Sample Project Opt-in & Purge Endpoints ---

  async optInSampleData(): Promise<{ message: string; project: any }> {
    return this.request('/sample-data/opt-in', {
      method: 'POST',
    });
  }

  async purgeSampleData(): Promise<{ message: string }> {
    return this.request('/sample-data/purge', {
      method: 'DELETE',
    });
  }

  // --- Phase 3: Project Templates Endpoints ---

  async getTemplates(search?: string, industry?: string): Promise<{ data: ApiProjectTemplate[] }> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (industry && industry !== 'all') params.append('industry', industry);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/templates${qs}`);
  }

  async getTemplate(id: string): Promise<{ data: ApiProjectTemplate }> {
    return this.request(`/templates/${id}`);
  }

  async instantiateTemplate(
    id: string,
    payload: { name?: string; code?: string }
  ): Promise<{ message: string; project: any }> {
    return this.request(`/templates/${id}/instantiate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async saveAsTemplate(
    projectId: string,
    payload: { name: string; description?: string; industry?: string; category?: string }
  ): Promise<{ data: ApiProjectTemplate }> {
    return this.request(`/projects/${projectId}/save-as-template`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteTemplate(id: string): Promise<{ message: string }> {
    return this.request(`/templates/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Phase 3: Bulk Task Import with Dry-Run Endpoints ---

  async importTasks(
    projectId: string,
    formData: FormData
  ): Promise<ApiImportDryRunResult> {
    return this.request(`/projects/${projectId}/tasks/import`, {
      method: 'POST',
      body: formData,
    });
  }

  // --- Phase 4: Collaboration, Comments & Reactions ---

  async getTaskComments(projectId: string, taskId: string): Promise<{ data: ApiTaskComment[] }> {
    return this.request(`/projects/${projectId}/tasks/${taskId}/comments`);
  }

  async createTaskComment(
    projectId: string,
    taskId: string,
    payload: { content: string; parent_comment_id?: string | null }
  ): Promise<{ data: ApiTaskComment }> {
    return this.request(`/projects/${projectId}/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateTaskComment(
    projectId: string,
    taskId: string,
    commentId: string,
    payload: { content: string }
  ): Promise<{ data: ApiTaskComment }> {
    return this.request(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteTaskComment(
    projectId: string,
    taskId: string,
    commentId: string
  ): Promise<{ message: string }> {
    return this.request(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  async toggleCommentReaction(
    commentId: string,
    emoji: string
  ): Promise<{ action: 'added' | 'removed'; reactions: Record<string, ApiCommentReaction> }> {
    return this.request(`/comments/${commentId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  }

  async deleteCommentReaction(
    commentId: string,
    emoji: string
  ): Promise<{ action: string; reactions: Record<string, ApiCommentReaction> }> {
    return this.request(`/comments/${commentId}/reactions/${encodeURIComponent(emoji)}`, {
      method: 'DELETE',
    });
  }

  // --- Phase 4: Task Watchers ---

  async getTaskWatchers(
    projectId: string,
    taskId: string
  ): Promise<{ data: ApiTaskWatcher[]; is_watching: boolean }> {
    return this.request(`/projects/${projectId}/tasks/${taskId}/watchers`);
  }

  async watchTask(
    projectId: string,
    taskId: string
  ): Promise<{ message: string; is_watching: boolean; watcher?: ApiTaskWatcher }> {
    return this.request(`/projects/${projectId}/tasks/${taskId}/watch`, {
      method: 'POST',
    });
  }

  async unwatchTask(
    projectId: string,
    taskId: string
  ): Promise<{ message: string; is_watching: boolean }> {
    return this.request(`/projects/${projectId}/tasks/${taskId}/watch`, {
      method: 'DELETE',
    });
  }

  // --- Phase 4: Activity Feed ---

  async getProjectActivity(
    projectId: string,
    limit: number = 20
  ): Promise<{ data: ApiActivityEvent[]; meta?: any }> {
    return this.request(`/projects/${projectId}/activity?limit=${limit}`);
  }

  async getTaskActivity(
    projectId: string,
    taskId: string,
    limit: number = 20
  ): Promise<{ data: ApiActivityEvent[]; meta?: any }> {
    return this.request(`/projects/${projectId}/tasks/${taskId}/activity?limit=${limit}`);
  }

  // --- Phase 4: Task Attachments ---

  async getTaskAttachments(
    projectId: string,
    taskId: string
  ): Promise<{ data: ApiAttachment[] }> {
    return this.request(`/projects/${projectId}/tasks/${taskId}/attachments`);
  }

  async uploadTaskAttachment(
    projectId: string,
    taskId: string,
    file: File
  ): Promise<{ data: ApiAttachment }> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;
    if (this.activeOrgId) headers['X-Organization-Id'] = this.activeOrgId;

    const res = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks/${taskId}/attachments`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(err.message || 'File upload failed', res.status, err.code, err.errors);
    }

    return res.json();
  }

  getAttachmentDownloadUrl(projectId: string, taskId: string, attachmentId: string): string {
    return `${API_BASE_URL}/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}/download`;
  }

  async deleteTaskAttachment(
    projectId: string,
    taskId: string,
    attachmentId: string
  ): Promise<{ message: string }> {
    return this.request(`/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
  }

  // --- Phase 4: Notifications ---

  async getNotifications(
    unreadOnly: boolean = false,
    limit: number = 20
  ): Promise<{ data: ApiNotification[]; meta: { unread_count: number; total: number } }> {
    const qs = `?unread_only=${unreadOnly}&limit=${limit}`;
    return this.request(`/notifications${qs}`);
  }

  async getUnreadNotificationsCount(): Promise<{ unread_count: number }> {
    return this.request('/notifications/unread-count');
  }

  async markNotificationAsRead(
    notificationId: string
  ): Promise<{ message: string; notification: ApiNotification }> {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsAsRead(): Promise<{ message: string; marked_count: number }> {
    return this.request('/notifications/read-all', {
      method: 'PUT',
    });
  }

  // --- Phase 4: Notification Preferences ---

  async getNotificationPreferences(): Promise<{ data: ApiNotificationPreference[] }> {
    return this.request('/notification-preferences');
  }

  async updateNotificationPreferences(
    preferences: ApiNotificationPreference[]
  ): Promise<{ message: string; data: ApiNotificationPreference[] }> {
    return this.request('/notification-preferences', {
      method: 'PUT',
      body: JSON.stringify({ preferences }),
    });
  }
}

export const apiClient = new ApiClient();
