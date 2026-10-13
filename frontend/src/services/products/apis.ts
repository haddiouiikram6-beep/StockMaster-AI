import { api } from '../apiClient';
import { ApiResponse, Product, ProductStats } from '../../types';

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  categoryId?: number;
  supplierId?: number;
  minStock?: boolean | string;
  status?: 'ALL' | 'LOW' | 'OUT';
  search?: string;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
}

export const productApi = {
  getAll: async (params?: ProductQueryParams) => {
    const res = await api.get<ApiResponse<Product[]>>('/products', { params });
    return res.data;
  },
  getStats: async () => {
    const res = await api.get<ApiResponse<ProductStats>>('/products/stats');
    return res.data;
  },
  getById: async (id: number | string) => {
    const res = await api.get<ApiResponse<Product>>(`/products/${id}`);
    return res.data;
  },
  create: async (payload: Partial<Product>) => {
    const res = await api.post<ApiResponse<Product>>('/products', payload);
    return res.data;
  },
  update: async ({ id, payload }: { id: number | string; payload: Partial<Product> }) => {
    const res = await api.put<ApiResponse<Product>>(`/products/${id}`, payload);
    return res.data;
  },
  delete: async (id: number | string) => {
    const res = await api.delete<ApiResponse<{ message: string }>>(`/products/${id}`);
    return res.data;
  },
};
