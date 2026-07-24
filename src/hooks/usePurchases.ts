import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Purchase,
  PurchaseWithItems,
  CreatePurchaseInput,
  UpdatePurchaseInput,
  ListFilters,
  PurchasesSummary,
} from '@/types/api';
import { itemKeys } from './useItems';
import { supplierKeys } from './useSuppliers';
import { accountKeys } from './useAccounts';
import { reportKeys } from './useReports';

// Query keys
export const purchaseKeys = {
  all: ['purchases'] as const,
  lists: () => [...purchaseKeys.all, 'list'] as const,
  list: (filters?: ListFilters) => [...purchaseKeys.lists(), filters] as const,
  details: () => [...purchaseKeys.all, 'detail'] as const,
  detail: (id: string) => [...purchaseKeys.details(), id] as const,
  detailWithItems: (id: string) =>
    [...purchaseKeys.all, 'detailWithItems', id] as const,
  bySupplier: (supplierId: string, filters?: ListFilters) =>
    [...purchaseKeys.all, 'supplier', supplierId, filters] as const,
  byDateRange: (startDate: string, endDate: string, filters?: ListFilters) =>
    [...purchaseKeys.all, 'dateRange', startDate, endDate, filters] as const,
  byPaymentStatus: (status: string, filters?: ListFilters) =>
    [...purchaseKeys.all, 'paymentStatus', status, filters] as const,
  summary: (startDate?: string, endDate?: string) =>
    [...purchaseKeys.all, 'summary', startDate, endDate] as const,
  nextBill: () => [...purchaseKeys.all, 'nextBill'] as const,
};

// Queries
export function usePurchases(filters?: ListFilters) {
  return useQuery({
    queryKey: purchaseKeys.list(filters),
    queryFn: async () => {
      const response = await window.api.purchases.list(filters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch purchases');
      }
      return response.data || [];
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });
}

export function usePurchase(id: string, enabled = true) {
  return useQuery({
    queryKey: purchaseKeys.detail(id),
    queryFn: async () => {
      const response = await window.api.purchases.get({ id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch purchase');
      }
      return response.data;
    },
    enabled: enabled && !!id,
  });
}

export function usePurchaseWithItems(id: string, enabled = true) {
  return useQuery({
    queryKey: purchaseKeys.detailWithItems(id),
    queryFn: async () => {
      const response = await window.api.purchases.getWithItems({ id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch purchase with items');
      }
      return response.data as PurchaseWithItems;
    },
    enabled: enabled && !!id,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

export function useSupplierPurchases(
  supplierId: string,
  filters?: ListFilters
) {
  return useQuery({

    queryKey: purchaseKeys.bySupplier(supplierId, filters),
    queryFn: async () => {
      const response = await window.api.purchases.bySupplier(
        { supplierId },
        filters
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch supplier purchases');
      }
      return response.data || [];
    },
    enabled: !!supplierId,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });
}

export function usePurchasesByDateRange(
  startDate: string,
  endDate: string,
  filters?: ListFilters
) {
  return useQuery({
    queryKey: purchaseKeys.byDateRange(startDate, endDate, filters),
    queryFn: async () => {
      const response = await window.api.purchases.byDateRange(
        startDate,
        endDate,
        filters
      );
      if (!response.success) {
        throw new Error(
          response.error || 'Failed to fetch purchases by date range'
        );
      }
      return response.data || [];
    },
    enabled: !!startDate && !!endDate,
  });
}

export function usePurchasesByPaymentStatus(
  status: string,
  filters?: ListFilters
) {
  return useQuery({
    queryKey: purchaseKeys.byPaymentStatus(status, filters),
    queryFn: async () => {
      const response = await window.api.purchases.byPaymentStatus(
        status,
        filters
      );
      if (!response.success) {
        throw new Error(
          response.error || 'Failed to fetch purchases by payment status'
        );
      }
      return response.data || [];
    },
  });
}

export function usePurchasesSummary(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: purchaseKeys.summary(startDate, endDate),
    queryFn: async () => {
      const response = await window.api.purchases.summary(startDate, endDate);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch purchases summary');
      }
      return response.data as PurchasesSummary;
    },
  });
}

export function useNextBillNumber() {
  return useQuery({
    queryKey: purchaseKeys.nextBill(),
    queryFn: async () => {
      const response = await window.api.purchases.nextBill();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch next bill number');
      }
      return response.data || '';
    },
  });
}

export function usePurchaseByBill() {
  return useMutation({
    mutationFn: async (billNo: string) => {
      const response = await window.api.purchases.byBill(billNo);
      if (!response.success) {
        throw new Error(response.error || 'Purchase not found');
      }
      return response.data;
    },
  });
}

// Mutations
export function useCreatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePurchaseInput) => {
      const response = await window.api.purchases.create(data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create purchase');
      }
      return response.data;
    },
    onSuccess: (purchase) => {
      // Invalidate purchases queries
      queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
      
      // Invalidate items cache (stock updated)
      queryClient.invalidateQueries({ queryKey: itemKeys.all });

      // Invalidate payments cache so supplier totals update immediately
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      
      // Invalidate supplier cache (balance updated)
      if (purchase?.supplier_id) {
        queryClient.invalidateQueries({ queryKey: supplierKeys.all });
        queryClient.invalidateQueries({
          queryKey: supplierKeys.detail(String(purchase.supplier_id)),
        });
      }
      
      // Invalidate reports cache (cost/profit updated)
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
      
      // Invalidate account cache (if payment made)
      // Always invalidate accounts to ensure balance updates are shown
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.totalBalance() });
      
      if (purchase?.account_id) {
        queryClient.invalidateQueries({
          queryKey: accountKeys.detail(purchase.account_id),
        });
        queryClient.invalidateQueries({
          queryKey: accountKeys.balance(purchase.account_id),
        });
      }
      
      // Invalidate reports cache
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useUpdatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdatePurchaseInput;
    }) => {
      const response = await window.api.purchases.update({ id, data });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update purchase');
      }
      return response.data;
    },
    onSuccess: (purchase, variables) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
      queryClient.invalidateQueries({
        queryKey: purchaseKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: itemKeys.all });

      // Invalidate payments cache so supplier totals update immediately
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      
      if (purchase?.supplier_id) {
        queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      }
      
      // Invalidate reports cache
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
      
      // Always invalidate accounts to ensure balance updates are shown
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.totalBalance() });
      
      if (purchase?.account_id) {
        queryClient.invalidateQueries({
          queryKey: accountKeys.detail(purchase.account_id),
        });
        queryClient.invalidateQueries({
          queryKey: accountKeys.balance(purchase.account_id),
        });
      }
      
      // Invalidate reports cache
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useUpdatePurchaseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: 'paid' | 'partial' | 'unpaid';
    }) => {
      const response = await window.api.purchases.updateStatus({ id, status });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update purchase status');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
      queryClient.invalidateQueries({
        queryKey: purchaseKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useDeletePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await window.api.purchases.delete({ id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete purchase');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.totalBalance() });
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function usePurchaseSearch() {
  return useMutation({
    mutationFn: async (query: string) => {
      const response = await window.api.purchases.search(query);
      if (!response.success) {
        throw new Error(response.error || 'Failed to search purchases');
      }
      return response.data || [];
    },
  });
}
