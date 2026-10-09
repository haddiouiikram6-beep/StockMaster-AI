import { api } from '../apiClient';
import { ApiResponse, Category } from '../../types';

export const categoryApi = {
  getAll: async () => {
    const res = await api.get<ApiResponse<Category[]>>('/categories');
    return res.data;
  },
};
