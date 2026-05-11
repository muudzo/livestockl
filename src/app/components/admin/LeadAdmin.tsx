import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  Loader2,
  RefreshCw,
  Copy,
  Check,
  ShieldAlert,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { isSuperAdmin, listLeads, approveLead, type AdminLead, type LeadStatus } from '../../../lib/admin';
import { Button } from '../ui/button';

/**
 * /admin/leads — super-admin triage queue for the SaPS discovery pipeline.
 *
 * Email-allowlist gated (VITE_SUPER_ADMIN_EMAILS + the same env var on the
 * server). Lists leads filtered by pipeline status; approving a lead
 * generates a one-time onboard_token via the approve-lead edge function
 * and (best-effort) emails the operator the wizard URL for Slice 4.
 */
export function LeadAdmin() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('new');

  if (!isSuperAdmin(user)) {
    return <NotAuthorized />;
  }

  return (
    <div className="p-4 pb-24 space-y-5">
      <Header onBack={() => navigate(-1)} />
      <FilterBar value={statusFilter} onChange={setStatusFilter} />
      <LeadList status={statusFilter} />
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onBack}
        aria-label="Back"
        className="w-9 h-9 flex items-center justify-center rounded hover:bg-foreground/[0.04] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <div className="min-w-0">
        <h1 className="text-lg font-bold tracking-tight leading-tight truncate">
          Lead pipeline
        </h1>
        <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mt-0.5">
          SaPS discovery · super-admin
        </p>
      </div>
    </div>
  );
}

const STATUS_FILTERS: Array<{ value: LeadStatus | 'all'; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'onboarded', label: 'Onboarded' },
  { value: 'dropped', label: 'Dropped' },
  { value: 'all', label: 'All' },
];

function FilterBar({
  value,
  onChange,
}: {
  value: LeadStatus | 'all';
  onChange: (v: LeadStatus | 'all') => void;
}) {
  const queryClient = useQueryClient();
  return (
    <div className="flex flex-wrap items-center gap-2 border-y border-foreground/5 py-3">
      {STATUS_FILTERS.map((f) => {
        const active = value === f.value;
        return (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className={`px-3 py-1.5 rounded text-[11px] font-mono uppercase tracking-wider transition-colors ${
              active
                ? 'bg-foreground text-background'
                : 'bg-foreground/[0.04] text-foreground/70 hover:bg-foreground/[0.08]'
            }`}
          >
            {f.label}
          </button>
        );
      })}
      <button
        onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-leads'] })}
        className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono uppercase tracking-wider text-foreground/70 hover:bg-foreground/[0.04] transition-colors"
        aria-label="Refresh"
      >
        <RefreshCw className="w-3 h-3" />
        Refresh
      </button>
    </div>
  );
}

function LeadList({ status }: { status: LeadStatus | 'all' }) {
  const { data, isLoading, error } = useQuery<AdminLead[], Error>({
    queryKey: ['admin-leads', status],
    queryFn: () => listLeads(status === 'all' ? undefined : status),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 text-red-900 p-4 rounded text-[13px]">
        Failed to load leads: {error.message}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-[13px]">No leads in this pipeline state.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {data.map((lead) => (
        <LeadCard key={lead.id} lead={lead} />
      ))}
    </ul>
  );
}

// ── Lead card with expand + approve ───────────────────────────────────────

function LeadCard({ lead }: { lead: AdminLead }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="border border-foreground/10 rounded overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-foreground/[0.02] transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <StatusPill status={lead.status} />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              {formatRelative(lead.created_at)}
            </span>
          </div>
          <h3 className="font-bold text-[15px] tracking-tight leading-tight truncate">
            {lead.auction_house_name}
            {lead.town && <span className="font-normal text-muted-foreground"> · {lead.town}</span>}
          </h3>
          <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
            {lead.contact_name} · {lead.contact_email} · {lead.contact_phone}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 mt-1 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && <LeadDetail lead={lead} />}
    </li>
  );
}

