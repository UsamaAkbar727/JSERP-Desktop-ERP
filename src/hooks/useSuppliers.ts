import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Supplier,
  SupplierWithSummary,
  CreateSupplierInput,
  UpdateSupplierInput,
  ListFilters,
  SupplierStatistics,
} from '@/types/api';

// Query keys
export const supplierKeys = {
  all: ['suppliers'] as const,
  lists: () => [...supplierKeys.all, 'list'] as const,
  list: (filters?: ListFilters) => [...supplierKeys.lists(), filters] as const,
  details: () => [...supplierKeys.all, 'detail'] as const,
  detail: (id: string) => [...supplierKeys.details(), id] as const,
  detailWithSummary: (id: string) =>
    [...supplierKeys.all, 'detailWithSummary', id] as const,
  active: () => [...supplierKeys.all, 'active'] as const,
  withPayables: () => [...supplierKeys.all, 'withPayables'] as const,
  statistics: () => [...supplierKeys.all, 'statistics'] as const,
  top: (limit?: number) => [...supplierKeys.all, 'top', limit] as const,
  payables: () => [...supplierKeys.all, 'payables'] as const,
};

// Queries
export function useSuppliers(filters?: ListFilters) {
  return useQuery({
    queryKey: supplierKeys.list(filters),
    queryFn: async () => {
      const response = await window.api.suppliers.list(filters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch suppliers');
      }
      return response.data || [];
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
    refetchOnMount: 'always', // Always refetch
  });
}

export function useActiveSuppliers() {
  return useQuery({
    queryKey: supplierKeys.active(),
    queryFn: async () => {
      const response = await window.api.suppliers.active();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch active suppliers');
      }
      return response.data || [];
    },
  });
}

export function useSupplier(id: string, enabled = true) {
  return useQuery({
    queryKey: supplierKeys.detail(id),
    queryFn: async () => {
      const response = await window.api.suppliers.get({ id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch supplier');
      }
      return response.data;
    },
    enabled: enabled && !!id,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
    refetchOnMount: 'always', // Always refetch
  });
}

export function useSupplierWithSummary(id: string, enabled = true) {
  return useQuery({
    queryKey: supplierKeys.detailWithSummary(id),
    queryFn: async () => {
      const response = await window.api.suppliers.getWithSummary({ id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch supplier summary');
      }
      return response.data as SupplierWithSummary;
    },
    enabled: enabled && !!id,
  });
}

export function useSuppliersWithPayables() {
  return useQuery({
    queryKey: supplierKeys.withPayables(),
    queryFn: async () => {
      const response = await window.api.suppliers.withPayables();
      if (!response.success) {
        throw new Error(
          response.error || 'Failed to fetch suppliers with payables'
        );
      }
      return response.data || [];
    },
  });
}

export function useSupplierStatistics() {
  return useQuery({
    queryKey: supplierKeys.statistics(),
    queryFn: async () => {
      const response = await window.api.suppliers.statistics();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch supplier statistics');
      }
      return response.data as SupplierStatistics;
    },
  });
}

export function useTopSuppliers(limit = 10) {
  return useQuery({
    queryKey: supplierKeys.top(limit),
    queryFn: async () => {
      const response = await window.api.suppliers.top(limit);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch top suppliers');
      }
      return response.data || [];
    },
  });
}

export function useTotalPayables() {
  return useQuery({
    queryKey: supplierKeys.payables(),
    queryFn: async () => {
      const response = await window.api.suppliers.totalPayables();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch total payables');
      }
      return response.data || 0;
    },
  });
}

// Mutations
export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSupplierInput) => {
      const response = await window.api.suppliers.create(data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create supplier');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSupplierInput;
    }) => {
      const response = await window.api.suppliers.update({ id, data });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update supplier');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      queryClient.invalidateQueries({
        queryKey: supplierKeys.detail(variables.id),
      });
    },
  });
}

export function useUpdateSupplierBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      amount,
      operation,
    }: {
      id: string;
      amount: number;
      operation: 'add' | 'subtract';
    }) => {
      const response = await window.api.suppliers.updateBalance({
        id,
        amount,
        operation,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update supplier balance');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      queryClient.invalidateQueries({
        queryKey: supplierKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await window.api.suppliers.delete({ id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete supplier');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    },
  });
}

export function useSupplierSearch() {
  return useMutation({
    mutationFn: async (query: string) => {
      const response = await window.api.suppliers.search({ term: query });
      if (!response.success) {
        throw new Error(response.error || 'Failed to search suppliers');
      }
      return response.data || [];
    },
  });
}

export function useSupplierByPhone() {
  return useMutation({
    mutationFn: async (phone: string) => {
      const response = await window.api.suppliers.byPhone({ phone });
      if (!response.success) {
        throw new Error(response.error || 'Supplier not found');
      }
      return response.data;
    },
  });
}

export function useSupplierByEmail() {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await window.api.suppliers.byEmail({ email });
      if (!response.success) {
        throw new Error(response.error || 'Supplier not found');
      }
      return response.data;
    },
  });
}
