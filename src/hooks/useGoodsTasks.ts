import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { GoodsTask, CreateGoodsTaskInput, UpdateGoodsTaskInput, ListFilters } from '@/types/api';
import { riderKeys } from './useRiders';

// Query keys
export const goodsTaskKeys = {
  all: ['goodsTasks'] as const,
  lists: () => [...goodsTaskKeys.all, 'list'] as const,
  list: (filters?: ListFilters) => [...goodsTaskKeys.lists(), filters] as const,
  details: () => [...goodsTaskKeys.all, 'detail'] as const,
  detail: (id: string) => [...goodsTaskKeys.details(), id] as const,
  byRider: (riderId: string) => [...goodsTaskKeys.all, 'byRider', riderId] as const,
  byStatus: (status: string) => [...goodsTaskKeys.all, 'byStatus', status] as const,
  pending: () => [...goodsTaskKeys.all, 'pending'] as const,
};

// Queries
export function useGoodsTasks(filters?: ListFilters) {
  return useQuery({
    queryKey: goodsTaskKeys.list(filters),
    queryFn: async () => {
      const response = await window.api.goodsTasks.list(filters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch goods tasks');
      }
      return response.data || [];
    },
  });
}

export function useGoodsTask(id: string, enabled = true) {
  return useQuery({
    queryKey: goodsTaskKeys.detail(id),
    queryFn: async () => {
      const response = await window.api.goodsTasks.get(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch goods task');
      }
      return response.data;
    },
    enabled: enabled && !!id,
  });
}

export function useGoodsTasksByRider(riderId: string) {
  return useQuery({
    queryKey: goodsTaskKeys.byRider(riderId),
    queryFn: async () => {
      const response = await window.api.goodsTasks.byRider(riderId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch tasks by rider');
      }
      return response.data || [];
    },
    enabled: !!riderId,
  });
}

export function useGoodsTasksByStatus(status: string) {
  return useQuery({
    queryKey: goodsTaskKeys.byStatus(status),
    queryFn: async () => {
      const response = await window.api.goodsTasks.byStatus(status);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch tasks by status');
      }
      return response.data || [];
    },
  });
}

export function usePendingGoodsTasks() {
  return useQuery({
    queryKey: goodsTaskKeys.pending(),
    queryFn: async () => {
      const response = await window.api.goodsTasks.pending();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch pending tasks');
      }
      return response.data || [];
    },
  });
}

// Mutations
export function useCreateGoodsTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateGoodsTaskInput) => {
      const response = await window.api.goodsTasks.create(data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create goods task');
      }
      return response.data;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: goodsTaskKeys.all });
      if (task?.rider_id) {
        queryClient.invalidateQueries({ queryKey: riderKeys.all });
      }
    },
  });
}

export function useUpdateGoodsTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateGoodsTaskInput;
    }) => {
      const response = await window.api.goodsTasks.update(id, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update goods task');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: goodsTaskKeys.all });
      queryClient.invalidateQueries({
        queryKey: goodsTaskKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: riderKeys.all });
    },
  });
}

export function useUpdateGoodsTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'pending' | 'in_transit' | 'delivered' | 'cancelled' }) => {
      const response = await window.api.goodsTasks.updateStatus(id, status);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update task status');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goodsTaskKeys.all });
    },
  });
}

export function useDeleteGoodsTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await window.api.goodsTasks.delete(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete goods task');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goodsTaskKeys.all });
      queryClient.invalidateQueries({ queryKey: riderKeys.all });
    },
  });
}

export function useGoodsTaskSearch() {
  return useMutation({
    mutationFn: async (term: string) => {
      const response = await window.api.goodsTasks.search(term);
      if (!response.success) {
        throw new Error(response.error || 'Failed to search goods tasks');
      }
      return response.data || [];
    },
  });
}