function LeadDetail({ lead }: { lead: AdminLead }) {
  return (
    <div className="border-t border-foreground/5 px-4 py-4 space-y-4 bg-foreground/[0.015]">
      <DetailRow label="Lots / week">{prettyLots(lead.lots_per_week)}</DetailRow>
      <DetailRow label="Payment rail today">{prettyRail(lead.current_payment_rail)}</DetailRow>
      <div>
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
          Biggest friction
        </p>
        <p className="text-[13px] leading-relaxed text-foreground/90">{lead.biggest_friction}</p>
      </div>

      <ApprovalActions lead={lead} />
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 text-[12px]">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground w-24 shrink-0">
        {label}
      </span>
      <span className="text-foreground/80">{children}</span>
    </div>
  );
}

function ApprovalActions({ lead }: { lead: AdminLead }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [showResult, setShowResult] = useState<{ url: string; emailSent: boolean; emailReason?: string } | null>(null);

  const approveMut = useMutation({
    mutationFn: (regenerate: boolean) => approveLead(lead.id, { regenerate }),
    onSuccess: (data) => {
      setShowResult({ url: data.onboard_url, emailSent: data.email_sent, emailReason: data.email_reason });
      queryClient.invalidateQueries({ queryKey: ['admin-leads'] });
    },
  });

  const hasToken = lead.onboard_token != null;
  const isOnboarded = lead.status === 'onboarded';

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Browser may block clipboard in some contexts — caller can copy manually
    }
  };

  if (isOnboarded) {
    return (
      <div className="text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
        Tenant provisioned. No further admin action required.
      </div>
    );
  }

  return (
    <div className="border-t border-foreground/5 pt-4 space-y-3">
      {approveMut.isError && (
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {(approveMut.error as Error).message}
        </div>
      )}

      {showResult && (
        <div className="border border-emerald-200 bg-emerald-50/50 rounded p-3 space-y-2">
          <p className="text-[11px] font-mono text-emerald-900 uppercase tracking-wider">
            Onboarding link
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[11px] bg-white border border-emerald-200 rounded px-2 py-1.5 overflow-x-auto whitespace-nowrap font-mono">
              {showResult.url}
            </code>
            <button
              onClick={() => handleCopy(showResult.url)}
              aria-label="Copy link"
              className="shrink-0 px-2 py-1.5 rounded border border-emerald-300 hover:bg-emerald-100 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-emerald-700" />}
            </button>
          </div>
          <p className="text-[11px] text-emerald-900/80">
            {showResult.emailSent
              ? `Notification email sent to ${lead.contact_email}.`
              : `Email not sent (${showResult.emailReason ?? 'unknown reason'}). Send the link manually.`}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {hasToken ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => approveMut.mutate(false)}
              disabled={approveMut.isPending}
            >
              {approveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Resend onboarding email
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => approveMut.mutate(true)}
              disabled={approveMut.isPending}
            >
              Regenerate token
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            onClick={() => approveMut.mutate(false)}
            disabled={approveMut.isPending}
          >
            {approveMut.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            Approve & send onboarding link
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Bits ──────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: LeadStatus }) {
  const styles: Record<LeadStatus, string> = {
    new: 'bg-foreground/10 text-foreground/80',
    contacted: 'bg-blue-100 text-blue-900',
    qualified: 'bg-amber-100 text-amber-900',
    onboarded: 'bg-emerald-100 text-emerald-900',
    dropped: 'bg-red-100 text-red-900',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] uppercase tracking-wider ${styles[status]}`}>
      {status}
    </span>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = now - then;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function prettyLots(v: string): string {
  return ({
    under_50: 'Under 50 / week',
    '50_to_200': '50–200 / week',
    '200_plus': 'Over 200 / week',
    unsure: 'Unsure',
  } as Record<string, string>)[v] ?? v;
}

function prettyRail(v: string): string {
  return ({
    cash_only: 'Cash only',
    cash_and_eft: 'Cash + EFT',
    paynow: 'Paynow',
    other_platform: 'Another platform',
    mixed: 'Mixed',
  } as Record<string, string>)[v] ?? v;
}

function NotAuthorized() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-3">
      <ShieldAlert className="w-8 h-8 text-muted-foreground" />
      <h1 className="text-lg font-bold">Not authorized</h1>
      <p className="text-[13px] text-muted-foreground max-w-sm">
        This page is restricted to platform administrators. If you should
        have access, ask the platform owner to add your email to{' '}
        <code className="text-[11px] font-mono">VITE_SUPER_ADMIN_EMAILS</code>.
      </p>
    </div>
  );
}

export default LeadAdmin;
