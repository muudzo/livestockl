import { useState } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';

/**
 * Tenant switcher dropdown. Renders nothing for single-tenant users — the
 * UI shouldn't ask people to pick between options that don't exist.
 *
 * Compact variant is used inside the drawer; `compact={false}` is a wider
 * variant for use in a top header if/when one is added.
 */
export function TenantSwitcher({ compact = true }: { compact?: boolean }) {
  const { tenant, memberships, switchTenant } = useTenant();
  const [open, setOpen] = useState(false);

  if (memberships.length < 2 || !tenant) return null;

  if (compact) {
    return (
      <div className="px-5 py-3 border-b border-foreground/5 bg-foreground/[0.015]">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
          Auction tenant
        </p>
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
            <span className="text-[13px] font-bold truncate">{tenant.name}</span>
          </div>
          <ChevronDown
            className={`w-3 h-3 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div className="mt-2 -mx-2 border-t border-foreground/5 pt-2">
            {memberships.map((m) => {
              const active = m.tenant.id === tenant.id;
              return (
                <button
                  key={m.tenant.id}
                  onClick={() => {
                    switchTenant(m.tenant.slug);
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-foreground/[0.03] transition-colors"
                >
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-[12px] font-medium truncate">{m.tenant.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                      {m.role}
                    </span>
                  </div>
                  {active && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Wide variant (placeholder for future top-header layout)
  return (
    <button
      onClick={() => setOpen(!open)}
      className="flex items-center gap-2 px-3 py-1.5 rounded border border-foreground/10 hover:border-foreground/20 transition-colors"
    >
      <Building2 className="w-3.5 h-3.5" strokeWidth={1.5} />
      <span className="text-[12px] font-medium">{tenant.name}</span>
      <ChevronDown className="w-3 h-3" />
    </button>
  );
}
