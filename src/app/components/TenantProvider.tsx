import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useAuthStore } from '../../stores/authStore';
import { fetchUserMemberships, type Tenant, type TenantMembership } from '../../lib/tenant';
import { TenantContext, type TenantContextValue } from './TenantContext';

/**
 * Resolves the current tenant from one of two sources:
 *   1. URL — when the route matches /t/:tenantSlug/* the slug param drives selection
 *   2. User's first membership — fallback when on a root path (e.g. /, /payments)
 *
 * Memberships are fetched once per user. The provider exposes a switchTenant(slug)
 * callback that rewrites the URL to /t/<slug>/<currentSubpath>, which causes the
 * provider to re-resolve.
 */
export function TenantProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const { tenantSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setMemberships([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchUserMemberships(user.id).then((rows) => {
      if (cancelled) return;
      setMemberships(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

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
    loading,
    switchTenant,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}
