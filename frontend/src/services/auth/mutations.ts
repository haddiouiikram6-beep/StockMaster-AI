import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from './apis';
import { useAuthStore } from '../../store/useAuthStore';

export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      // Assuming data.data contains accessToken and refreshToken
      if (data.data?.accessToken && data.data?.refreshToken) {
        useAuthStore.getState().updateTokens(data.data.accessToken, data.data.refreshToken, data.data.user);
      }
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: authApi.register,
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      useAuthStore.getState().logout();
      queryClient.clear();
    },
  });
};
