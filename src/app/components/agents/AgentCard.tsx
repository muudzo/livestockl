import { useState } from 'react';
import { Play, Pause, Zap, Clock, DollarSign, CheckCircle2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useRunAgent, useUpdateAgentStatus, useUpdateAgent, type Agent } from '../../../hooks/useAgents';
import { AGENT_ICONS, AGENT_COLORS, STATUS_STYLES, ACTION_MAP } from './constants';

export function AgentCard({ agent, isSelected, onSelect }: { agent: Agent; isSelected: boolean; onSelect: () => void }) {
  const Icon = AGENT_ICONS[agent.agent_type];
  const color = AGENT_COLORS[agent.agent_type];
  const runAgent = useRunAgent();
  const updateStatus = useUpdateAgentStatus();
  const updateAgent = useUpdateAgent();

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(agent.name);

  const handleRun = (e: React.MouseEvent) => {
    e.stopPropagation();
    runAgent.mutate(
      { agent, action: ACTION_MAP[agent.agent_type] },
      {
        onSuccess: (data: any) => {
          const summary = data?.summary || data?.message || 'Agent run complete';
          toast.success(`${agent.name}: ${summary}`);
        },
        onError: (err: any) => {
          toast.error(`${agent.name}: ${err.message || 'Run failed'}`);
        },
      }
    );
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = agent.status === 'active' ? 'paused' : 'active';
    updateStatus.mutate({ agentId: agent.id, status: newStatus });
  };

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraftName(agent.name);
    setIsEditing(true);
  };

  const saveEdit = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === agent.name) {
      setIsEditing(false);
      return;
    }
    updateAgent.mutate(
      { agentId: agent.id, name: trimmed },
      {
        onSuccess: () => {
          toast.success('Agent renamed');
          setIsEditing(false);
        },
        onError: (err: any) => toast.error(err.message || 'Rename failed'),
      }
    );
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setDraftName(agent.name);
  };

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`w-full text-left p-4 rounded-lg border transition-all cursor-pointer ${
        isSelected ? 'border-primary shadow-md bg-primary/5' : 'border-border hover:border-primary/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`${color} p-2 rounded-lg text-white shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(e);
                    if (e.key === 'Escape') cancelEdit(e as any);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="font-medium bg-background border border-input rounded px-2 py-1 text-sm min-w-0 flex-1"
                  aria-label="Agent name"
                />
                <button onClick={saveEdit} disabled={updateAgent.isPending} className="p-1 rounded hover:bg-muted" title="Save">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                </button>
                <button onClick={cancelEdit} className="p-1 rounded hover:bg-muted" title="Cancel">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </>
            ) : (
              <>
                <span className="font-medium truncate">{agent.name}</span>
                <button onClick={startEdit} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Rename agent">
                  <Pencil className="w-3 h-3" />
                </button>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[agent.status]}`}>
                  {agent.status}
                </span>
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex gap-3">
            <span>{agent.stats.total_bids} bids</span>
            <span>{agent.stats.wins} wins</span>
            {agent.last_run_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(agent.last_run_at).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={handleToggle} className="p-2.5 rounded hover:bg-muted min-w-[44px] min-h-[44px] flex items-center justify-center" title={agent.status === 'active' ? 'Pause' : 'Activate'}>
            {agent.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button onClick={handleRun} disabled={runAgent.isPending} className="p-2.5 rounded hover:bg-muted disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center" title="Run now">
            <Zap className={`w-4 h-4 ${runAgent.isPending ? 'animate-pulse text-yellow-500' : ''}`} />
          </button>
        </div>
      </div>
      <div className="flex gap-3 mt-2 pt-2 border-t border-border/50 text-xs">
        <span className="text-muted-foreground"><DollarSign className="w-3 h-3 inline -mt-0.5" /> US${agent.stats.total_spent || 0}</span>
        <span className="text-muted-foreground">{agent.stats.total_bids || 0} bids</span>
        <span className={agent.stats.wins > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
          <CheckCircle2 className="w-3 h-3 inline -mt-0.5" /> {agent.stats.wins || 0} wins
        </span>
      </div>
    </div>
  );
}
