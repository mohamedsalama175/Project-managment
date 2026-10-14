import { useAuthStore } from '../stores/useAuthStore';
import type { ApiUser } from '../api/client';

export const redirectAfterLogin = (user: { roles?: string[]; primaryRole?: string } | null | undefined): string => {
  if (user?.roles?.includes('field_engineer') || user?.primaryRole === 'field_engineer') {
    return '/tasks'; // not /dashboard
  }
  if (user?.roles?.includes('admin') || user?.primaryRole === 'admin') {
    return '/dashboard';
  }
  return '/dashboard';
};

export const useAuth = () => {
  const store = useAuthStore();
  return {
    ...store,
    redirectAfterLogin,
  };
};

export default useAuth;
