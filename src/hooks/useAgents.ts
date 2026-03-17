import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export type AgentType = 'buyer' | 'seller' | 'market_intel' | 'sniper';
export type AgentStatus = 'active' | 'paused' | 'stopped';

export interface Agent {
  id: string;
  user_id: string;
  agent_type: AgentType;
  name: string;
  status: AgentStatus;
  config: Record<string, any>;
  stats: { total_actions: number; total_spent: number; total_bids: number; wins: number };
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentGoal {
  id: string;
  agent_id: string;
  category: string;
  preferred_breed: string | null;
  preferred_location: string | null;
  min_health: string;
  max_price: number;
  quantity: number;
  quantity_fulfilled: number;
  status: string;
  created_at: string;
}

export interface AgentDecision {
  id: string;
  agent_id: string;
  goal_id: string | null;
  livestock_id: string | null;
  decision: string;
  reasoning: string;
  confidence: number | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AgentActivity {
  id: string;
  agent_id: string;
  event_type: string;
  message: string;
  metadata: Record<string, any>;
  created_at: string;
}

// Fetch all agents for the current user
export function useAgents() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['agents', user?.id],
    enabled: !!user && isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Agent[];
    },
  });
}

// Fetch goals for a specific agent
export function useAgentGoals(agentId: string | undefined) {
  return useQuery({
    queryKey: ['agent_goals', agentId],
    enabled: !!agentId && isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_goals')
        .select('*')
        .eq('agent_id', agentId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AgentGoal[];
    },
  });
}

// Fetch decisions for a specific agent (recent)
export function useAgentDecisions(agentId: string | undefined) {
  return useQuery({
    queryKey: ['agent_decisions', agentId],
    enabled: !!agentId && isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_decisions')
        .select('*')
        .eq('agent_id', agentId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AgentDecision[];
    },
  });
}

// Fetch activity log with realtime
export function useAgentActivity(agentId: string | undefined) {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const query = useQuery({
    queryKey: ['agent_activity', agentId],
    enabled: !!agentId && isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_activity_log')
        .select('*')
        .eq('agent_id', agentId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as AgentActivity[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!agentId || !isSupabaseConfigured) return;
    const channel = supabase
      .channel(`agent_activity:${agentId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'agent_activity_log',
        filter: `agent_id=eq.${agentId}`,
      }, () => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['agent_activity', agentId] });
          queryClient.invalidateQueries({ queryKey: ['agent_decisions', agentId] });
          queryClient.invalidateQueries({ queryKey: ['agents'] });
        }, 500);
      })
      .subscribe();
    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [agentId, queryClient]);

  return query;
}

// Market intel data
export function useMarketIntel() {
  return useQuery({
    queryKey: ['market_intel'],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_intel')
        .select('*')
        .order('period_end', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

// Create a new agent
export function useCreateAgent() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({ agentType, name, config }: { agentType: AgentType; name: string; config?: Record<string, any> }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('agents')
        .insert({ user_id: user.id, agent_type: agentType, name, config: config || {} })
        .select()
        .single();
      if (error) throw error;
      return data as Agent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

// Update agent status
export function useUpdateAgentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agentId, status }: { agentId: string; status: AgentStatus }) => {
      const { data, error } = await supabase
        .from('agents')
        .update({ status })
        .eq('id', agentId)
        .select()
        .single();
      if (error) throw error;
      return data as Agent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

// Add a goal to an agent
export function useAddGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goal: Omit<AgentGoal, 'id' | 'quantity_fulfilled' | 'status' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('agent_goals')
        .insert(goal)
        .select()
        .single();
      if (error) throw error;
      return data as AgentGoal;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agent_goals', variables.agent_id] });
    },
  });
}

// Run an agent (invoke Edge Function)
export function useRunAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agent, action }: { agent: Agent; action: string }) => {
      const functionMap: Record<AgentType, string> = {
        buyer: 'buyer-agent',
        seller: 'seller-agent',
        market_intel: 'market-intel',
        sniper: 'auction-sniper',
      };

      const { data, error } = await supabase.functions.invoke(functionMap[agent.agent_type], {
        body: { action, agentId: agent.id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent_activity'] });
      queryClient.invalidateQueries({ queryKey: ['agent_decisions'] });
      queryClient.invalidateQueries({ queryKey: ['market_intel'] });
    },
  });
}
