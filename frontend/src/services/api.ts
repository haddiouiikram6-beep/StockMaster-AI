import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import {
  ApiResponse,
  User,
  Product,
  StockMovement,
  Category,
  Supplier,
  Conversation,
  AIResponse,
  MovementType,
} from '../types';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.136:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// Request interceptor to attach access token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Avoid refresh loops for auth endpoints
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        isRefreshing = false;
        await useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post<{
          success: boolean;
          data: { accessToken: string; refreshToken: string };
        }>(`${API_BASE_URL}/auth/refresh`, { refreshToken });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
        await useAuthStore.getState().updateTokens(newAccessToken, newRefreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        await useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth Endpoints
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

// Products Endpoints
export interface ProductQueryParams {
  page?: number;
  limit?: number;
  categoryId?: number;
  supplierId?: number;
  minStock?: boolean | string;
  search?: string;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
}

export const productApi = {
  getAll: async (params?: ProductQueryParams) => {
    const res = await api.get<ApiResponse<Product[]>>('/products', { params });
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
  update: async (id: number | string, payload: Partial<Product>) => {
    const res = await api.put<ApiResponse<Product>>(`/products/${id}`, payload);
    return res.data;
  },
  delete: async (id: number | string) => {
    const res = await api.delete<ApiResponse<{ message: string }>>(`/products/${id}`);
    return res.data;
  },
};

// Stock Movement Endpoints
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

// Category & Supplier Endpoints
export const categoryApi = {
  getAll: async () => {
    const res = await api.get<ApiResponse<Category[]>>('/categories');
    return res.data;
  },
};

export const supplierApi = {
  getAll: async () => {
    const res = await api.get<ApiResponse<Supplier[]>>('/suppliers');
    return res.data;
  },
};

// AI Endpoints
export const aiApi = {
  chat: async (payload: { message: string; conversationId?: number; stream?: boolean }) => {
    const res = await api.post<ApiResponse<AIResponse>>('/ai/chat', payload);
    return res.data;
  },
  getConversations: async () => {
    const res = await api.get<ApiResponse<Conversation[]>>('/ai/conversations');
    return res.data;
  },
  getConversationById: async (id: number | string) => {
    const res = await api.get<ApiResponse<Conversation>>(`/ai/conversations/${id}`);
    return res.data;
  },
};
