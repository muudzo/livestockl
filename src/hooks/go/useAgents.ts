import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { goApi, isGoBackendConfigured } from '../../lib/goApi';
import type { Agent, AgentGoal, AgentDecision, AgentActivity, AgentPaymentOrder } from '../../lib/goApi';
import { useGoAuthStore } from '../../stores/goAuthStore';
import { goWs } from '../../lib/goWebSocket';

export type AgentType = 'buyer' | 'seller' | 'market_intel' | 'sniper';
export type AgentStatus = 'active' | 'paused' | 'stopped';

export function useAgents() {
  const user = useGoAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['go-agents', user?.id],
    enabled: !!user && isGoBackendConfigured,
    queryFn: async () => {
      return goApi.agents.list() as Promise<Agent[]>;
    },
  });
}

export function useAgentGoals(agentId: string | undefined) {
  return useQuery({
    queryKey: ['go-agent-goals', agentId],
    enabled: !!agentId && isGoBackendConfigured,
    queryFn: async () => {
      return goApi.agents.getGoals(agentId!) as Promise<AgentGoal[]>;
    },
  });
}

export function useAgentDecisions(agentId: string | undefined) {
  return useQuery({
    queryKey: ['go-agent-decisions', agentId],
    enabled: !!agentId && isGoBackendConfigured,
    queryFn: async () => {
      return goApi.agents.getDecisions(agentId!) as Promise<AgentDecision[]>;
    },
  });
}

export function useAgentActivity(agentId: string | undefined) {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const query = useQuery({
    queryKey: ['go-agent-activity', agentId],
    enabled: !!agentId && isGoBackendConfigured,
    queryFn: async () => {
      return goApi.agents.getActivity(agentId!) as Promise<AgentActivity[]>;
    },
  });

  useEffect(() => {
    if (!agentId || !isGoBackendConfigured) return;

    const unsub = goWs.subscribe(`agents:${agentId}`, () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['go-agent-activity', agentId] });
        queryClient.invalidateQueries({ queryKey: ['go-agent-decisions', agentId] });
        queryClient.invalidateQueries({ queryKey: ['go-agents'] });
      }, 500);
    });

    return () => {
      clearTimeout(debounceRef.current);
      unsub();
    };
  }, [agentId, queryClient]);

  return query;
}

export function useAgentPayments(agentId: string | undefined) {
  return useQuery({
    queryKey: ['go-agent-payments', agentId],
    enabled: !!agentId && isGoBackendConfigured,
    queryFn: async () => {
      return goApi.agents.getPayments(agentId!) as Promise<AgentPaymentOrder[]>;
    },
  });
}

export function useMarketIntel() {
  return useQuery({
    queryKey: ['go-market-intel'],
    enabled: isGoBackendConfigured,
    queryFn: async () => {
      return goApi.agents.marketIntel();
    },
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  const user = useGoAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({ agentType, name, config }: { agentType: AgentType; name: string; config?: Record<string, any> }) => {
      if (!user) throw new Error('Not authenticated');
      return goApi.agents.create({ agent_type: agentType, name, config });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['go-agents'] });
    },
  });
}

export function useUpdateAgentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agentId, status }: { agentId: string; status: AgentStatus }) => {
      return goApi.agents.updateStatus(agentId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['go-agents'] });
    },
  });
}

export function useAddGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goal: Omit<AgentGoal, 'id' | 'quantity_fulfilled' | 'status' | 'created_at'>) => {
      return goApi.agents.addGoal(goal.agent_id, goal);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['go-agent-goals', variables.agent_id] });
    },
  });
}

const ACTION_MAP: Record<string, string> = {
  buyer: 'run_cycle',
  seller: 'analyze_listings',
  market_intel: 'generate_report',
  sniper: 'scan_ending_soon',
};

export function useRunAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agent, action }: { agent: Agent; action: string }) => {
      return goApi.agents.run(agent.id, action);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['go-agents'] });
      queryClient.invalidateQueries({ queryKey: ['go-agent-activity'] });
      queryClient.invalidateQueries({ queryKey: ['go-agent-decisions'] });
      queryClient.invalidateQueries({ queryKey: ['go-market-intel'] });
    },
  });
}

export function useAutoRunAgents(intervalMs = 15000) {
  const { data: agents } = useAgents();
  const queryClient = useQueryClient();
  const runningRef = useRef(false);

  useEffect(() => {
    if (!agents?.length) return;

    const activeAgents = agents.filter((a: Agent) => a.status === 'active');
    if (!activeAgents.length) return;

    const runAll = async () => {
      if (runningRef.current) return;
      runningRef.current = true;

      for (const agent of activeAgents) {
        try {
          const action = ACTION_MAP[agent.agent_type] || 'run_cycle';
          console.log(`[${agent.name}] Running with action=${action}...`);
          await goApi.agents.run(agent.id, action);
        } catch (err) {
          console.error(`[${agent.name}] Failed:`, err);
        }
      }

      runningRef.current = false;
      queryClient.invalidateQueries({ queryKey: ['go-agents'] });
      queryClient.invalidateQueries({ queryKey: ['go-agent-activity'] });
      queryClient.invalidateQueries({ queryKey: ['go-agent-decisions'] });
    };

    runAll();
    const timer = setInterval(runAll, intervalMs);
    return () => clearInterval(timer);
  }, [agents?.map((a: Agent) => `${a.id}:${a.status}`).join(','), intervalMs, queryClient]);
}
