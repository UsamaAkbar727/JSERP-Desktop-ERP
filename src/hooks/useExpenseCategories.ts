import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ExpenseCategory, CreateExpenseCategoryInput, UpdateExpenseCategoryInput } from '@/types/api';

// Query keys
export const expenseCategoryKeys = {
  all: ['expenseCategories'] as const,
  lists: () => [...expenseCategoryKeys.all, 'list'] as const,
  list: () => [...expenseCategoryKeys.lists()] as const,
  active: () => [...expenseCategoryKeys.all, 'active'] as const,
  details: () => [...expenseCategoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...expenseCategoryKeys.details(), id] as const,
};

// Queries
export function useExpenseCategories() {
  return useQuery({
    queryKey: expenseCategoryKeys.list(),
    queryFn: async () => {
      const response = await window.api.expenseCategories.list();
      if (!response.success) {
        console.error('❌ [useExpenseCategories] Error:', response.error);
        throw new Error(response.error || 'Failed to fetch expense categories');
      }
      return response.data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - categories don't change often
  });
}

export function useActiveExpenseCategories() {
  return useQuery({
    queryKey: expenseCategoryKeys.active(),
    queryFn: async () => {
      const response = await window.api.expenseCategories.active();
      if (!response.success) {
        console.error('❌ [useActiveExpenseCategories] Error:', response.error);
        throw new Error(response.error || 'Failed to fetch active expense categories');
      }
      return response.data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useExpenseCategory(id: string, enabled = true) {
  return useQuery({
    queryKey: expenseCategoryKeys.detail(id),
    queryFn: async () => {
      const response = await window.api.expenseCategories.get(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch expense category');
      }
      return response.data;
    },
    enabled: enabled && id.length > 0,
  });
}

// Mutations
export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExpenseCategoryInput) => {
      const response = await window.api.expenseCategories.create(data);
      
      if (!response.success) {
        console.error('❌ [useCreateExpenseCategory] API returned error:', response.error);
        throw new Error(response.error || 'Failed to create expense category');
      }
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseCategoryKeys.all });
      queryClient.refetchQueries({ queryKey: expenseCategoryKeys.list() });
      queryClient.refetchQueries({ queryKey: expenseCategoryKeys.active() });
    },
    onError: (error) => {
      console.error('❌ [useCreateExpenseCategory] Mutation error:', error);
    },
  });
}

export function useUpdateExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateExpenseCategoryInput;
    }) => {
      const response = await window.api.expenseCategories.update(id, data);
      
      if (!response.success) {
        console.error('❌ [useUpdateExpenseCategory] API returned error:', response.error);
        throw new Error(response.error || 'Failed to update expense category');
      }
      
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: expenseCategoryKeys.all });
      queryClient.invalidateQueries({ queryKey: expenseCategoryKeys.detail(variables.id) });
      queryClient.refetchQueries({ queryKey: expenseCategoryKeys.list() });
      queryClient.refetchQueries({ queryKey: expenseCategoryKeys.active() });
    },
    onError: (error) => {
      console.error('❌ [useUpdateExpenseCategory] Mutation error:', error);
    },
  });
}

export function useDeleteExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await window.api.expenseCategories.delete(id);
      
      if (!response.success) {
        console.error('❌ [useDeleteExpenseCategory] API returned error:', response.error);
        throw new Error(response.error || 'Failed to delete expense category');
      }
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseCategoryKeys.all });
      queryClient.refetchQueries({ queryKey: expenseCategoryKeys.list() });
      queryClient.refetchQueries({ queryKey: expenseCategoryKeys.active() });
    },
    onError: (error) => {
      console.error('❌ [useDeleteExpenseCategory] Mutation error:', error);
    },
  });
}
