import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Sale,
  SaleWithItems,
  CreateSaleInput,
  UpdateSaleInput,
  ListFilters,
  SalesSummary,
} from '@/types/api';
import { itemKeys } from './useItems';
import { customerKeys } from './useCustomers';
import { accountKeys } from './useAccounts';
import { reportKeys } from './useReports';

// Query keys
export const saleKeys = {
  all: ['sales'] as const,
  lists: () => [...saleKeys.all, 'list'] as const,
  list: (filters?: ListFilters) => [...saleKeys.lists(), filters] as const,
  details: () => [...saleKeys.all, 'detail'] as const,
  detail: (id: string) => [...saleKeys.details(), id] as const,
  detailWithItems: (id: string) =>
    [...saleKeys.all, 'detailWithItems', id] as const,
  byCustomer: (customerId: string, filters?: ListFilters) =>
    [...saleKeys.all, 'customer', customerId, filters] as const,
  byDateRange: (startDate: string, endDate: string, filters?: ListFilters) =>
    [...saleKeys.all, 'dateRange', startDate, endDate, filters] as const,
  byPaymentStatus: (status: string, filters?: ListFilters) =>
    [...saleKeys.all, 'paymentStatus', status, filters] as const,
  summary: (startDate?: string, endDate?: string) =>
    [...saleKeys.all, 'summary', startDate, endDate] as const,
  nextInvoice: () => [...saleKeys.all, 'nextInvoice'] as const,
};

// Queries
export function useSales(filters?: ListFilters) {
  return useQuery({
    queryKey: saleKeys.list(filters),
    queryFn: async () => {
      
      if (!window.api?.sales?.list) {
        console.error('[useSales] API not available!');
        throw new Error('Sales API not available');
      }

      const response = await window.api.sales.list(filters);
      
      if (!response.success) {
        console.error('[useSales] Failed:', response.error);
        throw new Error(response.error || 'Failed to fetch sales');
      }

            return response.data || [];
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });
}

export function useSale(id: string, enabled = true) {
  return useQuery({
    queryKey: saleKeys.detail(id),
    queryFn: async () => {
      const response = await window.api.sales.get({ id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch sale');
      }
      return response.data;
    },
    enabled: enabled && !!id,
  });
}

export function useSaleWithItems(id: string, enabled = true) {
  return useQuery({
    queryKey: saleKeys.detailWithItems(id),
    queryFn: async () => {
      const response = await window.api.sales.getWithItems({ id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch sale with items');
      }
      return response.data as SaleWithItems;
    },
    enabled: enabled && !!id,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// Refresh sales manually from anywhere
export function useRefreshSales() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.refetchQueries({
      queryKey: saleKeys.all,
    });

    queryClient.invalidateQueries({
      queryKey: reportKeys.all,
    });
  };
}

export function useCustomerSales(customerId?: string, filters?: ListFilters) {
  return useQuery({
    queryKey: saleKeys.byCustomer(customerId || '', filters),

    queryFn: async () => {
      if (!customerId) return [];

      const response = await window.api.sales.byCustomer(
        { customerId },
        filters
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch customer sales');
      }

      return response.data || [];
    },

    // Enable only when ID exists
    enabled: !!customerId,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });
}



export function useSalesByDateRange(
  startDate: string,
  endDate: string,
  filters?: ListFilters
) {
  return useQuery({
    queryKey: saleKeys.byDateRange(startDate, endDate, filters),
    queryFn: async () => {
      const response = await window.api.sales.byDateRange(
        startDate,
        endDate,
        filters
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch sales by date range');
      }
      return response.data || [];
    },
    enabled: !!startDate && !!endDate,
  });
}

export function useSalesByPaymentStatus(
  status: string,
  filters?: ListFilters
) {
  return useQuery({
    queryKey: saleKeys.byPaymentStatus(status, filters),
    queryFn: async () => {
      const response = await window.api.sales.byPaymentStatus(status, filters);
      if (!response.success) {
        throw new Error(
          response.error || 'Failed to fetch sales by payment status'
        );
      }
      return response.data || [];
    },
  });
}

export function useSalesSummary(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: saleKeys.summary(startDate, endDate),
    queryFn: async () => {
      const response = await window.api.sales.summary(startDate, endDate);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch sales summary');
      }
      return response.data as SalesSummary;
    },
  });
}

export function useNextInvoiceNumber() {
  return useQuery({
    queryKey: saleKeys.nextInvoice(),
    queryFn: async () => {
      const response = await window.api.sales.nextInvoice();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch next invoice number');
      }
      return response.data || '';
    },
  });
}

