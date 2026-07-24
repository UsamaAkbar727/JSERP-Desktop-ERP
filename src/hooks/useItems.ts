import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Item,
  CreateItemInput,
  UpdateItemInput,
  ListFilters,
  ItemStatistics,
} from '@/types/api';

// Query keys
export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: (filters?: ListFilters) => [...itemKeys.lists(), filters] as const,
  details: () => [...itemKeys.all, 'detail'] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
  active: () => [...itemKeys.all, 'active'] as const,
  lowStock: () => [...itemKeys.all, 'lowStock'] as const,
  outOfStock: () => [...itemKeys.all, 'outOfStock'] as const,
  byUnit: (unitId: string) => [...itemKeys.all, 'unit', unitId] as const,
  statistics: () => [...itemKeys.all, 'statistics'] as const,
  inventoryValue: () => [...itemKeys.all, 'inventoryValue'] as const,
  profitMargins: () => [...itemKeys.all, 'profitMargins'] as const,
};

// Queries
export function useItems(filters?: ListFilters) {
  return useQuery({
    queryKey: itemKeys.list(filters),
    queryFn: async () => {
      const response = await window.api.items.list(filters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch items');
      }
      return response.data || [];
    },
    staleTime: 5 * 1000, // 5 seconds
    refetchOnWindowFocus: true,
  });
}

export function useActiveItems() {
  return useQuery({
    queryKey: itemKeys.active(),
    queryFn: async () => {
      const response = await window.api.items.active();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch active items');
      }
      return response.data || [];
    },
  });
}

export function useItem(id: string, enabled = true) {
  return useQuery({
    queryKey: itemKeys.detail(id),
    queryFn: async () => {
      const response = await window.api.items.get({ id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch item');
      }
      return response.data;
    },
    enabled: enabled && !!id,
  });
}

export function useLowStockItems() {
  return useQuery({
    queryKey: itemKeys.lowStock(),
    queryFn: async () => {
      const response = await window.api.items.lowStock();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch low stock items');
      }
      return response.data || [];
    },
  });
}

export function useOutOfStockItems() {
  return useQuery({
    queryKey: itemKeys.outOfStock(),
    queryFn: async () => {
      const response = await window.api.items.outOfStock();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch out of stock items');
      }
      return response.data || [];
    },
  });
}

export function useItemsByUnit(unitId: string) {
  return useQuery({
    queryKey: itemKeys.byUnit(unitId),
    queryFn: async () => {
      const response = await window.api.items.byUnit({ unitId });
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch items by unit');
      }
      return response.data || [];
    },
    enabled: !!unitId,
  });
}

export function useItemStatistics() {
  return useQuery({
    queryKey: itemKeys.statistics(),
    queryFn: async () => {
      const response = await window.api.items.statistics();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch item statistics');
      }
      return response.data as ItemStatistics;
    },
  });
}

export function useInventoryValue() {
  return useQuery({
    queryKey: itemKeys.inventoryValue(),
    queryFn: async () => {
      const response = await window.api.items.inventoryValue();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch inventory value');
      }
      return response.data || 0;
    },
  });
}

export function useProfitMargins() {
  return useQuery({
    queryKey: itemKeys.profitMargins(),
    queryFn: async () => {
      const response = await window.api.items.profitMargins();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch profit margins');
      }
      return response.data || [];
    },
  });
}

// Mutations
export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateItemInput) => {
      const response = await window.api.items.create(data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create item');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateItemInput;
    }) => {
      const response = await window.api.items.update({ id, data });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update item');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: itemKeys.detail(variables.id) });
    },
  });
}

export function useUpdateItemStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      quantity,
      type,
    }: {
      id: string;
      quantity: number;
      type: 'add' | 'subtract';
    }) => {
      const response = await window.api.items.updateStock({ id, quantity, type });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update item stock');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: itemKeys.detail(variables.id) });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await window.api.items.delete({ id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete item');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
    },
  });
}

export function useItemSearch() {
  return useMutation({
    mutationFn: async (query: string) => {
      const response = await window.api.items.search({ term: query });
      if (!response.success) {
        throw new Error(response.error || 'Failed to search items');
      }
      return response.data || [];
    },
  });
}

export function useItemBySku() {
  return useMutation({
    mutationFn: async (sku: string) => {
      const response = await window.api.items.bySku({ sku });
      if (!response.success) {
        throw new Error(response.error || 'Item not found');
      }
      return response.data;
    },
  });
}

export function useBulkUpdatePrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      updates: Array<{ id: string; purchase_price?: number; sale_price?: number }>
    ) => {
      const response = await window.api.items.bulkUpdatePrices(updates);
      if (!response.success) {
        throw new Error(response.error || 'Failed to bulk update prices');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
    },
  });
}
