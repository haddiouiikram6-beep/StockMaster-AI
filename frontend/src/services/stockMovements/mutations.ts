import { useMutation, useQueryClient } from '@tanstack/react-query';
import { stockMovementApi } from './apis';

export const useCreateStockMovement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: stockMovementApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};
