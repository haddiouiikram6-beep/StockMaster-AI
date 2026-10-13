import { useMutation, useQueryClient } from '@tanstack/react-query';
import { stockMovementApi } from './apis';
import { STOCK_MOVEMENT_QUERY_KEYS } from './queries';
import { PRODUCT_QUERY_KEYS } from '../products/queries';
import { MovementType } from '../../types';

export const useCreateStockMovement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      productId: number;
      type: MovementType;
      quantity: number;
      reason?: string;
      date?: string;
    }) => stockMovementApi.create(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENT_QUERY_KEYS.stockMovements });
      queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENT_QUERY_KEYS.productMovements(variables.productId) });
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.products });
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.productStats });
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.product(variables.productId) });
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.lowStockProducts });
    },
  });
};
