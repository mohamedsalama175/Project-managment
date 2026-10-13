import { create } from 'zustand';
import {
  apiClient,
  ApiUser,
  ApiOrganization,
  ApiSession,
  ApiError,
} from '../api/client';

interface AuthState {
  user: ApiUser | null;
  currentOrganization: ApiOrganization | null;
  organizations: ApiOrganization[];
  permissions: string[];
  sessions: ApiSession[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isMfaRequired: boolean;
  mfaChallengeToken: string | null;
  error: string | null;
  errorCode: string | null;

  // Actions
  login: (email: string, password: string, remember?: boolean) => Promise<{ success: boolean; mfaRequired?: boolean; error?: string; code?: string }>;
  challengeMfa: (code: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  cancelMfa: () => void;
  signup: (payload: {
    name: string;
    email: string;
    password: string;
    password_confirmation?: string;
    company_name: string;
    industry?: string;
    region?: string;
    terms_accepted?: boolean;
  }) => Promise<{ success: boolean; error?: string; code?: string }>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    organization_name: string;
    slug?: string;
  }) => Promise<{ success: boolean; error?: string; code?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (payload: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => Promise<{ success: boolean; message: string }>;
  fetchSessions: () => Promise<void>;
  revokeSession: (id: string) => Promise<boolean>;
  revokeOtherSessions: () => Promise<boolean>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  checkAuth: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  can: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Listen for multi-tab logout and unauthorized broadcasts
  if (typeof window !== 'undefined') {
    window.addEventListener('deliverops:unauthorized', () => {
      set({
        user: null,
        currentOrganization: null,
        organizations: [],
        permissions: [],
        isAuthenticated: false,
        isMfaRequired: false,
        mfaChallengeToken: null,
      });
    });

    window.addEventListener('storage', (e) => {
      if (e.key === 'deliverops_auth_event') {
        try {
          const payload = JSON.parse(e.newValue || '{}');
          if (payload.type === 'logout') {
            set({
              user: null,
              currentOrganization: null,
              organizations: [],
              permissions: [],
              isAuthenticated: false,
            });
          }
        } catch {
          // Ignore json parse error
        }
      }
    });
  }

  return {
    user: null,
    currentOrganization: null,
    organizations: [],
    permissions: [],
    sessions: [],
    isAuthenticated: false,
    isLoading: false,
    isMfaRequired: false,
    mfaChallengeToken: null,
    error: null,
    errorCode: null,

    can: (permission: string) => {
      const { permissions, user } = get();
      if (!user) return false;
      // Admin role has blanket wildcard permission
      if (user.roles?.includes('admin') || user.primaryRole === 'admin') return true;
      return permissions.includes(permission) || permissions.includes('*');
    },

    hasRole: (role: string) => {
      const { user } = get();
      if (!user) return false;
      return user.roles?.includes(role) || user.primaryRole === role || false;
    },

    clearError: () => set({ error: null, errorCode: null }),

    cancelMfa: () => set({ isMfaRequired: false, mfaChallengeToken: null, error: null }),

    login: async (email: string, password: string, remember = false) => {
      set({ isLoading: true, error: null, errorCode: null });
      try {
        const response = await apiClient.login({ email, password, remember });

        if (response.code === 'AUTH_MFA_REQUIRED' || response.mfa_required || response.challengeToken) {
          set({
            isLoading: false,
            isMfaRequired: true,
            mfaChallengeToken: response.challengeToken || null,
            error: null,
            errorCode: 'AUTH_MFA_REQUIRED',
          });
          return { success: false, mfaRequired: true };
        }

        const user = response.user || null;
        const orgs = response.organizations || (user?.organizations) || [];
        const currentOrg = response.currentOrganization || user?.defaultOrganization || (orgs[0] ?? null);

        set({
          user,
          currentOrganization: currentOrg,
          organizations: orgs,
          permissions: response.permissions || [],
          isAuthenticated: true,
          isLoading: false,
          isMfaRequired: false,
          mfaChallengeToken: null,
          error: null,
          errorCode: null,
        });

        return { success: true };
      } catch (err: any) {
        const message = err?.message || 'Login failed';
        const code = err instanceof ApiError ? err.code : undefined;
        set({
          error: message,
          errorCode: code || null,
          isLoading: false,
        });
        return { success: false, error: message, code };
      }
    },

    challengeMfa: async (code: string) => {
      const { mfaChallengeToken } = get();
      if (!mfaChallengeToken) {
        set({ error: 'MFA session expired. Please sign in again.' });
        return { success: false, error: 'MFA session expired.' };
      }

      set({ isLoading: true, error: null, errorCode: null });
      try {
        const response = await apiClient.mfaChallenge(mfaChallengeToken, code);
        const user = response.user || null;
        const orgs = response.organizations || (user?.organizations) || [];
        const currentOrg = response.currentOrganization || user?.defaultOrganization || (orgs[0] ?? null);

        set({
          user,
          currentOrganization: currentOrg,
          organizations: orgs,
          permissions: response.permissions || [],
          isAuthenticated: true,
          isLoading: false,
          isMfaRequired: false,
          mfaChallengeToken: null,
          error: null,
          errorCode: null,
        });

        return { success: true };
      } catch (err: any) {
        const message = err?.message || 'Invalid two-factor code.';
        const errCode = err instanceof ApiError ? err.code : undefined;
        set({
          error: message,
          errorCode: errCode || null,
          isLoading: false,
        });
        return { success: false, error: message, code: errCode };
      }
    },

    signup: async (payload) => {
      set({ isLoading: true, error: null, errorCode: null });
      try {
        const res = await apiClient.signup(payload);
        const user = res.user;
        const org = res.organization;

        set({
          user,
          currentOrganization: org,
          organizations: [org],
          permissions: ['*'],
          isAuthenticated: true,
          isLoading: false,
          isMfaRequired: false,
          mfaChallengeToken: null,
          error: null,
          errorCode: null,
        });

        return { success: true };
      } catch (err: any) {
        const message = err?.message || 'Signup failed.';
        const code = err instanceof ApiError ? err.code : undefined;
        set({
          error: message,
          errorCode: code || null,
          isLoading: false,
        });
        return { success: false, error: message, code };
      }
    },

    register: async (payload) => {
      set({ isLoading: true, error: null, errorCode: null });
      try {
        const res = await apiClient.register(payload);
        const user = res.user;
        const org = res.organization;

        set({
          user,
          currentOrganization: org,
          organizations: [org],
          permissions: ['*'],
          isAuthenticated: true,
          isLoading: false,
          isMfaRequired: false,
          mfaChallengeToken: null,
          error: null,
          errorCode: null,
        });

        return { success: true };
      } catch (err: any) {
        const message = err?.message || 'Registration failed.';
        const code = err instanceof ApiError ? err.code : undefined;
        set({
          error: message,
          errorCode: code || null,
          isLoading: false,
        });
        return { success: false, error: message, code };
      }
    },

    forgotPassword: async (email: string) => {
      set({ isLoading: true, error: null });
      try {
        const res = await apiClient.forgotPassword(email);
        set({ isLoading: false });
        return { success: true, message: res.message };
      } catch (err: any) {
        const msg = err?.message || 'Password reset request failed';
        set({ isLoading: false, error: msg });
        return { success: false, message: msg };
      }
    },

    resetPassword: async (payload) => {
      set({ isLoading: true, error: null });
      try {
        const res = await apiClient.resetPassword(payload);
        set({ isLoading: false });
        return { success: true, message: res.message };
      } catch (err: any) {
        const msg = err?.message || 'Password reset failed';
        set({ isLoading: false, error: msg });
        return { success: false, message: msg };
      }
    },

    fetchSessions: async () => {
      try {
        const sessions = await apiClient.getSessions();
        set({ sessions });
      } catch {
        // Non-blocking
      }
    },

    revokeSession: async (id: string) => {
      try {
        await apiClient.revokeSession(id);
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
        }));
        return true;
      } catch {
        return false;
      }
    },

