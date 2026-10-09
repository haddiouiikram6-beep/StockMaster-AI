import { useQuery } from '@tanstack/react-query';
import { aiApi } from './apis';

export const useGetConversations = () => {
  return useQuery({
    queryKey: ['ai-conversations'],
    queryFn: aiApi.getConversations,
  });
};

export const useGetConversationById = (id: number | string, enabled = true) => {
  return useQuery({
    queryKey: ['ai-conversations', id],
    queryFn: () => aiApi.getConversationById(id),
    enabled: enabled && !!id,
  });
};
