import { api } from '../apiClient';
import { ApiResponse, Supplier } from '../../types';

export const supplierApi = {
  getAll: async () => {
    const res = await api.get<ApiResponse<Supplier[]>>('/suppliers');
    return res.data;
  },
};
