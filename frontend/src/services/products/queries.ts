import { useQuery } from '@tanstack/react-query';
import { productApi, ProductQueryParams } from './apis';

export const useGetProducts = (params?: ProductQueryParams) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productApi.getAll(params),
  });
};

export const useGetProductById = (id: number | string, enabled = true) => {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => productApi.getById(id),
    enabled: enabled && !!id,
  });
};