    revokeOtherSessions: async () => {
      try {
        await apiClient.revokeOtherSessions();
        set((state) => ({
          sessions: state.sessions.filter((s) => s.is_current),
        }));
        return true;
      } catch {
        return false;
      }
    },

    logout: async () => {
      set({ isLoading: true });
      try {
        await apiClient.logout();
      } catch {
        // Ignored
      } finally {
        set({
          user: null,
          currentOrganization: null,
          organizations: [],
          permissions: [],
          isAuthenticated: false,
          isLoading: false,
          isMfaRequired: false,
          mfaChallengeToken: null,
          error: null,
          errorCode: null,
        });
      }
    },

    logoutAll: async () => {
      set({ isLoading: true });
      try {
        await apiClient.logoutAll();
      } catch {
        // Ignored
      } finally {
        set({
          user: null,
          currentOrganization: null,
          organizations: [],
          permissions: [],
          isAuthenticated: false,
          isLoading: false,
          isMfaRequired: false,
          mfaChallengeToken: null,
          error: null,
          errorCode: null,
        });
      }
    },

    switchOrganization: async (organizationId: string) => {
      set({ isLoading: true, error: null });
      try {
        const res = await apiClient.switchOrganization(organizationId);
        set((state) => ({
          currentOrganization: res.organization,
          permissions: res.permissions,
          isLoading: false,
          user: state.user
            ? { ...state.user, defaultOrganizationId: res.organization.id }
            : null,
        }));
        return true;
      } catch (err: any) {
        set({
          error: err?.message || 'Failed to switch organization',
          isLoading: false,
        });
        return false;
      }
    },

    checkAuth: async () => {
      set({ isLoading: true });
      try {
        const res = await apiClient.me();
        const activeOrgId = apiClient.getActiveOrganizationId();
        const activeOrg =
          res.organizations.find((o) => o.id === activeOrgId) ||
          res.defaultOrganization ||
          res.organizations[0] ||
          null;

        if (activeOrg) {
          apiClient.setActiveOrganizationId(activeOrg.id);
        }

        set({
          user: res.user,
          organizations: res.organizations,
          currentOrganization: activeOrg,
          permissions: res.permissions,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          errorCode: null,
        });
      } catch {
        set({
          user: null,
          currentOrganization: null,
          organizations: [],
          permissions: [],
          isAuthenticated: false,
          isLoading: false,
        });
      }
    },

    refreshUser: async () => {
      try {
        const res = await apiClient.me();
        set((state) => ({
          user: res.user,
          organizations: res.organizations,
          currentOrganization:
            res.organizations.find((o) => o.id === state.currentOrganization?.id) ||
            res.defaultOrganization ||
            res.organizations[0] ||
            null,
          permissions: res.permissions,
        }));
      } catch {
        // Silent fail
      }
    },
  };
});
