import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
  ListFilters,
  IPCResponse,
  AccountBalanceSummary,
} from '@/types/api';
import { reportKeys } from './useReports';

// Query keys
export const accountKeys = {
  all: ['accounts'] as const,
  lists: () => [...accountKeys.all, 'list'] as const,
  list: (filters?: ListFilters) => [...accountKeys.lists(), filters] as const,
  details: () => [...accountKeys.all, 'detail'] as const,
  detail: (id: string) => [...accountKeys.details(), id] as const,
  active: () => [...accountKeys.all, 'active'] as const,
  byType: (type: string) => [...accountKeys.all, 'type', type] as const,
  balance: (id: string) => [...accountKeys.all, 'balance', id] as const,
  balanceSummary: (id: string, startDate?: string, endDate?: string) =>
    [...accountKeys.all, 'balanceSummary', id, startDate, endDate] as const,
  totalBalance: () => [...accountKeys.all, 'totalBalance'] as const,
};

// Queries
export function useAccounts(filters?: ListFilters) {
  return useQuery({
    queryKey: accountKeys.list(filters),
    queryFn: async () => {
      const response = await window.api.accounts.list(filters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch accounts');
      }
      return response.data || [];
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useActiveAccounts() {
  return useQuery({
    queryKey: accountKeys.active(),
    queryFn: async () => {
      const response = await window.api.accounts.active();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch active accounts');
      }
      return response.data || [];
    },
  });
}

export function useAccount(id: string, enabled = true) {
  return useQuery({
    queryKey: accountKeys.detail(id),
    queryFn: async () => {
      const response = await window.api.accounts.get({ id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch account');
      }
      return response.data;
    },
    enabled: enabled && !!id,
  });
}

export function useAccountsByType(type: string) {
  return useQuery({
    queryKey: accountKeys.byType(type),
    queryFn: async () => {
      const response = await window.api.accounts.byType({ type });
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch accounts by type');
      }
      return response.data || [];
    },
  });
}

export function useAccountBalance(id: string) {
  return useQuery({
    queryKey: accountKeys.balance(id),
    queryFn: async () => {
      const response = await window.api.accounts.get({ id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch account balance');
      }
      return response.data?.current_balance || 0;
    },
    enabled: !!id,
  });
}

export function useAccountBalanceSummary(
  id: string,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: accountKeys.balanceSummary(id, startDate, endDate),
    queryFn: async () => {
      const response = await window.api.accounts.balanceSummary({
        accountId: id,
        startDate,
        endDate,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch balance summary');
      }
      return response.data as AccountBalanceSummary;
    },
    enabled: !!id,
  });
}

export function useTotalBalance() {
  return useQuery({
    queryKey: accountKeys.totalBalance(),
    queryFn: async () => {
      const response = await window.api.accounts.totalBalance();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch total balance');
      }
      return response.data || 0;
    },
  });
}

// Mutations
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAccountInput) => {
      const response = await window.api.accounts.create(data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create account');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateAccountInput;
    }) => {
      const response = await window.api.accounts.update({ id, data });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update account');
      }
      return response.data;
    },
    onSuccess: async (_, variables) => {
      // Invalidate and refetch to ensure UI updates immediately
      await queryClient.invalidateQueries({ queryKey: accountKeys.all });
      await queryClient.invalidateQueries({
        queryKey: accountKeys.detail(variables.id),
      });
      // Force immediate refetch
      await queryClient.refetchQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useUpdateAccountBalance() {
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
      const response = await window.api.accounts.updateBalance({ id, amount, operation });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update account balance');
      }
      return response.data;
    },
    onSuccess: async (_, variables) => {
      // Refetch queries immediately for instant UI update
      await queryClient.refetchQueries({ queryKey: accountKeys.all });
      await queryClient.refetchQueries({
        queryKey: accountKeys.detail(variables.id),
      });
      await queryClient.refetchQueries({
        queryKey: accountKeys.balance(variables.id),
      });
      await queryClient.refetchQueries({
        queryKey: accountKeys.totalBalance(),
      });
      // Invalidate reports cache to ensure statistics are updated
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

// 🔥 Manual refresh hook
export function useRefreshAccounts() {
  const queryClient = useQueryClient();

  const refreshAccounts = async () => {
    await queryClient.refetchQueries({
      queryKey: accountKeys.all,
    });

  const update=  await queryClient.refetchQueries({
      queryKey: accountKeys.totalBalance(),
    });
  };
  return refreshAccounts;
}


export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await window.api.accounts.delete({ id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete account');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useSearchAccounts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (query: string) => {
      const response = await window.api.accounts.search({ term: query });
      if (!response.success) {
        throw new Error(response.error || 'Failed to search accounts');
      }
      return response.data || [];
    },
  });
}
