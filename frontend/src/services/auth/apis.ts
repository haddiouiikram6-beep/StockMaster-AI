import { api } from '../apiClient';
import { ApiResponse, User } from '../../types';

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const res = await api.post<ApiResponse<{ accessToken: string; refreshToken: string; user: User }>>(
      '/auth/login',
      credentials
    );
    return res.data;
  },
  register: async (payload: { fullName: string; email: string; password: string }) => {
    const res = await api.post<ApiResponse<User>>('/auth/register', payload);
    return res.data;
  },
  logout: async (refreshToken?: string) => {
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore network errors on logout
    }
  },
  getMe: async () => {
    const res = await api.get<ApiResponse<User>>('/auth/me');
    return res.data;
  },
};
