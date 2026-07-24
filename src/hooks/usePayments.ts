import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Payment,
  CreatePaymentInput,
  ListFilters,
  PaymentsSummary,
} from '@/types/api';
import { customerKeys } from './useCustomers';
import { supplierKeys } from './useSuppliers';
import { accountKeys } from './useAccounts';
import { saleKeys } from './useSales';
import { purchaseKeys } from './usePurchases';
import { reportKeys } from './useReports';

// Query keys
export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (filters?: ListFilters) => [...paymentKeys.lists(), filters] as const,
  details: () => [...paymentKeys.all, 'detail'] as const,
  detail: (id: number) => [...paymentKeys.details(), id] as const,
  receipts: (filters?: ListFilters) =>
    [...paymentKeys.all, 'receipts', filters] as const,
  supplierPayments: (filters?: ListFilters) =>
    [...paymentKeys.all, 'supplierPayments', filters] as const,
  byCustomer: (customerId: string, filters?: ListFilters) =>
    [...paymentKeys.all, 'customer', customerId, filters] as const,
  bySupplier: (supplierId: string, filters?: ListFilters) =>
    [...paymentKeys.all, 'supplier', supplierId, filters] as const,
  byAccount: (accountId: number, filters?: ListFilters) =>
    [...paymentKeys.all, 'account', accountId, filters] as const,
  bySale: (saleId: string) => [...paymentKeys.all, 'sale', saleId] as const,
  byPurchase: (purchaseId: string) =>
    [...paymentKeys.all, 'purchase', purchaseId] as const,
  byDateRange: (startDate: string, endDate: string, filters?: ListFilters) =>
    [...paymentKeys.all, 'dateRange', startDate, endDate, filters] as const,
  summary: (startDate?: string, endDate?: string) =>
    [...paymentKeys.all, 'summary', startDate, endDate] as const,
  totalReceipts: (startDate?: string, endDate?: string) =>
    [...paymentKeys.all, 'totalReceipts', startDate, endDate] as const,
  totalPayments: (startDate?: string, endDate?: string) =>
    [...paymentKeys.all, 'totalPayments', startDate, endDate] as const,
};

// Queries
export function usePayments(filters?: ListFilters) {
  return useQuery({
    queryKey: paymentKeys.list(filters),
    queryFn: async () => {
      const response = await window.api.payments.list(filters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch payments');
      }
      return response.data || [];
    },
  });
}

export function usePayment(id: number, enabled = true) {
  return useQuery({
    queryKey: paymentKeys.detail(id),
    queryFn: async () => {
      const response = await window.api.payments.get(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch payment');
      }
      return response.data;
    },
    enabled: enabled && id > 0,
  });
}

