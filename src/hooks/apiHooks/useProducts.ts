'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { API_PAGE_SIZE, listQueryParams, parseListResponse } from '@/lib/pagination';
import type {
  Product,
  ProductItemType,
  ProductPayload,
  ProductSale,
  ProductSalePayload,
} from '@/app/types/product';

/** Filtros da busca de produtos no servidor (`GET /products`). */
export interface ProductSearchParams {
  /** Nome, SKU ou código interno. Vazio = sem filtro. */
  search?: string;
  categoryId?: string;
  itemType?: ProductItemType;
  includeInactive?: boolean;
  page?: number;
  /** Até 50 (teto do backend). */
  limit?: number;
}

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
  salesPage: (page: number) => [...productKeys.sales(), { page }] as const,
  search: (params: ProductSearchParams) => [...productKeys.all, 'search', params] as const,
};

/**
 * Lista produtos sem paginar — o backend corta em 500 linhas. Só para os
 * selects que ainda não buscam no servidor (abas de estoque); listas e
 * buscas usam `useProductSearchQuery`.
 */
export function useProductsQuery(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: productKeys.list(includeInactive),
    queryFn: async () => {
      const { data } = await api.get<Product[] | { data?: Product[] }>('/products', {
        params: includeInactive ? { include_inactive: true } : undefined,
      });
      return unwrapList<Product>(data);
    },
    enabled,
  });
}

/**
 * Produtos paginados e filtrados no servidor (lista de configurações, grade
 * do balcão, seletor de produto do orçamento). Ordem: nome A→Z.
 */
export function useProductSearchQuery(params: ProductSearchParams, enabled = true) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(Math.max(1, params.limit ?? API_PAGE_SIZE), API_PAGE_SIZE);
  const search = params.search?.trim() || undefined;
  const normalized: ProductSearchParams = {
    search,
    categoryId: params.categoryId || undefined,
    itemType: params.itemType,
    includeInactive: params.includeInactive || undefined,
    page,
    limit,
  };
  return useQuery({
    queryKey: productKeys.search(normalized),
    queryFn: async () => {
      const { data } = await api.get('/products', {
        params: listQueryParams(page, limit, {
          search,
          category_id: normalized.categoryId,
          item_type: normalized.itemType,
          include_inactive: normalized.includeInactive,
        }),
      });
      return parseListResponse<Product>(data, page, limit);
    },
    enabled,
    placeholderData: keepPreviousData,
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

/** Vendas de produtos paginadas no servidor (mais recentes primeiro). */
export function useProductSalesQuery(page = 1, enabled = true) {
  return useQuery({
    queryKey: productKeys.salesPage(page),
    queryFn: async () => {
      const { data } = await api.get('/products/sales', { params: listQueryParams(page) });
      return parseListResponse<ProductSale>(data, page);
    },
    enabled,
    placeholderData: keepPreviousData,
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
