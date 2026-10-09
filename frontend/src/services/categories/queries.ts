import { useQuery } from '@tanstack/react-query';
import { categoryApi } from './apis';

export const useGetCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.getAll,
  });
};
