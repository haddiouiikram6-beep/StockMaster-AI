import { useQuery } from '@tanstack/react-query';
import { supplierApi } from './apis';

export const SUPPLIER_QUERY_KEYS = {
  suppliers: ['suppliers'] as const,
};

export const useSuppliers = () => {
  return useQuery({
    queryKey: SUPPLIER_QUERY_KEYS.suppliers,
    queryFn: () => supplierApi.getAll(),
  });
};

export const useGetSuppliers = useSuppliers;
