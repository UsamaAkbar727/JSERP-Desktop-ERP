/**
 * Reports IPC Handlers
 * Handles IPC communication for various business reports and analytics
 */

import { registerIPCHandler, validators } from '../index';

/**
 * Register all reports-related IPC handlers
 */
export function registerReportsHandlers(): void {
  // Dashboard summary report
  registerIPCHandler('reports:dashboard-summary', async (event, args, repos) => {
    
    // Calculate date ranges
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0];
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    
    // Get parallel data for dashboard
    const [
      salesToday,
      salesWeek,
      salesMonth,
      salesYear,
      purchasesToday,
      purchasesWeek,
      purchasesMonth,
      purchasesYear,
      expensesToday,
      expensesWeek,
      expensesMonth,
      expensesYear,
      customerStats,
      supplierStats,
      inventoryStats,
    ] = await Promise.all([
      repos.sales.getSalesSummary(today, today),
      repos.sales.getSalesSummary(startOfWeek, endDate),
      repos.sales.getSalesSummary(startOfMonth, endDate),
      repos.sales.getSalesSummary(startOfYear, endDate),
      repos.purchases.getPurchasesSummary(today, today),
      repos.purchases.getPurchasesSummary(startOfWeek, endDate),
      repos.purchases.getPurchasesSummary(startOfMonth, endDate),
      repos.purchases.getPurchasesSummary(startOfYear, endDate),
      repos.expenses.getTotalExpenses(today, today),
      repos.expenses.getTotalExpenses(startOfWeek, endDate),
      repos.expenses.getTotalExpenses(startOfMonth, endDate),
      repos.expenses.getTotalExpenses(startOfYear, endDate),
      repos.customers.getStatistics(),
      repos.suppliers.getStatistics(),
      repos.items.getStatistics(),
    ]);

    return {
      sales: {
        today: salesToday.totalAmount || 0,
        week: salesWeek.totalAmount || 0,
        month: salesMonth.totalAmount || 0,
        year: salesYear.totalAmount || 0,
      },
      purchases: {
        today: purchasesToday.totalAmount || 0,
        week: purchasesWeek.totalAmount || 0,
        month: purchasesMonth.totalAmount || 0,
        year: purchasesYear.totalAmount || 0,
      },
      expenses: {
        today: expensesToday || 0,
        week: expensesWeek || 0,
        month: expensesMonth || 0,
        year: expensesYear || 0,
      },
      receivables: customerStats.totalReceivables || 0,
      payables: supplierStats.totalPayables || 0,
      cash_in_hand: 0,
      bank_balance: 0,
      inventory_value: inventoryStats.totalInventoryValue || 0,
      low_stock_items: inventoryStats.lowStockItems || 0,
    };
  });

  // Profit and loss report
  registerIPCHandler('reports:profit-loss', async (event, args, repos) => {
    const { startDate, endDate } = args || {};
    
    // If dates are not provided, use all-time data (no date filter)
    // Otherwise use the provided date range

    // Get sales revenue, COGS, and expenses data
    const [salesSummary, cogs, totalExpenses] = await Promise.all([
      repos.sales.getSalesSummary(startDate, endDate),
      repos.sales.getCOGS(startDate, endDate),
      repos.expenses.getTotalExpenses(startDate, endDate),
    ]);
   

   

    // Calculate profit/loss with correct formula
    const revenue = salesSummary.totalAmount || 0; // Total sales amount (revenue)
    const costOfGoods = cogs || 0; // Actual cost of items sold
    const expenses = totalExpenses || 0;
    const grossProfit = revenue - costOfGoods; // Gross Profit = Revenue - COGS
    const netProfit = grossProfit - expenses; // Net Profit = Gross Profit - Expenses

    const result = {
      period: startDate && endDate ? `${startDate} to ${endDate}` : 'All Time',
      revenue: revenue,
      cost_of_goods: costOfGoods,
      gross_profit: grossProfit,
      expenses: expenses,
      net_profit: netProfit,
    };

    return result;
  });

  // Product-wise sales report
  registerIPCHandler('reports:product-wise', async (event, args, repos) => {
    const { startDate, endDate, limit } = args || {};

    // Get all items
    const allItems = await repos.items.getAll();
    
    // Get sales and purchase data in parallel
    const [salesByItem, purchasesByItem] = await Promise.all([
      repos.sales.getTopSellingItems(999999, startDate, endDate),
      repos.purchases.getTopPurchasedItems(999999, startDate, endDate),
    ]);


    // Create a map for quick lookups
    const salesMap = new Map(salesByItem.map((item: any) => [item.item_id, item]));
    const purchasesMap = new Map(purchasesByItem.map((item: any) => [item.item_id, item]));

    // Build comprehensive product report for all items
    const productReport = allItems.map((item: any) => {
      const salesData = salesMap.get(item.id) || { totalQuantity: 0, totalAmount: 0 };
      const purchaseData = purchasesMap.get(item.id) || { totalQuantity: 0, totalAmount: 0 };
      
      const quantitySold = salesData.totalQuantity || 0;
      const quantityPurchased = purchaseData.totalQuantity || 0;
      const revenue = salesData.totalAmount || 0;
      const cost = purchaseData.totalAmount || 0;
      const profit = revenue - cost;

      return {
        item_id: item.id,
        item_name: item.name,
        quantity_sold: quantitySold,
        quantity_purchased: quantityPurchased,
        current_stock: item.stock_quantity || 0,
        total_revenue: revenue,
        cost: cost,
        profit: profit,
        profit_margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      };
    });

    return productReport;
  });

  // Customer dues report
  registerIPCHandler('reports:customer-dues', async (event, args, repos) => {
    const customersWithDues = await repos.customers.getWithDues();

    // Sort by due amount descending
    const sortedCustomers = customersWithDues.sort((a: any, b: any) => 
      (b.current_balance || 0) - (a.current_balance || 0)
    );

    // Return mapped format matching API type definition
    return sortedCustomers.map((c: any) => ({
      customer_id: c.id,
      customer_name: c.name,
      total_due: c.current_balance || 0,
    }));
  });

  // Supplier payables report
  registerIPCHandler('reports:supplier-payables', async (event, args, repos) => {
    const suppliersWithPayables = await repos.suppliers.getWithPayables();

    // Sort by payable amount descending
    const sortedSuppliers = suppliersWithPayables.sort((a: any, b: any) => 
      (b.current_balance || 0) - (a.current_balance || 0)
    );

    // Return mapped format matching API type definition
    return sortedSuppliers.map((s: any) => ({
      supplier_id: s.id,
      supplier_name: s.name,
      total_payable: s.current_balance || 0,
    }));
  });

  // Inventory valuation report
  registerIPCHandler('reports:inventory-valuation', async (event, args, repos) => {
    const allItems = await repos.items.getAll();
    const inventoryValue = await repos.items.getTotalInventoryValue();
    const lowStockItems = await repos.items.getLowStock();
    const outOfStockItems = await repos.items.getOutOfStock();

    return {
      inventory: allItems,
      summary: {
        total_items: allItems.length,
        total_value: inventoryValue,
        low_stock_items: lowStockItems.length,
        out_of_stock_items: outOfStockItems.length,
      },
      alerts: {
        low_stock: lowStockItems,
        out_of_stock: outOfStockItems,
      },
    };
  });

  // Daily sales report
  registerIPCHandler('reports:daily-sales', async (event, args, repos) => {
    const { startDate, endDate } = args;
    validators.requiredString(startDate, 'Start Date');
    validators.requiredString(endDate, 'End Date');

    return repos.sales.getDailySalesReport(startDate, endDate);
  });

  // Daily purchases report
  registerIPCHandler('reports:daily-purchases', async (event, args, repos) => {
    const { startDate, endDate } = args;
    validators.requiredString(startDate, 'Start Date');
    validators.requiredString(endDate, 'End Date');

    return repos.purchases.getDailyPurchasesReport(startDate, endDate);
  });

  // Expense report by category
  registerIPCHandler('reports:expenses-by-category', async (event, args, repos) => {
    const { startDate, endDate } = args || {};
    
    const expensesByCategory = await repos.expenses.getByCategory('');
    const totalExpenses = await repos.expenses.getTotalExpenses(startDate, endDate);
    const topCategories = await repos.expenses.getTopCategories(10);

    return {
      period: { startDate, endDate },
      categories: expensesByCategory,
      top_categories: topCategories,
      summary: {
        total_expenses: totalExpenses,
        total_categories: expensesByCategory.length,
      },
    };
  });

  // Account ledger report
  registerIPCHandler('reports:account-ledger', async (event, args, repos) => {
    const { accountId, startDate, endDate } = args;
    validators.requiredString(accountId, 'Account ID');

    const account = await repos.accounts.getById(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    const ledger = await repos.transactions.getAccountLedger(accountId, startDate, endDate);

    return {
      account,
      period: { startDate, endDate },
      transactions: ledger,
    };
  });

  // Top customers report
  registerIPCHandler('reports:top-customers', async (event, args, repos) => {
    const { limit } = args || {};
    return repos.customers.getTopCustomers(limit || 10);
  });

  // Top suppliers report
  registerIPCHandler('reports:top-suppliers', async (event, args, repos) => {
    const { limit } = args || {};
    return repos.suppliers.getTopSuppliers(limit || 10);
  });

  // Cash flow report
  registerIPCHandler('reports:cash-flow', async (event, args, repos) => {
    const { startDate, endDate } = args || {};

    const [totalReceived, totalPaid, accounts] = await Promise.all([
      repos.payments.getTotalReceipts(startDate, endDate),
      repos.payments.getTotalPayments(startDate, endDate),
      repos.accounts.getAll({ status: 'active' }),
    ]);

    const totalBalance = await repos.accounts.getTotalBalance();

    return {
      period: { startDate, endDate },
      cash_in: totalReceived,
      cash_out: totalPaid,
      net_cash_flow: totalReceived - totalPaid,
      accounts: accounts.map((acc: any) => ({
        id: acc.id,
        name: acc.account_name,
        type: acc.account_type,
        balance: acc.current_balance,
      })),
      total_balance: totalBalance,
    };
  });

  // Sales comparison report
  registerIPCHandler('reports:sales-comparison', async (event, args, repos) => {
    const { period1Start, period1End, period2Start, period2End } = args;
    validators.requiredString(period1Start, 'Period 1 Start Date');
    validators.requiredString(period1End, 'Period 1 End Date');
    validators.requiredString(period2Start, 'Period 2 Start Date');
    validators.requiredString(period2End, 'Period 2 End Date');

    const [period1Sales, period2Sales] = await Promise.all([
      repos.sales.getSalesSummary(period1Start, period1End),
      repos.sales.getSalesSummary(period2Start, period2End),
    ]);

    const period1Total = period1Sales.totalSales || 0;
    const period2Total = period2Sales.totalSales || 0;
    const change = period2Total - period1Total;
    const changePercent = period1Total > 0 ? (change / period1Total) * 100 : 0;

    return {
      period1: {
        start: period1Start,
        end: period1End,
        summary: period1Sales,
      },
      period2: {
        start: period2Start,
        end: period2End,
        summary: period2Sales,
      },
      comparison: {
        change,
        change_percent: changePercent,
        trend: change >= 0 ? 'up' : 'down',
      },
    };
  });
}
