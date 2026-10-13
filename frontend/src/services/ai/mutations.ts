import { useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi } from './apis';
import { AI_QUERY_KEYS } from './queries';

export const useAIChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: aiApi.chat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_QUERY_KEYS.conversations });
    },
  });
};

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => aiApi.deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_QUERY_KEYS.conversations });
    },
  });
};
