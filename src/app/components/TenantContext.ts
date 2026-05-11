import { createContext } from 'react';
import type { Tenant, TenantMembership, TenantRole } from '../../lib/tenant';

export interface TenantContextValue {
  tenant: Tenant | null;
  memberships: TenantMembership[];
  role: TenantRole | null;
  loading: boolean;
  /** Navigate to /t/<slug>/<currentSubpath>. */
  switchTenant: (slug: string) => void;
}

export const TenantContext = createContext<TenantContextValue | null>(null);
