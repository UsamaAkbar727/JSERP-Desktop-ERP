import { useQuery } from '@tanstack/react-query';
import { isElectronEnvironment } from '@/lib/electron-check';
import type {
  DashboardSummary,
  ProfitLossReport,
  ProductWiseReport,
  CashFlowReport,
  ExpensesSummary,
} from '@/types/api';

// Query keys
export const reportKeys = {
  all: ['reports'] as const,
  dashboardSummary: () => [...reportKeys.all, 'dashboardSummary'] as const,
  profitLoss: (startDate?: string, endDate?: string) =>
    [...reportKeys.all, 'profitLoss', startDate, endDate] as const,
  productWise: (startDate?: string, endDate?: string) =>
    [...reportKeys.all, 'productWise', startDate, endDate] as const,
  customerDues: () => [...reportKeys.all, 'customerDues'] as const,
  supplierPayables: () => [...reportKeys.all, 'supplierPayables'] as const,
  inventoryValuation: () => [...reportKeys.all, 'inventoryValuation'] as const,
  dailySales: (date: string) => [...reportKeys.all, 'dailySales', date] as const,
  dailyPurchases: (date: string) =>
    [...reportKeys.all, 'dailyPurchases', date] as const,
  expensesByCategory: (startDate?: string, endDate?: string) =>
    [...reportKeys.all, 'expensesByCategory', startDate, endDate] as const,
  accountLedger: (accountId: number, startDate?: string, endDate?: string) =>
    [...reportKeys.all, 'accountLedger', accountId, startDate, endDate] as const,
  topCustomers: (limit?: number) =>
    [...reportKeys.all, 'topCustomers', limit] as const,
  topSuppliers: (limit?: number) =>
    [...reportKeys.all, 'topSuppliers', limit] as const,
  cashFlow: (startDate: string, endDate: string) =>
    [...reportKeys.all, 'cashFlow', startDate, endDate] as const,
  salesComparison: (
    period1Start: string,
    period1End: string,
    period2Start: string,
    period2End: string
  ) =>
    [
      ...reportKeys.all,
      'salesComparison',
      period1Start,
      period1End,
      period2Start,
      period2End,
    ] as const,
};

// Dashboard Summary
export function useDashboardSummary() {
  return useQuery({
    queryKey: reportKeys.dashboardSummary(),
    queryFn: async () => {
            
      // Safety check for API availability
      if (!isElectronEnvironment() || !window.api?.reports?.dashboardSummary) {
        console.error('[useDashboardSummary] API not available:', {
          isElectron: isElectronEnvironment(),
          hasReports: !!window.api?.reports,
          hasDashboardSummary: !!window.api?.reports?.dashboardSummary,
        });
        throw new Error(
          'Electron API not available. Please run the app using "npm run electron:dev" instead of "npm run dev".'
        );
      }
      
            const response = await window.api.reports.dashboardSummary();
            
      if (!response.success) {
        console.error('[useDashboardSummary] API call failed:', response.error);
        throw new Error(response.error || 'Failed to fetch dashboard summary');
      }
      
            return response.data as DashboardSummary;
    },
    staleTime: 5 * 1000, // 5 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to app
  });
}

