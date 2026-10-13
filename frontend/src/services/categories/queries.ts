import { useQuery } from '@tanstack/react-query';
import { categoryApi } from './apis';

export const CATEGORY_QUERY_KEYS = {
  categories: ['categories'] as const,
};

export const useCategories = () => {
  return useQuery({
    queryKey: CATEGORY_QUERY_KEYS.categories,
    queryFn: () => categoryApi.getAll(),
  });
};

export const useGetCategories = useCategories;
