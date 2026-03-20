import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { goApi, isGoBackendConfigured } from '../../lib/goApi';
import { useGoAuthStore } from '../../stores/goAuthStore';
import { goWs } from '../../lib/goWebSocket';

// Mock data for demo mode
const mockConversations = [
  {
    id: 'conv-1',
    participant_1: 'demo-user',
    participant_2: 'user-seller-1',
    livestock_id: '1',
    last_message_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    other_participant: { id: '', email: '', first_name: 'John', last_name: 'M.', phone: '', verified: false, rating: 0, sales_count: 0, created_at: '' },
    livestock_title: 'Ngoni Bull',
    last_message: 'Is the bull still available?',
  },
];

const mockMessages: Record<string, any[]> = {
  'conv-1': [
    { id: 'msg-1', conversation_id: 'conv-1', sender_id: 'demo-user', content: 'Hi, is the bull still available?', read: true, created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
    { id: 'msg-2', conversation_id: 'conv-1', sender_id: 'user-seller-1', content: 'Yes it is! Are you interested?', read: true, created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString() },
  ],
};

export function useConversations() {
  const user = useGoAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['go-conversations', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!isGoBackendConfigured) {
        return mockConversations;
      }
      return goApi.conversations.list();
    },
  });
}

export function useMessages(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const query = useQuery({
    queryKey: ['go-messages', conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      if (!isGoBackendConfigured) {
        return mockMessages[conversationId!] || [];
      }
      return goApi.messages.list(conversationId!);
    },
  });

  useEffect(() => {
    if (!conversationId || !isGoBackendConfigured) return;

    const unsub = goWs.subscribe(`messages:${conversationId}`, () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['go-messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['go-conversations'] });
      }, 1000);
    });

    return () => {
      clearTimeout(debounceRef.current);
      unsub();
    };
  }, [conversationId, queryClient]);

  return query;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const user = useGoAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      if (!user) throw new Error('Not authenticated');

      if (!isGoBackendConfigured) {
        const newMsg = {
          id: 'msg-' + Date.now(),
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          read: false,
          created_at: new Date().toISOString(),
        };
        if (!mockMessages[conversationId]) mockMessages[conversationId] = [];
        mockMessages[conversationId].push(newMsg);
        return newMsg;
      }

      return goApi.messages.send({ conversation_id: conversationId, content });
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['go-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['go-conversations'] });
    },
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  const user = useGoAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({ sellerId, livestockId }: { sellerId: string; livestockId?: string }) => {
      if (!user) throw new Error('Not authenticated');

      if (!isGoBackendConfigured) {
        return mockConversations[0];
      }

      return goApi.conversations.start({
        seller_id: sellerId,
        livestock_id: livestockId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['go-conversations'] });
    },
  });
}
