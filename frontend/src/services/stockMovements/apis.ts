import { api } from '../apiClient';
import { ApiResponse, StockMovement, MovementType } from '../../types';

export interface MovementQueryParams {
  page?: number;
  limit?: number;
  productId?: number;
  userId?: number;
  type?: MovementType;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
}

export const stockMovementApi = {
  getAll: async (params?: MovementQueryParams) => {
    const res = await api.get<ApiResponse<StockMovement[]>>('/stock-movements', { params });
    return res.data;
  },
  getById: async (id: number | string) => {
    const res = await api.get<ApiResponse<StockMovement>>(`/stock-movements/${id}`);
    return res.data;
  },
  create: async (payload: {
    productId: number;
    type: MovementType;
    quantity: number;
    reason?: string;
    date?: string;
  }) => {
    const res = await api.post<ApiResponse<StockMovement>>('/stock-movements', payload);
    return res.data;
  },
};
