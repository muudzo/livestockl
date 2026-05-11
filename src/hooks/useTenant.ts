import { useContext } from 'react';
import { TenantContext, type TenantContextValue } from '../app/components/TenantContext';

/**
 * Access the currently-resolved tenant + the user's full membership list.
 * Must be used inside a <TenantProvider>.
 *
 *   const { tenant, memberships, role, switchTenant } = useTenant();
 *
 * tenant is null only during the brief loading window before memberships
 * resolve. Components that care should render a skeleton while tenant is
 * null; components that don't can fall back to a default tenant slug.
 */
export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error('useTenant must be used inside a <TenantProvider>');
  }
  return ctx;
}
