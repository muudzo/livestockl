import { useMemo, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { fetchUserMemberships, type Tenant, type TenantMembership } from '../../lib/tenant';
import { TenantContext, type TenantContextValue } from './TenantContext';

/**
 * Resolves the current tenant from one of two sources:
 *   1. URL — when the route matches /t/:tenantSlug/* the slug param drives selection
 *   2. User's first membership — fallback when on a root path (e.g. /, /payments)
 *
 * Memberships are fetched via React Query so useTenantUpdate's
 * invalidateQueries(['tenant-memberships']) propagates the new config into
 * every consumer without a manual refetch.
 */
export function TenantProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const { tenantSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { data: memberships = [], isLoading } = useQuery<TenantMembership[]>({
    queryKey: ['tenant-memberships', user?.id ?? null],
    enabled: !!user,
    queryFn: () => (user ? fetchUserMemberships(user.id) : Promise.resolve([])),
  });

  const { tenant, role } = useMemo<{ tenant: Tenant | null; role: TenantContextValue['role'] }>(() => {
    if (memberships.length === 0) return { tenant: null, role: null };

    if (tenantSlug) {
      const match = memberships.find((m) => m.tenant.slug === tenantSlug);
      if (match) return { tenant: match.tenant, role: match.role };
      // Slug in URL but user isn't a member — fall back to primary
    }
    return { tenant: memberships[0].tenant, role: memberships[0].role };
  }, [memberships, tenantSlug]);

  const switchTenant = (slug: string) => {
    // Strip an existing /t/<slug> prefix from the current path then re-prefix.
    const without = location.pathname.replace(/^\/t\/[^/]+/, '');
    const sub = without === '' ? '/' : without;
    navigate(`/t/${slug}${sub === '/' ? '' : sub}`);
  };

  const value: TenantContextValue = {
    tenant,
    memberships,
    role,
    loading: isLoading,
    switchTenant,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}