export function useSaleByInvoice() {
  return useMutation({
    mutationFn: async (invoiceNo: string) => {
      const response = await window.api.sales.byInvoice(invoiceNo);
      if (!response.success) {
        throw new Error(response.error || 'Sale not found');
      }
      return response.data;
    },
  });
}

// Mutations
export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSaleInput) => {
      const response = await window.api.sales.create(data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create sale');
      }
      return response.data;
    },
    onSuccess: async (sale) => {
      // Refetch sales queries immediately to update the cache
      await queryClient.refetchQueries({ queryKey: saleKeys.all });

      // Invalidate items cache (stock updated)
      queryClient.invalidateQueries({ queryKey: itemKeys.all });

      // Invalidate payments cache so customer totals update immediately
      queryClient.invalidateQueries({ queryKey: ['payments'] });

      // Invalidate customer cache (balance updated)
      if (sale?.customer_id) {
        queryClient.invalidateQueries({ queryKey: customerKeys.all });
        queryClient.invalidateQueries({
          queryKey: customerKeys.detail(String(sale.customer_id)),
        });
      }

      // Invalidate reports cache (revenue/profit updated)
      queryClient.invalidateQueries({ queryKey: reportKeys.all });

      // Refetch account cache immediately to show updated balance
      // Use refetch instead of invalidate for immediate UI update
      await queryClient.refetchQueries({ queryKey: accountKeys.all });
      await queryClient.refetchQueries({ queryKey: accountKeys.totalBalance() });
      
      if (sale?.account_id) {
        await queryClient.refetchQueries({
          queryKey: accountKeys.detail(sale.account_id),
        });
        await queryClient.refetchQueries({
          queryKey: accountKeys.balance(sale.account_id),
        });
      }
      
      // Invalidate reports cache
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useUpdateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSaleInput;
    }) => {
      const response = await window.api.sales.update({ id, data });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update sale');
      }
      return response.data;
    },
    onSuccess: (sale, variables) => {
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
      queryClient.invalidateQueries({ queryKey: saleKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: itemKeys.all });

      // Invalidate payments cache so customer/sale payment totals update immediately
      queryClient.invalidateQueries({ queryKey: ['payments'] });

      if (sale?.customer_id) {
        queryClient.invalidateQueries({ queryKey: customerKeys.all });
      }

      // Invalidate reports cache
      queryClient.invalidateQueries({ queryKey: reportKeys.all });

      // Always invalidate accounts to ensure balance updates are shown
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.totalBalance() });
      
      if (sale?.account_id) {
        queryClient.invalidateQueries({
          queryKey: accountKeys.detail(sale.account_id),
        });
        queryClient.invalidateQueries({
          queryKey: accountKeys.balance(sale.account_id),
        });
      }
      
      // Invalidate reports cache
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useUpdateSaleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: 'paid' | 'partial' | 'unpaid';
    }) => {
      const response = await window.api.sales.updateStatus({ id, status });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update sale status');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
      queryClient.invalidateQueries({ queryKey: saleKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await window.api.sales.delete({ id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete sale');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.totalBalance() });
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useSaleSearch() {
  return useMutation({
    mutationFn: async (query: string) => {
      const response = await window.api.sales.search(query);
      if (!response.success) {
        throw new Error(response.error || 'Failed to search sales');
      }
      return response.data || [];
    },
  });
}
