import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { User, AuthState, ApiResponse } from '../types';
import { API_BASE_URL } from '../constants/config';

const STORAGE_KEYS = {
  ACCESS_TOKEN: '@stockmaster_access_token',
  REFRESH_TOKEN: '@stockmaster_refresh_token',
  USER: '@stockmaster_user',
};

/**
 * Decode JWT payload and check if token is expired or close to expiring
 */
export const isJwtExpired = (token: string | null, bufferSeconds = 30): boolean => {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payloadBase64 = parts[1];
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
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

// Global in-flight refresh mutex to prevent duplicate rotations and race conditions
let refreshPromise: Promise<boolean> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async (user: User, accessToken: string, refreshToken: string) => {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
        [STORAGE_KEYS.USER, JSON.stringify(user)],
      ]);
      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (e) {
      console.error('Error saving auth state:', e);
    }
  },

  updateTokens: async (accessToken: string, refreshToken: string, user?: User) => {
    try {
      const storagePairs: [string, string][] = [
        [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
      ];
      if (user) {
        storagePairs.push([STORAGE_KEYS.USER, JSON.stringify(user)]);
      }
      await AsyncStorage.multiSet(storagePairs);
      set((state) => ({
        accessToken,
        refreshToken,
        user: user || state.user,
        isAuthenticated: true,
      }));
    } catch (e) {
      console.error('Error updating tokens:', e);
    }
  },

  updateUser: async (user: User) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      set({ user });
    } catch (e) {
      console.error('Error updating user:', e);
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
      ]);
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (e) {
      console.error('Error clearing auth state:', e);
    }
  },

  refreshSession: async (): Promise<boolean> => {
    // If a refresh is already in progress, wait for it rather than making a second call
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      try {
        const currentRefreshToken =
          get().refreshToken || (await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN));

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
          const { accessToken, refreshToken: newRefreshToken, user: refreshedUser } =
            res.data.data;
          const currentUser = refreshedUser || get().user;

          const storagePairs: [string, string][] = [
            [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
            [STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken],
          ];
          if (currentUser) {
            storagePairs.push([STORAGE_KEYS.USER, JSON.stringify(currentUser)]);
          }

          await AsyncStorage.multiSet(storagePairs);

          set({
            accessToken,
            refreshToken: newRefreshToken,
            ...(currentUser ? { user: currentUser } : {}),
            isAuthenticated: true,
            isLoading: false,
          });

          return true;
        }

        await get().logout();
        return false;
      } catch (err: any) {
        // If server explicitly rejected token (401 or 403), revoke local credentials
        if (err.response?.status === 401 || err.response?.status === 403) {
          console.warn('[Auth] Refresh token expired or revoked. Logging out.');
          await get().logout();
          return false;
        }

        // On network error (e.g. offline or server down), do not prematurely log out
        console.warn('[Auth] Network error during token refresh:', err.message || err);
        return false;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  },

  initAuth: async () => {
    try {
      const [[, storedAccessToken], [, storedRefreshToken], [, userStr]] =
        await AsyncStorage.multiGet([
          STORAGE_KEYS.ACCESS_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
          STORAGE_KEYS.USER,
        ]);

      if (!storedRefreshToken) {
        // No saved session found
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      const cachedUser = userStr ? JSON.parse(userStr) : null;

      // Optimistically restore cached identity into state
      if (cachedUser) {
        set({
          user: cachedUser,
          accessToken: storedAccessToken,
          refreshToken: storedRefreshToken,
          isAuthenticated: true,
        });
      }

      // Check whether access token is expired or about to expire
      const isExpired = isJwtExpired(storedAccessToken);

      if (isExpired || !storedAccessToken) {
        // Access token is expired or missing: use refresh token to get access to the app
        console.log('[Auth] Access token is expired/missing on launch. Refreshing session...');
        const refreshed = await get().refreshSession();
        if (!refreshed) {
          // If refresh was rejected (401), user was logged out.
          // If offline and we had cached user, keep optimistic state, otherwise set unauthenticated
          if (!get().isAuthenticated) {
            set({ isLoading: false });
          } else {
            set({ isLoading: false });
          }
        }
      } else {
        // Access token is still valid
        set({
          user: cachedUser,
          accessToken: storedAccessToken,
          refreshToken: storedRefreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch (e) {
      console.error('Error initializing auth state:', e);
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));

