import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Customer,
  CustomerWithSummary,
  CreateCustomerInput,
  UpdateCustomerInput,
  ListFilters,
  CustomerStatistics,
} from '@/types/api';

// Query keys
export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters?: ListFilters) => [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  detailWithSummary: (id: string) =>
    [...customerKeys.all, 'detailWithSummary', id] as const,
  active: () => [...customerKeys.all, 'active'] as const,
  withDues: () => [...customerKeys.all, 'withDues'] as const,
  statistics: () => [...customerKeys.all, 'statistics'] as const,
  top: (limit?: number) => [...customerKeys.all, 'top', limit] as const,
  receivables: () => [...customerKeys.all, 'receivables'] as const,
};

// Queries
export function useCustomers(filters?: ListFilters) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: async () => {
            
      if (!window.api?.customers?.list) {
        console.error('[useCustomers] API not available!');
        throw new Error('Customers API not available');
      }
      
      const response = await window.api.customers.list(filters);
            
      if (!response.success) {
        console.error('[useCustomers] Failed:', response.error);
        throw new Error(response.error || 'Failed to fetch customers');
      }
      
            return response.data || [];
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
    refetchOnMount: 'always', // Always refetch
  });
}

export function useActiveCustomers() {
  return useQuery({
    queryKey: customerKeys.active(),
    queryFn: async () => {
      const response = await window.api.customers.active();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch active customers');
      }
      return response.data || [];
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
    refetchOnMount: 'always', // Always refetch
  });
}

export function useCustomer(id: string, enabled = true) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: async () => {
      const response = await window.api.customers.get({ id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch customer');
      }
      return response.data;
    },
    enabled: enabled && !!id,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always', // Always refetch when component mounts
  });
}

export function useCustomerWithSummary(id: string, enabled = true) {
  return useQuery({
    queryKey: customerKeys.detailWithSummary(id),
    queryFn: async () => {
      const response = await window.api.customers.getWithSummary({ id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch customer summary');
      }
      return response.data as CustomerWithSummary;
    },
    enabled: enabled && !!id,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always', // Always refetch when component mounts
  });
}

export function useCustomersWithDues() {
  return useQuery({
    queryKey: customerKeys.withDues(),
    queryFn: async () => {
      const response = await window.api.customers.withDues();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch customers with dues');
      }
      return response.data || [];
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always', // Always refetch
  });
}

export function useCustomerStatistics() {
  return useQuery({
    queryKey: customerKeys.statistics(),
    queryFn: async () => {
      const response = await window.api.customers.statistics();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch customer statistics');
      }
      return response.data as CustomerStatistics;
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always', // Always refetch
  });
}

export function useTopCustomers(limit = 10) {
  return useQuery({
    queryKey: customerKeys.top(limit),
    queryFn: async () => {
      const response = await window.api.customers.top(limit);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch top customers');
      }
      return response.data || [];
    },
  });
}

export function useTotalReceivables() {
  return useQuery({
    queryKey: customerKeys.receivables(),
    queryFn: async () => {
      const response = await window.api.customers.totalReceivables();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch total receivables');
      }
      return response.data || 0;
    },
  });
}

// Mutations
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCustomerInput) => {
            
      if (!window.api?.customers?.create) {
        console.error('[useCreateCustomer] API not available!');
        throw new Error('Customer create API not available');
      }
      
      const response = await window.api.customers.create(data);
            
      if (!response.success) {
        console.error('[useCreateCustomer] Failed:', response.error);
        throw new Error(response.error || 'Failed to create customer');
      }
      
            return response.data;
    },
    onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
    onError: (error) => {
      console.error('[useCreateCustomer] ❌ Mutation failed:', error);
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateCustomerInput;
    }) => {
            
      if (!window.api?.customers?.update) {
        console.error('[useUpdateCustomer] API not available!');
        throw new Error('Customer update API not available');
      }
      
      const response = await window.api.customers.update({ id, data });
            
      if (!response.success) {
        console.error('[useUpdateCustomer] Failed:', response.error);
        throw new Error(response.error || 'Failed to update customer');
      }
      
            return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(variables.id),
      });
    },
  });
}

export function useUpdateCustomerBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      amount,
      type,
    }: {
      id: string;
      amount: number;
      type: 'debit' | 'credit';
    }) => {
      const response = await window.api.customers.updateBalance({
        id,
        amount,
        operation: type === 'debit' ? 'subtract' : 'add',
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update customer balance');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await window.api.customers.delete({ id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete customer');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useCustomerSearch() {
  return useMutation({
    mutationFn: async (query: string) => {
      const response = await window.api.customers.search(query);
      if (!response.success) {
        throw new Error(response.error || 'Failed to search customers');
      }
      return response.data || [];
    },
  });
}

export function useCustomerByPhone() {
  return useMutation({
    mutationFn: async (phone: string) => {
      const response = await window.api.customers.byPhone(phone);
      if (!response.success) {
        throw new Error(response.error || 'Customer not found');
      }
      return response.data;
    },
  });
}

export function useCustomerByEmail() {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await window.api.customers.byEmail(email);
      if (!response.success) {
        throw new Error(response.error || 'Customer not found');
      }
      return response.data;
    },
  });
}
