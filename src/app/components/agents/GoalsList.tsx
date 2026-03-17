import { Target } from 'lucide-react';
import { useAgentGoals } from '../../../hooks/useAgents';

export function GoalsList({ agentId }: { agentId: string }) {
  const { data: goals, isLoading } = useAgentGoals(agentId);

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading goals...</div>;
  if (!goals?.length) return <div className="text-sm text-muted-foreground">No goals set</div>;

  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm flex items-center gap-2"><Target className="w-4 h-4" /> Goals</h3>
      {goals.map((goal) => (
        <div key={goal.id} className="text-sm p-3 rounded-lg bg-muted/50 flex justify-between items-center">
          <div>
            <span className="font-medium">{goal.category}</span>
            {goal.preferred_breed && <span className="text-muted-foreground"> ({goal.preferred_breed})</span>}
            {goal.preferred_location && <span className="text-muted-foreground"> in {goal.preferred_location}</span>}
          </div>
          <div className="text-right">
            <div className="font-medium">US${goal.max_price}</div>
            <div className="text-xs text-muted-foreground">{goal.quantity_fulfilled}/{goal.quantity} filled</div>
          </div>
        </div>
      ))}
    </div>
  );
}
