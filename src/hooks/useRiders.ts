import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Rider, CreateRiderInput, UpdateRiderInput } from '@/types/api';

// Query keys
export const riderKeys = {
  all: ['riders'] as const,
  lists: () => [...riderKeys.all, 'list'] as const,
  list: () => [...riderKeys.lists()] as const,
  details: () => [...riderKeys.all, 'detail'] as const,
  detail: (id: string) => [...riderKeys.details(), id] as const,
  active: () => [...riderKeys.all, 'active'] as const,
  withStats: (id: string) => [...riderKeys.all, 'withStats', id] as const,
};

// Queries
export function useRiders() {
  return useQuery({
    queryKey: riderKeys.list(),
    queryFn: async () => {
      const response = await window.api.riders.list();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch riders');
      }
      return response.data || [];
    },
  });
}

export function useActiveRiders() {
  return useQuery({
    queryKey: riderKeys.active(),
    queryFn: async () => {
      const response = await window.api.riders.active();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch active riders');
      }
      return response.data || [];
    },
  });
}

export function useRider(id: string, enabled = true) {
  return useQuery({
    queryKey: riderKeys.detail(id),
    queryFn: async () => {
      const response = await window.api.riders.get(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch rider');
      }
      return response.data;
    },
    enabled: enabled && !!id,
  });
}

export function useRiderWithStats(id: string) {
  return useQuery({
    queryKey: riderKeys.withStats(id),
    queryFn: async () => {
      const response = await window.api.riders.getWithStats(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch rider with stats');
      }
      return response.data;
    },
    enabled: !!id,
  });
}

// Mutations
export function useCreateRider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRiderInput) => {
      const response = await window.api.riders.create(data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create rider');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: riderKeys.all });
    },
  });
}

export function useUpdateRider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateRiderInput;
    }) => {
      const response = await window.api.riders.update(id, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update rider');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: riderKeys.all });
      queryClient.invalidateQueries({
        queryKey: riderKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteRider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await window.api.riders.delete(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete rider');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: riderKeys.all });
    },
  });
}

export function useRiderSearch() {
  return useMutation({
    mutationFn: async (term: string) => {
      const response = await window.api.riders.search(term);
      if (!response.success) {
        throw new Error(response.error || 'Failed to search riders');
      }
      return response.data || [];
    },
  });
}
