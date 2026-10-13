import { useQuery } from '@tanstack/react-query';
import { stockMovementApi, MovementQueryParams } from './apis';

export const STOCK_MOVEMENT_QUERY_KEYS = {
  stockMovements: ['stock-movements'] as const,
  productMovements: (productId: number | string) => ['stock-movements', 'product', productId] as const,
};

export const useStockMovements = (params?: MovementQueryParams) => {
  return useQuery({
    queryKey: [...STOCK_MOVEMENT_QUERY_KEYS.stockMovements, params],
    queryFn: () => stockMovementApi.getAll(params),
  });
};

export const useProductStockMovements = (productId: number | string, limit = 10) => {
  return useQuery({
    queryKey: STOCK_MOVEMENT_QUERY_KEYS.productMovements(productId),
    queryFn: () => stockMovementApi.getAll({ productId: Number(productId), limit }),
    enabled: !!productId,
  });
};

export const useStockMovement = (id: number | string, enabled = true) => {
  return useQuery({
    queryKey: ['stock-movements', id],
    queryFn: () => stockMovementApi.getById(id),
    enabled: enabled && !!id,
  });
};

export const useGetStockMovements = useStockMovements;
export const useGetStockMovementById = useStockMovement;