export function useReceipts(filters?: ListFilters) {
  return useQuery({
    queryKey: paymentKeys.receipts(filters),
    queryFn: async () => {
      const response = await window.api.payments.receipts(filters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch receipts');
      }
      return response.data || [];
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useSupplierPayments(filters?: ListFilters) {
  return useQuery({
    queryKey: paymentKeys.supplierPayments(filters),
    queryFn: async () => {
      const response = await window.api.payments.supplierPayments(filters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch supplier payments');
      }
      return response.data || [];
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useCustomerPayments(customerId?: string, filters?: ListFilters) {
  return useQuery({
    queryKey: paymentKeys.byCustomer(customerId || '', filters),
    queryFn: async () => {
      if (!customerId) return [];
      
      const response = await window.api.payments.byCustomer(
        { customerId },
        filters
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch customer payments');
      }
      return response.data || [];
    },
    enabled: !!customerId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useSupplierPaymentsList(
  supplierId: string,
  filters?: ListFilters
) {
  return useQuery({
    queryKey: paymentKeys.bySupplier(supplierId, filters),
    queryFn: async () => {
      const response = await window.api.payments.bySupplier({ supplierId }, filters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch supplier payments');
      }
      return response.data || [];
    },
    enabled: !!supplierId,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
    refetchOnMount: 'always', // Always refetch
  });
}

export function useAccountPayments(accountId: number, filters?: ListFilters) {
  return useQuery({
    queryKey: paymentKeys.byAccount(accountId, filters),
    queryFn: async () => {
      const response = await window.api.payments.byAccount(accountId, filters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch account payments');
      }
      return response.data || [];
    },
    enabled: accountId > 0,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useSalePayments(saleId: string) {
  return useQuery({
    queryKey: paymentKeys.bySale(saleId),
    queryFn: async () => {
      const response = await window.api.payments.bySale({ saleId });
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch sale payments');
      }
      return response.data || [];
    },
    enabled: !!saleId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function usePurchasePayments(purchaseId: string) {
  return useQuery({
    queryKey: paymentKeys.byPurchase(purchaseId),
    queryFn: async () => {
      const response = await window.api.payments.byPurchase({ purchaseId });
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch purchase payments');
      }
      return response.data || [];
    },
    enabled: !!purchaseId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function usePaymentsByDateRange(
  startDate: string,
  endDate: string,
  filters?: ListFilters
) {
  return useQuery({
    queryKey: paymentKeys.byDateRange(startDate, endDate, filters),
    queryFn: async () => {
      const response = await window.api.payments.byDateRange(
        startDate,
        endDate,
        filters
      );
      if (!response.success) {
        throw new Error(
          response.error || 'Failed to fetch payments by date range'
        );
      }
      return response.data || [];
    },
    enabled: !!startDate && !!endDate,
  });
}

export function usePaymentsSummary(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: paymentKeys.summary(startDate, endDate),
    queryFn: async () => {
      const response = await window.api.payments.summary(startDate, endDate);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch payments summary');
      }
      return response.data as PaymentsSummary;
    },
  });
}

export function useTotalReceipts(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: paymentKeys.totalReceipts(startDate, endDate),
    queryFn: async () => {
      const response = await window.api.payments.totalReceipts(
        startDate,
        endDate
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch total receipts');
      }
      return response.data || 0;
    },
  });
}

export function useTotalPaymentsAmount(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: paymentKeys.totalPayments(startDate, endDate),
    queryFn: async () => {
      const response = await window.api.payments.totalPayments(
        startDate,
        endDate
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch total payments');
      }
      return response.data || 0;
    },
  });
}

// Mutations
export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePaymentInput) => {
      const response = await window.api.payments.create(data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create payment');
      }
      return response.data;
    },
    onSuccess: async (payment) => {
      // Refetch payments queries immediately
      await queryClient.refetchQueries({ queryKey: paymentKeys.all });
      
      // Refetch account cache immediately to show updated balance
      // Use refetch instead of invalidate for immediate UI update
      await queryClient.refetchQueries({ queryKey: accountKeys.all });
      await queryClient.refetchQueries({ queryKey: accountKeys.totalBalance() });
      
      if (payment?.account_id) {
        await queryClient.refetchQueries({
          queryKey: accountKeys.detail(payment.account_id),
        });
        await queryClient.refetchQueries({
          queryKey: accountKeys.balance(payment.account_id),
        });
      }
      
      // Refetch customer cache immediately (if receipt)
      if (payment?.customer_id) {
        const customerId = String(payment.customer_id);
        await queryClient.refetchQueries({ queryKey: customerKeys.all });
        await queryClient.refetchQueries({
          queryKey: customerKeys.detail(customerId),
        });
        // Also refetch customer's sales to update payment status
        await queryClient.refetchQueries({ queryKey: saleKeys.all });
      }
      
      // Refetch supplier cache immediately (if payment)
      if (payment?.supplier_id) {
        const supplierId = String(payment.supplier_id);
        await queryClient.refetchQueries({ queryKey: supplierKeys.all });
        await queryClient.refetchQueries({
          queryKey: supplierKeys.detail(supplierId),
        });
        // Also refetch supplier's purchases to update payment status
        await queryClient.refetchQueries({ queryKey: purchaseKeys.all });
        // Specifically refetch this supplier's purchases (used on supplier detail page)
        await queryClient.refetchQueries({ 
          queryKey: purchaseKeys.bySupplier(supplierId, undefined) 
        });
        // Refetch supplier's payments list (used on supplier detail page)
        await queryClient.refetchQueries({ 
          queryKey: paymentKeys.bySupplier(supplierId, undefined) 
        });
      }
      
      // Invalidate related sale/purchase
      if (payment?.sale_id) {
        queryClient.invalidateQueries({ queryKey: saleKeys.all });
        queryClient.invalidateQueries({
          queryKey: saleKeys.detail(payment.sale_id),
        });
      }
      
      if (payment?.purchase_id) {
        queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
        queryClient.invalidateQueries({
          queryKey: purchaseKeys.detail(payment.purchase_id),
        });
      }
      
      // Invalidate reports cache (receivables/payables updated)
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreatePaymentInput>;
    }) => {
      const response = await window.api.payments.update(id, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update payment');
      }
      return response.data;
    },
    onSuccess: (payment, variables) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      queryClient.invalidateQueries({
        queryKey: paymentKeys.detail(variables.id),
      });
      
      // Invalidate related caches
      if (payment?.account_id) {
        queryClient.invalidateQueries({ queryKey: accountKeys.all });
      }
      if (payment?.customer_id) {
        queryClient.invalidateQueries({ queryKey: customerKeys.all });
      }
      if (payment?.supplier_id) {
        queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      }
      if (payment?.sale_id) {
        queryClient.invalidateQueries({ queryKey: saleKeys.all });
        queryClient.invalidateQueries({
          queryKey: saleKeys.detail(payment.sale_id),
        });
      }
      if (payment?.purchase_id) {
        queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
      }
      
      // Invalidate reports
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await window.api.payments.delete(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete payment');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function usePaymentSearch() {
  return useMutation({
    mutationFn: async (query: string) => {
      const response = await window.api.payments.search(query);
      if (!response.success) {
        throw new Error(response.error || 'Failed to search payments');
      }
      return response.data || [];
    },
  });
}