// Profit & Loss Report
export function useProfitLossReport(startDate?: string, endDate?: string) {
  
  return useQuery({
    queryKey: reportKeys.profitLoss(startDate, endDate),
    queryFn: async () => {
      
      // Pass as object to match backend expectations
      const response = await window.api.reports.profitLoss({
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch report');
      }
      
      return response.data as ProfitLossReport;
    },
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
  });
}


// Product-wise Sales Report
export function useProductWiseReport(startDate?: string, endDate?: string) {
  
  return useQuery({
    queryKey: reportKeys.productWise(startDate, endDate),
    queryFn: async () => {
      
      // Pass as object to match backend expectations
      const response = await window.api.reports.productWise({
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      
      
      if (!response.success) {
        throw new Error(
          response.error || 'Failed to fetch product-wise report'
        );
      }
      
      return response.data as ProductWiseReport[];
    },
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
  });
}

// Customer Dues Report
export function useCustomerDuesReport() {
  return useQuery({
    queryKey: reportKeys.customerDues(),
    queryFn: async () => {
      const response = await window.api.reports.customerDues();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch customer dues report');
      }
      return response.data || [];
    },
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
  });
}

// Supplier Payables Report
export function useSupplierPayablesReport() {
  return useQuery({
    queryKey: reportKeys.supplierPayables(),
    queryFn: async () => {
      const response = await window.api.reports.supplierPayables();
      if (!response.success) {
        throw new Error(
          response.error || 'Failed to fetch supplier payables report'
        );
      }
      return response.data || [];
    },
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
  });
}

// Inventory Valuation Report
export function useInventoryValuationReport() {
  return useQuery({
    queryKey: reportKeys.inventoryValuation(),
    queryFn: async () => {
      const response = await window.api.reports.inventoryValuation();
      if (!response.success) {
        throw new Error(
          response.error || 'Failed to fetch inventory valuation report'
        );
      }
      return response.data || [];
    },
  });
}

// Daily Sales Report
export function useDailySalesReport(date: string) {
  return useQuery({
    queryKey: reportKeys.dailySales(date),
    queryFn: async () => {
      const response = await window.api.reports.dailySales(date);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch daily sales report');
      }
      return response.data;
    },
    enabled: !!date,
  });
}

// Daily Purchases Report
export function useDailyPurchasesReport(date: string) {
  return useQuery({
    queryKey: reportKeys.dailyPurchases(date),
    queryFn: async () => {
      const response = await window.api.reports.dailyPurchases(date);
      if (!response.success) {
        throw new Error(
          response.error || 'Failed to fetch daily purchases report'
        );
      }
      return response.data;
    },
    enabled: !!date,
  });
}

// Expenses by Category Report
export function useExpensesByCategoryReport(
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: reportKeys.expensesByCategory(startDate, endDate),
    queryFn: async () => {
      const response = await window.api.reports.expensesByCategory(
        startDate,
        endDate
      );
      if (!response.success) {
        throw new Error(
          response.error || 'Failed to fetch expenses by category report'
        );
      }
      return response.data as ExpensesSummary;
    },
  });
}

// Account Ledger Report
export function useAccountLedgerReport(
  accountId: number,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: reportKeys.accountLedger(accountId, startDate, endDate),
    queryFn: async () => {
      const response = await window.api.reports.accountLedger(
        accountId,
        startDate,
        endDate
      );
      if (!response.success) {
        throw new Error(
          response.error || 'Failed to fetch account ledger report'
        );
      }
      return response.data;
    },
    enabled: accountId > 0,
  });
}

// Top Customers Report
export function useTopCustomersReport(limit = 10) {
  return useQuery({
    queryKey: reportKeys.topCustomers(limit),
    queryFn: async () => {
      const response = await window.api.reports.topCustomers(limit);
      if (!response.success) {
        throw new Error(
          response.error || 'Failed to fetch top customers report'
        );
      }
      return response.data || [];
    },
  });
}

// Top Suppliers Report
export function useTopSuppliersReport(limit = 10) {
  return useQuery({
    queryKey: reportKeys.topSuppliers(limit),
    queryFn: async () => {
      const response = await window.api.reports.topSuppliers(limit);
      if (!response.success) {
        throw new Error(
          response.error || 'Failed to fetch top suppliers report'
        );
      }
      return response.data || [];
    },
  });
}

// Cash Flow Report
export function useCashFlowReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: reportKeys.cashFlow(startDate, endDate),
    queryFn: async () => {
      const response = await window.api.reports.cashFlow(startDate, endDate);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch cash flow report');
      }
      return response.data as CashFlowReport;
    },
    enabled: !!startDate && !!endDate,
  });
}

// Sales Comparison Report
export function useSalesComparisonReport(
  period1Start: string,
  period1End: string,
  period2Start: string,
  period2End: string
) {
  return useQuery({
    queryKey: reportKeys.salesComparison(
      period1Start,
      period1End,
      period2Start,
      period2End
    ),
    queryFn: async () => {
      const response = await window.api.reports.salesComparison(
        period1Start,
        period1End,
        period2Start,
        period2End
      );
      if (!response.success) {
        throw new Error(
          response.error || 'Failed to fetch sales comparison report'
        );
      }
      return response.data;
    },
    enabled:
      !!period1Start && !!period1End && !!period2Start && !!period2End,
  });
}
