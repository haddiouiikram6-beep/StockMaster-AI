import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi } from './apis';
import { PRODUCT_QUERY_KEYS } from './queries';
import { Product } from '../../types';

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Product>) => productApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.products });
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.productStats });
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.lowStockProducts });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: Partial<Product> }) =>
      productApi.update({ id, payload }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.products });
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.productStats });
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.product(variables.id) });
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.lowStockProducts });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => productApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.products });
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.productStats });
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.lowStockProducts });
    },
  });
};
