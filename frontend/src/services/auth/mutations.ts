import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from './apis';
import { useAuthStore } from '../../store/useAuthStore';

export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async (res) => {
      if (res.success && res.data) {
        const { user, accessToken, refreshToken } = res.data;
        await useAuthStore.getState().setAuth(user, accessToken, refreshToken);
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
    mutationFn: async () => {
      const refreshToken = useAuthStore.getState().refreshToken || undefined;
      await authApi.logout(refreshToken);
    },
    onSuccess: async () => {
      await useAuthStore.getState().logout();
      queryClient.clear();
    },
  });
};
