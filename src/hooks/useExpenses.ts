import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Expense,
  CreateExpenseInput,
  UpdateExpenseInput,
  ListFilters,
  ExpensesSummary,
} from '@/types/api';
import { accountKeys } from './useAccounts';
import { reportKeys } from './useReports';

// Query keys
export const expenseKeys = {
  all: ['expenses'] as const,
  lists: () => [...expenseKeys.all, 'list'] as const,
  list: (filters?: ListFilters) => [...expenseKeys.lists(), filters] as const,
  details: () => [...expenseKeys.all, 'detail'] as const,
  detail: (id: string) => [...expenseKeys.details(), id] as const,
  byCategory: (category: string, filters?: ListFilters) =>
    [...expenseKeys.all, 'category', category, filters] as const,
  byAccount: (accountId: string, filters?: ListFilters) =>
    [...expenseKeys.all, 'account', accountId, filters] as const,
  byDateRange: (startDate: string, endDate: string, filters?: ListFilters) =>
    [...expenseKeys.all, 'dateRange', startDate, endDate, filters] as const,
  total: (startDate?: string, endDate?: string) =>
    [...expenseKeys.all, 'total', startDate, endDate] as const,
  categorySummary: (startDate?: string, endDate?: string) =>
    [...expenseKeys.all, 'categorySummary', startDate, endDate] as const,
  topCategories: (limit?: number, startDate?: string, endDate?: string) =>
    [...expenseKeys.all, 'topCategories', limit, startDate, endDate] as const,
};

// Queries
export function useExpenses(filters?: ListFilters) {
  return useQuery({
    queryKey: expenseKeys.list(filters),
    queryFn: async () => {
            const response = await window.api.expenses.list(filters);
            if (!response.success) {
        throw new Error(response.error || 'Failed to fetch expenses');
      }
            return response.data || [];
    },
  });
}

export function useExpense(id: string, enabled = true) {
  return useQuery({
    queryKey: expenseKeys.detail(id),
    queryFn: async () => {
      const response = await window.api.expenses.get(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch expense');
      }
      return response.data;
    },
    enabled: enabled && !!id,
  });
}

export function useExpensesByCategory(category: string, filters?: ListFilters) {
  return useQuery({
    queryKey: expenseKeys.byCategory(category, filters),
    queryFn: async () => {
      const response = await window.api.expenses.byCategory(category, filters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch expenses by category');
      }
      return response.data || [];
    },
  });
}

export function useExpensesByAccount(accountId: string, filters?: ListFilters) {
  return useQuery({
    queryKey: expenseKeys.byAccount(accountId, filters),
    queryFn: async () => {
      const response = await window.api.expenses.byAccount(accountId, filters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch expenses by account');
      }
      return response.data || [];
    },
    enabled: !!accountId,
  });
}

export function useExpensesByDateRange(
  startDate: string,
  endDate: string,
  filters?: ListFilters
) {
  return useQuery({
    queryKey: expenseKeys.byDateRange(startDate, endDate, filters),
    queryFn: async () => {
      const response = await window.api.expenses.byDateRange(
        startDate,
        endDate,
        filters
      );
      if (!response.success) {
        throw new Error(
          response.error || 'Failed to fetch expenses by date range'
        );
      }
      return response.data || [];
    },
    enabled: !!startDate && !!endDate,
  });
}

export function useTotalExpenses(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: expenseKeys.total(startDate, endDate),
    queryFn: async () => {
      const response = await window.api.expenses.total(startDate, endDate);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch total expenses');
      }
      return response.data || 0;
    },
  });
}

export function useExpensesCategorySummary(
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: expenseKeys.categorySummary(startDate, endDate),
    queryFn: async () => {
      const response = await window.api.expenses.categorySummary(
        startDate,
        endDate
      );
      if (!response.success) {
        throw new Error(
          response.error || 'Failed to fetch expenses category summary'
        );
      }
      return response.data as ExpensesSummary;
    },
  });
}

export function useTopExpenseCategories(
  limit = 5,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: expenseKeys.topCategories(limit, startDate, endDate),
    queryFn: async () => {
      const response = await window.api.expenses.topCategories(
        limit,
        startDate,
        endDate
      );
      if (!response.success) {
        throw new Error(
          response.error || 'Failed to fetch top expense categories'
        );
      }
      return response.data || [];
    },
  });
}

// Mutations
export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExpenseInput) => {
      const response = await window.api.expenses.create(data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create expense');
      }
      return response.data;
    },
    onSuccess: (expense) => {
      // Invalidate expenses queries
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      
      // Invalidate account cache
      // Always invalidate accounts to ensure balance updates are shown
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.totalBalance() });
      
      if (expense?.account_id) {
        queryClient.invalidateQueries({
          queryKey: accountKeys.detail(expense.account_id),
        });
        queryClient.invalidateQueries({
          queryKey: accountKeys.balance(expense.account_id),
        });
      }
      
      // Invalidate reports cache
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateExpenseInput;
    }) => {
            const response = await window.api.expenses.update(id, data);
            if (!response.success) {
        throw new Error(response.error || 'Failed to update expense');
      }
      return response.data;
    },
    onSuccess: (expense, variables) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      queryClient.invalidateQueries({
        queryKey: expenseKeys.detail(variables.id),
      });
      
      // Invalidate account cache
      // Always invalidate accounts to ensure balance updates are shown
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.totalBalance() });
      
      if (expense?.account_id) {
        queryClient.invalidateQueries({
          queryKey: accountKeys.detail(expense.account_id),
        });
        queryClient.invalidateQueries({
          queryKey: accountKeys.balance(expense.account_id),
        });
      }
      
      // Invalidate reports cache
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
            const response = await window.api.expenses.delete(id);
            if (!response.success) {
        throw new Error(response.error || 'Failed to delete expense');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.totalBalance() });
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useExpenseSearch() {
  return useMutation({
    mutationFn: async (query: string) => {
      const response = await window.api.expenses.search(query);
      if (!response.success) {
        throw new Error(response.error || 'Failed to search expenses');
      }
      return response.data || [];
    },
  });
}
