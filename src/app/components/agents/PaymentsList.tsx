import { DollarSign, RefreshCw } from 'lucide-react';
import { useAgentPayments } from '../../../hooks/useAgents';

const STATUS_STYLES: Record<string, string> = {
  paid: 'text-green-600 bg-green-50',
  failed: 'text-red-600 bg-red-50',
  pending: 'text-yellow-600 bg-yellow-50',
  processing: 'text-blue-600 bg-blue-50',
  retrying: 'text-orange-600 bg-orange-50',
};

export function PaymentsList({ agentId }: { agentId: string }) {
  const { data: payments, isLoading } = useAgentPayments(agentId);

  if (isLoading) return null;
  if (!payments?.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm flex items-center gap-2"><DollarSign className="w-4 h-4" /> Payments</h3>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {payments.map((p: any) => (
          <div key={p.id} className="text-sm p-2 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">US${p.amount}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase">{p.method}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[p.status] || ''}`}>
                  {p.status}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {p.attempt_count > 1 && (
                <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> {p.attempt_count} attempts</span>
              )}
              {p.paynow_reference && <span>Ref: {p.paynow_reference}</span>}
              {p.last_error && <span className="text-red-500 truncate max-w-[200px]">{p.last_error}</span>}
            </div>
            {p.settlement_ledger?.length > 0 && (
              <div className="mt-1 pl-2 border-l-2 border-muted space-y-0.5">
                {p.settlement_ledger.slice(-4).map((e: any) => (
                  <div key={e.id} className="text-xs text-muted-foreground">
                    {e.event.replace(/_/g, ' ')} {e.method ? `(${e.method})` : ''} {e.attempt_number ? `#${e.attempt_number}` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
