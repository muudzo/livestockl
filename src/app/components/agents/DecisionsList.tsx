import { Brain } from 'lucide-react';
import { useAgentDecisions } from '../../../hooks/useAgents';

const DECISION_COLORS: Record<string, string> = {
  bid: 'text-blue-600 bg-blue-50',
  buy_now: 'text-green-600 bg-green-50',
  snipe: 'text-red-600 bg-red-50',
  monitor: 'text-yellow-600 bg-yellow-50',
  ignore: 'text-gray-500 bg-gray-50',
  reprice: 'text-purple-600 bg-purple-50',
  promote: 'text-green-600 bg-green-50',
  alert: 'text-orange-600 bg-orange-50',
};

export function DecisionsList({ agentId }: { agentId: string }) {
  const { data: decisions, isLoading } = useAgentDecisions(agentId);

  if (isLoading) return null;
  if (!decisions?.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm flex items-center gap-2"><Brain className="w-4 h-4" /> Recent Decisions</h3>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {decisions.slice(0, 10).map((d) => (
          <div key={d.id} className="text-sm p-2 rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DECISION_COLORS[d.decision] || 'text-gray-500 bg-gray-50'}`}>
                {d.decision.toUpperCase()}
              </span>
              {d.confidence !== null && (
                <span className="text-xs text-muted-foreground">{d.confidence}% confidence</span>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(d.created_at).toLocaleTimeString()}
              </span>
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">{d.reasoning}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
