// SRP: Orchestrates the agent dashboard layout.
// Each panel (card, goals, decisions, activity, payments) is its own component.

import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAgents } from '../../hooks/useAgents';
import { Bot, Plus, ChevronRight } from 'lucide-react';
import { AgentCard } from './agents/AgentCard';
import { GoalsList } from './agents/GoalsList';
import { DecisionsList } from './agents/DecisionsList';
import { ActivityFeed } from './agents/ActivityFeed';
import { PaymentsList } from './agents/PaymentsList';
import { AGENT_ICONS, AGENT_COLORS, STATUS_STYLES } from './agents/constants';

export function AgentDashboard() {
  const { data: agents, isLoading } = useAgents();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const selectedAgent = agents?.find(a => a.id === selectedAgentId);

  useEffect(() => {
    if (!selectedAgentId && agents?.length) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Bot className="w-8 h-8 animate-pulse" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      {/* Header */}
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
            <div className="flex items-center gap-2 text-sm text-green-600" title="Active agents respond to scheduled cron triggers and the Run Now button">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Active — tap ⚡ to run
            </div>
          )}
          <Link to="/agents/new" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> New Agent
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {!agents?.length ? (
        <div className="text-center py-16 space-y-4">
          <Bot className="w-16 h-16 mx-auto text-muted-foreground/30" />
          <h2 className="text-xl font-semibold">No agents yet</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Create your first autonomous agent to start scanning the marketplace, placing bids, and tracking prices automatically.
          </p>
          <Link to="/agents/new" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90">
            <Plus className="w-5 h-5" /> Create Your First Agent
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-[300px_1fr] gap-4">
          {/* Agent list */}
          <div className="space-y-2">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} isSelected={agent.id === selectedAgentId} onSelect={() => setSelectedAgentId(agent.id)} />
            ))}
          </div>

          {/* Detail panel */}
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
