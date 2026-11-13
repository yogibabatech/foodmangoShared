import type { UserRole } from '../../src';
import { useEffect } from 'react';
import { useAuth } from '../store/auth';

/**
 * Logs out a person whose role this app is not for. It covers a login saved before the apps were
 * split (a rider still signed in to the customer app, say), so nobody is left on a blank screen.
 */
export function useRoleGate(allowed: UserRole[]): void {
  const role = useAuth((s) => (s.status === 'signedIn' ? (s.user?.role ?? null) : null));
  const key = allowed.join(',');
  useEffect(() => {
    if (role && !key.split(',').includes(role)) void useAuth.getState().logout();
  }, [role, key]);
}
