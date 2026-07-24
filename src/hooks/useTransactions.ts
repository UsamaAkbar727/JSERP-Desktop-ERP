import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Transaction,
  CreateTransactionInput,
  ListFilters,
  InflowOutflowSummary,
} from '@/types/api';

// Query keys
export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters?: ListFilters) => [...transactionKeys.lists(), filters] as const,
  details: () => [...transactionKeys.all, 'detail'] as const,
  detail: (id: number) => [...transactionKeys.details(), id] as const,
  byAccount: (accountId: string, filters?: ListFilters) =>
    [...transactionKeys.all, 'account', accountId, filters] as const,
  byDateRange: (startDate: string, endDate: string, filters?: ListFilters) =>
    [...transactionKeys.all, 'dateRange', startDate, endDate, filters] as const,
  accountLedger: (accountId: string, startDate?: string, endDate?: string) =>
    [...transactionKeys.all, 'accountLedger', accountId, startDate, endDate] as const,
  search: (query: string) => [...transactionKeys.all, 'search', query] as const,
  inflowOutflowSummary: (startDate?: string, endDate?: string) =>
    [...transactionKeys.all, 'inflowOutflowSummary', startDate, endDate] as const,
};

// Queries
export function useTransactions(filters?: ListFilters) {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: async () => {
      const response = await window.api.transactions.list(filters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch transactions');
      }
      return response.data || [];
    },
  });
}

export function useTransaction(id: number, enabled = true) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: async () => {
      const response = await window.api.transactions.get(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch transaction');
      }
      return response.data;
    },
    enabled: enabled && !!id,
  });
}

export function useTransactionsByAccount(accountId: string, filters?: ListFilters) {
  return useQuery({
    queryKey: transactionKeys.byAccount(accountId, filters),
    queryFn: async () => {
      const response = await window.api.transactions.byAccount(accountId, filters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch transactions by account');
      }
      return response.data || [];
    },
    enabled: !!accountId,
  });
}

export function useTransactionsByDateRange(
  startDate: string,
  endDate: string,
  filters?: ListFilters
) {
  return useQuery({
    queryKey: transactionKeys.byDateRange(startDate, endDate, filters),
    queryFn: async () => {
      const response = await window.api.transactions.byDateRange(startDate, endDate, filters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch transactions by date range');
      }
      return response.data || [];
    },
    enabled: !!startDate && !!endDate,
  });
}

export function useAccountLedger(
  accountId: string,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: transactionKeys.accountLedger(accountId, startDate, endDate),
    queryFn: async () => {
      const response = await window.api.transactions.accountLedger(accountId, startDate, endDate);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch account ledger');
      }
      return response.data || [];
    },
    enabled: !!accountId,
  });
}

// Mutations
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTransactionInput) => {
      const response = await window.api.transactions.create(data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create transaction');
      }
      return response.data;
    },
    onSuccess: (transaction) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      
      if (transaction?.account_id) {
        queryClient.invalidateQueries({
          queryKey: transactionKeys.byAccount(transaction.account_id),
        });
        queryClient.invalidateQueries({
          queryKey: transactionKeys.accountLedger(transaction.account_id),
        });
      }
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreateTransactionInput>;
    }) => {
      const response = await window.api.transactions.update(id, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update transaction');
      }
      return response.data;
    },
    onSuccess: (transaction, variables) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({
        queryKey: transactionKeys.detail(variables.id),
      });
      
      if (transaction?.account_id) {
        queryClient.invalidateQueries({
          queryKey: transactionKeys.byAccount(transaction.account_id),
        });
        queryClient.invalidateQueries({
          queryKey: transactionKeys.accountLedger(transaction.account_id),
        });
      }
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await window.api.transactions.delete(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete transaction');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

export function useSearchTransactions() {
  return useMutation({
    mutationFn: async (query: string) => {
      const response = await window.api.transactions.search(query);
      if (!response.success) {
        throw new Error(response.error || 'Failed to search transactions');
      }
      return response.data || [];
    },
  });
}

export function useInflowOutflowSummary(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: transactionKeys.inflowOutflowSummary(startDate, endDate),
    queryFn: async () => {
      const response = await window.api.transactions.inflowOutflowSummary(startDate, endDate);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch inflow/outflow summary');
      }
      return response.data as InflowOutflowSummary;
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}