import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Unit, CreateUnitInput, UpdateUnitInput } from '@/types/api';

// Query keys
export const unitKeys = {
  all: ['units'] as const,
  lists: () => [...unitKeys.all, 'list'] as const,
  list: () => [...unitKeys.lists()] as const,
  details: () => [...unitKeys.all, 'detail'] as const,
  detail: (id: string | number) => [...unitKeys.details(), id] as const,
  usageCount: (id: string | number) => [...unitKeys.all, 'usageCount', id] as const,
};

// Queries
export function useUnits() {
  return useQuery({
    queryKey: unitKeys.list(),
    queryFn: async () => {
            const response = await window.api.units.list();
            if (!response.success) {
        console.error('❌ [useUnits] Error:', response.error);
        throw new Error(response.error || 'Failed to fetch units');
      }
            return response.data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - units don't change often
  });
}

export function useUnit(id: string, enabled = true) {
  return useQuery({
    queryKey: unitKeys.detail(id),
    queryFn: async () => {
      const response = await window.api.units.get(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch unit');
      }
      return response.data;
    },
    enabled: enabled && id.length > 0,
  });
}

export function useUnitUsageCount(id: string) {
  return useQuery({
    queryKey: unitKeys.usageCount(id),
    queryFn: async () => {
      const response = await window.api.units.usageCount(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch unit usage count');
      }
      return response.data || 0;
    },
    enabled: id.length > 0,
  });
}

// Mutations
export function useCreateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUnitInput) => {
                        
      const response = await window.api.units.create(data);
      
            
      if (!response.success) {
        console.error('❌ [useCreateUnit] API returned error:', response.error);
        throw new Error(response.error || 'Failed to create unit');
      }
      
            return response.data;
    },
    onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: unitKeys.all });
      queryClient.refetchQueries({ queryKey: unitKeys.list() });
          },
    onError: (error) => {
      console.error('❌ [useCreateUnit] Mutation error:', error);
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateUnitInput;
    }) => {
                              
      const response = await window.api.units.update(id, data);
      
            
      if (!response.success) {
        console.error('❌ [useUpdateUnit] API returned error:', response.error);
        throw new Error(response.error || 'Failed to update unit');
      }
      
            return response.data;
    },
    onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: unitKeys.all });
      queryClient.invalidateQueries({ queryKey: unitKeys.detail(variables.id) });
      queryClient.refetchQueries({ queryKey: unitKeys.list() });
          },
    onError: (error) => {
      console.error('❌ [useUpdateUnit] Mutation error:', error);
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
                        
      const response = await window.api.units.delete(id);
      
            
      if (!response.success) {
        console.error('❌ [useDeleteUnit] API returned error:', response.error);
        throw new Error(response.error || 'Failed to delete unit');
      }
      
            return response.data;
    },
    onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: unitKeys.all });
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: unitKeys.list() });
          },
    onError: (error) => {
      console.error('❌ [useDeleteUnit] Mutation error:', error);
    },
  });
}

export function useUnitSearch() {
  return useMutation({
    mutationFn: async (query: string) => {
      const response = await window.api.units.search(query);
      if (!response.success) {
        throw new Error(response.error || 'Failed to search units');
      }
      return response.data || [];
    },
  });
}
