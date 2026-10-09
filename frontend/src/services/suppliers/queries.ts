import { useQuery } from '@tanstack/react-query';
import { supplierApi } from './apis';

export const useGetSuppliers = () => {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: supplierApi.getAll,
  });
};
