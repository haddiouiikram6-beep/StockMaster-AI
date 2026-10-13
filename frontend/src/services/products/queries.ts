import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { productApi, ProductQueryParams } from './apis';

export const PRODUCT_QUERY_KEYS = {
  products: ['products'] as const,
  productStats: ['products', 'stats'] as const,
  product: (id: number | string) => ['product', id] as const,
  lowStockProducts: ['products', 'low-stock'] as const,
};

export const useProducts = (params?: ProductQueryParams) => {
  return useQuery({
    queryKey: [...PRODUCT_QUERY_KEYS.products, params],
    queryFn: () => productApi.getAll(params),
  });
};

export const useProductStats = () => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.productStats,
    queryFn: () => productApi.getStats(),
  });
};

export const useInfiniteProducts = (params?: Omit<ProductQueryParams, 'page'>) => {
  return useInfiniteQuery({
    queryKey: [...PRODUCT_QUERY_KEYS.products, 'infinite', params],
    queryFn: ({ pageParam = 1 }) =>
      productApi.getAll({ ...params, page: pageParam as number, limit: params?.limit || 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination;
      if (!pagination) return undefined;
      return pagination.page < pagination.totalPages ? pagination.page + 1 : undefined;
    },
  });
};

export const useProduct = (id?: number | string, enabled = true) => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.product(id ?? ''),
    queryFn: () => productApi.getById(id!),
    enabled: enabled && !!id,
  });
};

export const useLowStockProducts = (limit = 10) => {
  return useQuery({
    queryKey: [...PRODUCT_QUERY_KEYS.lowStockProducts, limit],
    queryFn: () => productApi.getAll({ minStock: true, limit }),
  });
};

export const useGetProducts = useProducts;
export const useGetProductById = useProduct;
