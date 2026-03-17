import { Activity } from 'lucide-react';
import { useAgentActivity } from '../../../hooks/useAgents';
import { EVENT_ICONS } from './constants';

export function ActivityFeed({ agentId }: { agentId: string }) {
  const { data: activity, isLoading } = useAgentActivity(agentId);

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading activity...</div>;
  if (!activity?.length) return <div className="text-sm text-muted-foreground">No activity yet. Run the agent to see results.</div>;

  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm flex items-center gap-2"><Activity className="w-4 h-4" /> Live Activity</h3>
      <div className="space-y-1 max-h-80 overflow-y-auto">
        {activity.map((a) => {
          const Icon = EVENT_ICONS[a.event_type] || Activity;
          const isError = a.event_type === 'error' || a.event_type.includes('missed') || a.event_type.includes('lost');
          const isSuccess = a.event_type.includes('completed') || a.event_type.includes('won') || a.event_type.includes('executed');
          return (
            <div key={a.id} className="flex gap-2 text-sm p-2 rounded hover:bg-muted/50">
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${isError ? 'text-red-500' : isSuccess ? 'text-green-500' : 'text-muted-foreground'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm">{a.message}</div>
                <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
