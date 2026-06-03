import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Tenant, TenantConfig } from '../lib/tenant';

interface UpdateInput {
  tenantId: string;
  config?: Partial<TenantConfig>;
  name?: string;
}

/**
 * Update a tenant's config (and optionally name, for admins). RLS gates who
 * is allowed to change what — operators get a "config columns only" policy,
 * admins get the full row.
 */
export function useTenantUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, config, name }: UpdateInput): Promise<Tenant> => {
      if (!isSupabaseConfigured) {
        // Demo-mode no-op — return a synthetic merged tenant so the UI updates
        throw new Error('Tenant editing is disabled in demo mode');
      }

      // Build the patch: merge config into existing JSONB on the server side
      // by reading current, merging, then writing back. Cheaper than a JSONB
      // operator dance and avoids losing keys the UI didn't know about.
      const { data: current, error: readErr } = await supabase
        .from('tenants')
        .select('config')
        .eq('id', tenantId)
        .single();
      if (readErr || !current) throw readErr ?? new Error('Tenant not found');

      const mergedConfig = config
        ? { ...(current.config as Record<string, unknown>), ...config }
        : (current.config as Record<string, unknown>);

      const patch: { config: Record<string, unknown>; name?: string } = { config: mergedConfig };
      if (name !== undefined) patch.name = name;

      const { data, error } = await supabase
        .from('tenants')
        .update(patch as never)
        .eq('id', tenantId)
        .select('*')
        .single();

      if (error) throw error;
      return data as unknown as Tenant;
    },
    onSuccess: () => {
      // Invalidate everything that depends on tenant config. For v0 that's
      // just the memberships query (which embeds the tenant row). Future
      // listing/payment rules that read commission % should invalidate too.
      queryClient.invalidateQueries({ queryKey: ['tenant-memberships'] });
    },
  });
}
