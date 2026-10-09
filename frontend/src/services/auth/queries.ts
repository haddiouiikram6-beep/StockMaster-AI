import { useQuery } from '@tanstack/react-query';
import { authApi } from './apis';

export const useGetMe = (enabled = true) => {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getMe,
    enabled,
  });
};
