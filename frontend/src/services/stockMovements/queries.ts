import { useQuery } from '@tanstack/react-query';
import { stockMovementApi, MovementQueryParams } from './apis';

export const useGetStockMovements = (params?: MovementQueryParams) => {
  return useQuery({
    queryKey: ['stock-movements', params],
    queryFn: () => stockMovementApi.getAll(params),
  });
};

export const useGetStockMovementById = (id: number | string, enabled = true) => {
  return useQuery({
    queryKey: ['stock-movements', id],
    queryFn: () => stockMovementApi.getById(id),
    enabled: enabled && !!id,
  });
};
