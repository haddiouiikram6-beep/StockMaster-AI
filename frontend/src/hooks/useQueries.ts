import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  productApi,
  stockMovementApi,
  categoryApi,
  supplierApi,
  aiApi,
  ProductQueryParams,
  MovementQueryParams,
} from '../services/api';
import { Product, MovementType } from '../types';

export const QUERY_KEYS = {
  products: ['products'] as const,
  product: (id: number | string) => ['product', id] as const,
  lowStockProducts: ['products', 'low-stock'] as const,
  stockMovements: ['stock-movements'] as const,
  productMovements: (productId: number | string) => ['stock-movements', 'product', productId] as const,
  categories: ['categories'] as const,
  suppliers: ['suppliers'] as const,
  conversations: ['conversations'] as const,
  conversation: (id: number | string) => ['conversation', id] as const,
};

// Products Hooks
export const useProducts = (params?: ProductQueryParams) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.products, params],
    queryFn: () => productApi.getAll(params),
  });
};

export const useProduct = (id: number | string) => {
  return useQuery({
    queryKey: QUERY_KEYS.product(id),
    queryFn: () => productApi.getById(id),
    enabled: !!id,
  });
};

export const useLowStockProducts = (limit = 10) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.lowStockProducts, limit],
    queryFn: () => productApi.getAll({ minStock: true, limit }),
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Product>) => productApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lowStockProducts });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: Partial<Product> }) =>
      productApi.update(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.product(variables.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lowStockProducts });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => productApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lowStockProducts });
    },
  });
};

// Stock Movements Hooks
export const useStockMovements = (params?: MovementQueryParams) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.stockMovements, params],
    queryFn: () => stockMovementApi.getAll(params),
  });
};

export const useProductStockMovements = (productId: number | string, limit = 10) => {
  return useQuery({
    queryKey: QUERY_KEYS.productMovements(productId),
    queryFn: () => stockMovementApi.getAll({ productId: Number(productId), limit }),
    enabled: !!productId,
  });
};

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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stockMovements });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.productMovements(variables.productId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.product(variables.productId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lowStockProducts });
    },
  });
};

// Categories & Suppliers
export const useCategories = () => {
  return useQuery({
    queryKey: QUERY_KEYS.categories,
    queryFn: () => categoryApi.getAll(),
  });
};

export const useSuppliers = () => {
  return useQuery({
    queryKey: QUERY_KEYS.suppliers,
    queryFn: () => supplierApi.getAll(),
  });
};

// AI Conversations Hooks
export const useConversations = () => {
  return useQuery({
    queryKey: QUERY_KEYS.conversations,
    queryFn: () => aiApi.getConversations(),
  });
};

export const useConversation = (id: number | string) => {
  return useQuery({
    queryKey: QUERY_KEYS.conversation(id),
    queryFn: () => aiApi.getConversationById(id),
    enabled: !!id,
  });
};
