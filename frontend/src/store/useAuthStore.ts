import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { User, AuthState, ApiResponse } from '../types';
import { API_BASE_URL } from '../constants/config';

/**
 * Decode JWT payload and check if token is expired or close to expiring
 */
export const isJwtExpired = (token: string | null, bufferSeconds = 30): boolean => {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonStr);
    if (!payload.exp) return false;
    return payload.exp * 1000 <= Date.now() + bufferSeconds * 1000;
  } catch {
    return true;
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: async (user: User, accessToken: string, refreshToken: string) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      updateTokens: async (accessToken: string, refreshToken: string, user?: User) => {
        set((state) => ({
          accessToken,
          refreshToken,
          user: user || state.user,
          isAuthenticated: true,
        }));
      },

      updateUser: async (user: User) => {
        set({ user });
      },

      logout: async () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      refreshSession: async (): Promise<boolean> => {
        try {
          const currentRefreshToken = get().refreshToken;
          if (!currentRefreshToken) {
            await get().logout();
            return false;
          }

          const res = await axios.post<
            ApiResponse<{
              accessToken: string;
              refreshToken: string;
              user?: User;
            }>
          >(
            `${API_BASE_URL}/auth/refresh`,
            { refreshToken: currentRefreshToken },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 10000,
            }
          );

          if (res.data?.success && res.data?.data) {
            const { accessToken, refreshToken: newRefreshToken, user } = res.data.data;
            set((state) => ({
              accessToken,
              refreshToken: newRefreshToken,
              user: user || state.user,
              isAuthenticated: true,
            }));
            return true;
          }

          await get().logout();
          return false;
        } catch {
          await get().logout();
          return false;
        }
      },

      initAuth: async () => {
        try {
          if (!get().accessToken) {
            const [[, legacyToken], [, legacyRefresh], [, legacyUserStr]] =
              await AsyncStorage.multiGet([
                '@stockmaster_access_token',
                '@stockmaster_refresh_token',
                '@stockmaster_user',
              ]);

            if (legacyToken) {
              const legacyUser = legacyUserStr ? JSON.parse(legacyUserStr) : null;
              set({
                accessToken: legacyToken,
                refreshToken: legacyRefresh,
                user: legacyUser,
                isAuthenticated: true,
                isLoading: false,
              });
              return;
            }
          }
        } catch {
          // ignore
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'stockmaster-auth',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ isLoading: false });
      },
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
