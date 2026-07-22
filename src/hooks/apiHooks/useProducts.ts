'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { Product, ProductPayload, ProductSale, ProductSalePayload } from '@/app/types/product';

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const envelope = data as { data?: T[] } | null | undefined;
  return Array.isArray(envelope?.data) ? (envelope!.data as T[]) : [];
}

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (includeInactive: boolean) => [...productKeys.lists(), { includeInactive }] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  sales: () => [...productKeys.all, 'sales'] as const,
};

/** Lista produtos. */
export function useProductsQuery(includeInactive = false) {
  return useQuery({
    queryKey: productKeys.list(includeInactive),
    queryFn: async () => {
      const { data } = await api.get<Product[] | { data?: Product[] }>('/products', {
        params: includeInactive ? { include_inactive: true } : undefined,
      });
      return unwrapList<Product>(data);
    },
  });
}

/** Busca um produto por ID. */
export function useProductQuery(id: string | null | undefined) {
  return useQuery({
    queryKey: productKeys.detail(id ?? ''),
    queryFn: async () => {
      const { data } = await api.get<Product>(`/products/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProductPayload) => {
      const { data } = await api.post<Product>('/products', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<ProductPayload> }) => {
      const { data } = await api.patch<Product>(`/products/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/products/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

/** Lista vendas de produtos. */
export function useProductSalesQuery() {
  return useQuery({
    queryKey: productKeys.sales(),
    queryFn: async () => {
      const { data } = await api.get<ProductSale[] | { data?: ProductSale[] }>('/products/sales');
      return unwrapList<ProductSale>(data);
    },
  });
}

export function useCreateProductSaleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProductSalePayload) => {
      const { data } = await api.post<ProductSale>('/products/sales', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}
