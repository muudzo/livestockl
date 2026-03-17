import { useState } from 'react';
import { Link } from 'react-router';
import {
  useAgents, useAgentActivity, useAgentDecisions, useAgentGoals, useAgentPayments,
  useRunAgent, useUpdateAgentStatus, useAutoRunAgents, type Agent, type AgentType,
} from '../../hooks/useAgents';
import {
  Bot, ShoppingCart, TrendingUp, Target, Crosshair,
  Play, Pause, Square, Activity, Brain, Clock, DollarSign, RefreshCw,
  Plus, ChevronRight, Zap, AlertTriangle, CheckCircle2,
} from 'lucide-react';

const AGENT_ICONS: Record<AgentType, typeof Bot> = {
  buyer: ShoppingCart,
  seller: TrendingUp,
  market_intel: Target,
  sniper: Crosshair,
};

const AGENT_COLORS: Record<AgentType, string> = {
  buyer: 'bg-blue-500',
  seller: 'bg-green-500',
  market_intel: 'bg-purple-500',
  sniper: 'bg-red-500',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  stopped: 'bg-gray-100 text-gray-700',
};

const EVENT_ICONS: Record<string, typeof Activity> = {
  scan_started: Activity,
  scan_completed: CheckCircle2,
  listing_found: Target,
  listing_evaluated: Brain,
  bid_placed: Zap,
  bid_won: CheckCircle2,
  bid_lost: AlertTriangle,
  snipe_executed: Crosshair,
  snipe_missed: AlertTriangle,
  reprice_suggested: TrendingUp,
  market_report: Target,
  anomaly_detected: AlertTriangle,
  error: AlertTriangle,
};

const ACTION_MAP: Record<AgentType, string> = {
  buyer: 'run_cycle',
  seller: 'analyze_listings',
  market_intel: 'generate_report',
  sniper: 'scan_ending_soon',
};

function AgentCard({ agent, isSelected, onSelect }: { agent: Agent; isSelected: boolean; onSelect: () => void }) {
  const Icon = AGENT_ICONS[agent.agent_type];
  const color = AGENT_COLORS[agent.agent_type];
  const runAgent = useRunAgent();
  const updateStatus = useUpdateAgentStatus();

  const handleRun = (e: React.MouseEvent) => {
    e.stopPropagation();
    runAgent.mutate({ agent, action: ACTION_MAP[agent.agent_type] });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = agent.status === 'active' ? 'paused' : 'active';
    updateStatus.mutate({ agentId: agent.id, status: newStatus });
  };

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        isSelected ? 'border-primary shadow-md bg-primary/5' : 'border-border hover:border-primary/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`${color} p-2 rounded-lg text-white shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{agent.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[agent.status]}`}>
              {agent.status}
            </span>
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
          <button
            onClick={handleToggle}
            className="p-1.5 rounded hover:bg-muted"
            title={agent.status === 'active' ? 'Pause' : 'Activate'}
          >
            {agent.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={handleRun}
            disabled={runAgent.isPending}
            className="p-1.5 rounded hover:bg-muted disabled:opacity-50"
            title="Run now"
          >
            <Zap className={`w-4 h-4 ${runAgent.isPending ? 'animate-pulse text-yellow-500' : ''}`} />
          </button>
        </div>
      </div>
    </button>
  );
}

function GoalsList({ agentId }: { agentId: string }) {
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

function DecisionsList({ agentId }: { agentId: string }) {
  const { data: decisions, isLoading } = useAgentDecisions(agentId);

  if (isLoading) return null;
  if (!decisions?.length) return null;

  const decisionColors: Record<string, string> = {
    bid: 'text-blue-600 bg-blue-50',
    buy_now: 'text-green-600 bg-green-50',
    snipe: 'text-red-600 bg-red-50',
    monitor: 'text-yellow-600 bg-yellow-50',
    ignore: 'text-gray-500 bg-gray-50',
    reprice: 'text-purple-600 bg-purple-50',
    promote: 'text-green-600 bg-green-50',
    alert: 'text-orange-600 bg-orange-50',
  };

  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm flex items-center gap-2"><Brain className="w-4 h-4" /> Recent Decisions</h3>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {decisions.slice(0, 10).map((d) => (
          <div key={d.id} className="text-sm p-2 rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${decisionColors[d.decision] || 'text-gray-500 bg-gray-50'}`}>
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

function ActivityFeed({ agentId }: { agentId: string }) {
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

function PaymentsList({ agentId }: { agentId: string }) {
  const { data: payments, isLoading } = useAgentPayments(agentId);

  if (isLoading) return null;
  if (!payments?.length) return null;

  const statusStyles: Record<string, string> = {
    paid: 'text-green-600 bg-green-50',
    failed: 'text-red-600 bg-red-50',
    pending: 'text-yellow-600 bg-yellow-50',
    processing: 'text-blue-600 bg-blue-50',
    retrying: 'text-orange-600 bg-orange-50',
  };

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
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[p.status] || ''}`}>
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

export function AgentDashboard() {
  const { data: agents, isLoading } = useAgents();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const selectedAgent = agents?.find(a => a.id === selectedAgentId);

  // Auto-run active agents every 15 seconds
  useAutoRunAgents(15000);

  // Auto-select first agent if none selected
  if (!selectedAgentId && agents?.length) {
    setSelectedAgentId(agents[0].id);
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Bot className="w-8 h-8 animate-pulse" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Agents</h1>
            <p className="text-muted-foreground text-sm">
              {agents?.length ? `${agents.length} agent(s) working for you` : 'No agents yet'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {agents?.some(a => a.status === 'active') && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Auto-running every 15s
            </div>
          )}
          <Link
            to="/agents/new"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> New Agent
          </Link>
        </div>
      </div>

      {!agents?.length ? (
        <div className="text-center py-16 space-y-4">
          <Bot className="w-16 h-16 mx-auto text-muted-foreground/30" />
          <h2 className="text-xl font-semibold">No agents yet</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Create your first autonomous agent to start scanning the marketplace, placing bids, and tracking prices automatically.
          </p>
          <Link
            to="/agents/new"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90"
          >
            <Plus className="w-5 h-5" /> Create Your First Agent
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-[300px_1fr] gap-4">
          {/* Agent list */}
          <div className="space-y-2">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isSelected={agent.id === selectedAgentId}
                onSelect={() => setSelectedAgentId(agent.id)}
              />
            ))}
          </div>

          {/* Agent detail panel */}
          <div className="border rounded-lg p-4 space-y-4">
            {selectedAgent ? (
              <>
                <div className="flex items-center gap-3 pb-3 border-b">
                  {(() => {
                    const Icon = AGENT_ICONS[selectedAgent.agent_type];
                    return <div className={`${AGENT_COLORS[selectedAgent.agent_type]} p-2 rounded-lg text-white`}><Icon className="w-5 h-5" /></div>;
                  })()}
                  <div>
                    <h2 className="font-semibold text-lg">{selectedAgent.name}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[selectedAgent.status]}`}>
                      {selectedAgent.status}
                    </span>
                  </div>
                </div>

                {(selectedAgent.agent_type === 'buyer' || selectedAgent.agent_type === 'sniper') && (
                  <GoalsList agentId={selectedAgent.id} />
                )}
                <PaymentsList agentId={selectedAgent.id} />
                <DecisionsList agentId={selectedAgent.id} />
                <ActivityFeed agentId={selectedAgent.id} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground">
                <ChevronRight className="w-8 h-8 mb-2" />
                <p>Select an agent to see details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
