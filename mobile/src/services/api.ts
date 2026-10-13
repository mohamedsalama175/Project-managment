/**
 * DeliverOps Mobile API Client
 * Wraps REST endpoints with Bearer authentication and Push Token registration.
 */

const BASE_URL = 'https://app.deliverops.com/api/v1';

export class MobileApiClient {
  private static token: string | null = null;
  private static organizationId: string | null = null;

  static setAuth(token: string | null, orgId: string | null) {
    this.token = token;
    this.organizationId = orgId;
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (this.organizationId) {
      headers['X-Organization-Id'] = this.organizationId;
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: { ...headers, ...((options.headers as any) || {}) },
    });

    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${await res.text()}`);
    }

    if (res.status === 204) return {} as T;
    return res.json();
  }

  static async getTasks(): Promise<any[]> {
    const data = await this.request<{ data: any[] }>('/tasks');
    return data.data || [];
  }

  static async createTask(task: { name: string; project_id: string; description?: string }): Promise<any> {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  static async registerPushToken(platform: 'ios' | 'android', token: string, deviceName?: string): Promise<any> {
    return this.request('/push/tokens', {
      method: 'POST',
      body: JSON.stringify({ platform, token, device_name: deviceName }),
    });
  }
}
