import { useQuery } from '@tanstack/react-query';
import { aiApi } from './apis';

export const AI_QUERY_KEYS = {
  conversations: ['conversations'] as const,
  conversation: (id: number | string) => ['conversation', id] as const,
};

export const useConversations = () => {
  return useQuery({
    queryKey: AI_QUERY_KEYS.conversations,
    queryFn: aiApi.getConversations,
  });
};

export const useConversation = (id: number | string, enabled = true) => {
  return useQuery({
    queryKey: AI_QUERY_KEYS.conversation(id),
    queryFn: () => aiApi.getConversationById(id),
    enabled: enabled && !!id,
  });
};

export const useGetConversations = useConversations;
export const useGetConversationById = useConversation;
