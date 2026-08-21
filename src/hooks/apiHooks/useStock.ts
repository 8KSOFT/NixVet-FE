'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type {
  AdjustStockPayload,
  CostHistoryPoint,
  CostVariation,
  ProductCategory,
  ProductCategoryPayload,
  StockEntry,
  StockEntryPayload,
  StockMovement,
  Supplier,
  SupplierPayload,
  WriteOffStockPayload,
} from '@/app/types/product';
import { productKeys } from './useProducts';

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const envelope = data as { data?: T[] } | null | undefined;
  return Array.isArray(envelope?.data) ? (envelope!.data as T[]) : [];
}

interface PagedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export const stockKeys = {
  all: ['stock'] as const,
  categories: () => [...stockKeys.all, 'categories'] as const,
  suppliers: () => [...stockKeys.all, 'suppliers'] as const,
  movements: () => [...stockKeys.all, 'movements'] as const,
  movementsList: (filters: { product_id?: string; reason?: string; page?: number }) =>
    [...stockKeys.movements(), filters] as const,
  entries: () => [...stockKeys.all, 'entries'] as const,
  entriesList: (filters: { supplier_id?: string; start_date?: string; end_date?: string; page?: number }) =>
    [...stockKeys.entries(), 'list', filters] as const,
  entryDetail: (id: string) => [...stockKeys.entries(), 'detail', id] as const,
  costHistory: (productId: string, startDate?: string, endDate?: string) =>
    [...stockKeys.all, 'cost-history', productId, { startDate, endDate }] as const,
  costVariations: (startDate?: string, endDate?: string) =>
    [...stockKeys.all, 'cost-variations', { startDate, endDate }] as const,
};

// ----- Categorias -----

export function useProductCategoriesQuery() {
  return useQuery({
    queryKey: stockKeys.categories(),
    queryFn: async () => {
      const { data } = await api.get<ProductCategory[] | { data?: ProductCategory[] }>('/stock/categories');
      return unwrapList<ProductCategory>(data);
    },
  });
}

export function useCreateProductCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProductCategoryPayload) => {
      const { data } = await api.post<ProductCategory>('/stock/categories', payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stockKeys.categories() }),
  });
}

export function useUpdateProductCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<ProductCategoryPayload> }) => {
      const { data } = await api.patch<ProductCategory>(`/stock/categories/${id}`, payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stockKeys.categories() }),
  });
}

export function useDeleteProductCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/stock/categories/${id}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stockKeys.categories() }),
  });
}

// ----- Fornecedores -----

export function useSuppliersQuery() {
  return useQuery({
    queryKey: stockKeys.suppliers(),
    queryFn: async () => {
      const { data } = await api.get<Supplier[] | { data?: Supplier[] }>('/stock/suppliers');
      return unwrapList<Supplier>(data);
    },
  });
}

export function useCreateSupplierMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SupplierPayload) => {
      const { data } = await api.post<Supplier>('/stock/suppliers', payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stockKeys.suppliers() }),
  });
}

export function useUpdateSupplierMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<SupplierPayload> }) => {
      const { data } = await api.patch<Supplier>(`/stock/suppliers/${id}`, payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stockKeys.suppliers() }),
  });
}

export function useDeleteSupplierMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/stock/suppliers/${id}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stockKeys.suppliers() }),
  });
}

// ----- Movimentações (ledger, somente leitura) -----

export function useStockMovementsQuery(filters: { product_id?: string; reason?: string; page?: number } = {}) {
  return useQuery({
    queryKey: stockKeys.movementsList(filters),
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<StockMovement>>('/stock/movements', {
        params: filters,
      });
      return data;
    },
  });
}

// ----- Ajuste / baixa manual -----
// Invalidam productKeys.all também: o ajuste/baixa muda stock_quantity do produto.

export function useAdjustStockMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, payload }: { productId: string; payload: AdjustStockPayload }) => {
      const { data } = await api.post(`/products/${productId}/stock/adjust`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: stockKeys.movements() });
    },
  });
}

export function useWriteOffStockMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, payload }: { productId: string; payload: WriteOffStockPayload }) => {
      const { data } = await api.post(`/products/${productId}/stock/write-off`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: stockKeys.movements() });
    },
  });
}

// ----- Entrada de nota fiscal -----

export function useStockEntriesQuery(
  filters: { supplier_id?: string; start_date?: string; end_date?: string; page?: number } = {},
) {
  return useQuery({
    queryKey: stockKeys.entriesList(filters),
    queryFn: async () => {
      const { data } = await api.get<PagedResponse<StockEntry>>('/stock/entries', { params: filters });
      return data;
    },
  });
}

export function useStockEntryQuery(id: string | null | undefined) {
  return useQuery({
    queryKey: stockKeys.entryDetail(id ?? ''),
    queryFn: async () => {
      const { data } = await api.get<StockEntry>(`/stock/entries/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateStockEntryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: StockEntryPayload) => {
      const { data } = await api.post<StockEntry>('/stock/entries', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.entries() });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: stockKeys.movements() });
    },
  });
}

export function useCancelStockEntryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post<StockEntry>(`/stock/entries/${id}/cancel`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.entries() });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: stockKeys.movements() });
    },
  });
}

// ----- Histórico de custo -----

export function useCostHistoryQuery(productId: string | null, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: stockKeys.costHistory(productId ?? '', startDate, endDate),
    queryFn: async () => {
      const { data } = await api.get<CostHistoryPoint[] | { data?: CostHistoryPoint[] }>('/stock/cost-history', {
        params: { product_id: productId, start_date: startDate, end_date: endDate },
      });
      return unwrapList<CostHistoryPoint>(data);
    },
    enabled: !!productId,
  });
}

export function useCostVariationsQuery(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: stockKeys.costVariations(startDate, endDate),
    queryFn: async () => {
      const { data } = await api.get<CostVariation[] | { data?: CostVariation[] }>('/stock/cost-variations', {
        params: { start_date: startDate, end_date: endDate },
      });
      return unwrapList<CostVariation>(data);
    },
  });
}
