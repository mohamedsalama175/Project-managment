import React from 'react';
import { useAuthStore } from '../../stores/useAuthStore';

interface RoleGuardProps {
  allowed: string[];
  fallback?: string;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowed, fallback = '/tasks', children }) => {
  const { user } = useAuthStore();

  const userRoles = user?.roles || (user?.primaryRole ? [user.primaryRole] : []);
  const hasAccess = userRoles.some((role) => allowed.includes(role));

  if (!hasAccess) {
    if (typeof window !== 'undefined' && fallback) {
      window.location.href = fallback;
    }
    return null;
  }

  return <>{children}</>;
};

export default RoleGuard;
