import { useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi } from './apis';

export const useAIChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: aiApi.chat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    },
  });
};
