import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/page-header';
import { DateRangeFilter, DateRange } from '@/components/ui/date-range-filter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  ShoppingCart,
  Receipt,
  Users,
  Truck,
  TrendingUp,
  TrendingDown,
  Package,
  Filter,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useDashboardSummary,
  useProfitLossReport,
  useProductWiseReport,
  useCustomerDuesReport,
  useSupplierPayablesReport,
} from '@/hooks/useReports';
import { useCustomers } from '@/hooks/useCustomers';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useItems } from '@/hooks/useItems';

export default function ReportsPage() {
  const { t } = useLanguage();
  
  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>({ type: 'alltime', fromDate: null, toDate: null });
  const [selectedProduct, setSelectedProduct] = useState('all');

  // Extract applied date range for display
  const appliedDateFrom = dateRange.fromDate;
  const appliedDateTo = dateRange.toDate;

  // Use backend hooks for computed reports
  // React Query automatically refetches when dates change (queryKey includes dates)
  
  const dashboardSummaryQuery = useDashboardSummary();
  const profitLossQuery = useProfitLossReport(
    dateRange.fromDate || undefined,
    dateRange.toDate || undefined
  );
  const productWiseQuery = useProductWiseReport(
    dateRange.fromDate || undefined,
    dateRange.toDate || undefined
  );
  const customerDuesQuery = useCustomerDuesReport();
  const supplierPayablesQuery = useSupplierPayablesReport();

  // Manual refresh function
  const handleRefreshData = async () => {
    await Promise.all([
      dashboardSummaryQuery.refetch(),
      profitLossQuery.refetch(),
      productWiseQuery.refetch(),
      customerDuesQuery.refetch(),
      supplierPayablesQuery.refetch(),
    ]);
  };

  // Get items for the product selector
  const itemsQuery = useItems();
  const items = useMemo(() => itemsQuery.data || [], [itemsQuery.data]);
  
 
  // Extract totals from dashboard summary
  const dashboardData = dashboardSummaryQuery.data;
  const totalSales = dashboardData?.sales?.month || 0;
  const totalPurchases = dashboardData?.purchases?.month || 0;
  const totalReceivables = dashboardData?.receivables || 0;
  const totalPayables = dashboardData?.payables || 0;
  


  // Get P&L data from backend
  const plData = profitLossQuery.data || {
    revenue: totalSales,
    cost_of_goods: totalPurchases,
    gross_profit: totalSales - totalPurchases,
    expenses: dashboardData?.expenses?.month || 0,
    net_profit: (totalSales - totalPurchases) - (dashboardData?.expenses?.month || 0),
  };
  const grossProfit = plData.gross_profit || 0;
  const netProfit = plData.net_profit || 0;
  const cogs = plData.cost_of_goods || 0;
  // Product-wise report data - fetch from backend
  const productWiseData = useMemo(() => 
    Array.isArray(productWiseQuery.data) ? productWiseQuery.data : [], 
    [productWiseQuery.data]
  );
  const productReport = useMemo(() => {
    let filtered = productWiseData;
    if (selectedProduct !== 'all') {
      filtered = productWiseData.filter(item => String(item.item_id) === selectedProduct);
    }
    return filtered;
  }, [productWiseData, selectedProduct]);

  // Customer dues data - from backend report
  const customerDuesResponse = customerDuesQuery.data as any;
  const customerDuesData = useMemo(() => 
    Array.isArray(customerDuesResponse) 
      ? customerDuesResponse 
      : (customerDuesResponse?.customers || []),
    [customerDuesResponse]
  );
  const customersWithDues = useMemo(() => {
    return customerDuesData
      .map((cd: any) => ({
        customer_id: cd.customer_id || cd.id,
        customer_name: cd.customer_name || cd.name,
        total_due: Math.max(0, cd.total_due || cd.current_balance || 0),
      }))
      .slice(0, 5);
  }, [customerDuesData]);

  // Supplier payables data - from backend report  
  const supplierPayablesResponse = supplierPayablesQuery.data as any;
  const supplierPayablesData = useMemo(() =>
    Array.isArray(supplierPayablesResponse)
      ? supplierPayablesResponse
      : (supplierPayablesResponse?.suppliers || []),
    [supplierPayablesResponse]
  );
  const suppliersWithPayables = useMemo(() => {
    return supplierPayablesData
      .map((sp: any) => ({
        supplier_id: sp.supplier_id || sp.id,
        supplier_name: sp.supplier_name || sp.name,
        total_payable: Math.max(0, sp.total_payable || sp.current_balance || 0),
      }))
      .slice(0, 5);
  }, [supplierPayablesData]);

  // Summary cards data
  const reportCards = [
    {
      title: t('sales'),
      value: totalSales,
      icon: ShoppingCart,
      color: 'bg-success/10 text-success',
      link: '/sales',
    },
    {
      title: t('purchases'),
      value: totalPurchases,
      icon: Receipt,
      color: 'bg-info/10 text-info',
      link: '/purchases',
    },
    {
      title: t('receivables'),
      value: totalReceivables,
      icon: TrendingUp,
      color: 'bg-warning/10 text-warning',
      link: '/customers',
    },
    {
      title: t('payables'),
      value: totalPayables,
      icon: TrendingDown,
      color: 'bg-destructive/10 text-destructive',
      link: '/suppliers',
    },
  ];
  return (
    <MainLayout title={t('reports')}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title={t('reports')}
            description="Financial and operational reports"
          />
          <Button
            onClick={handleRefreshData}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            disabled={dashboardSummaryQuery.isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${dashboardSummaryQuery.isFetching ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportCards &&
          reportCards.map((card) => (
            <Link key={card.title} to={card.link}>
              <Card className="card-stats hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <CurrencyDisplay amount={card.value} className="text-2xl font-bold" />
                  </div>
                  <div className={`p-3 rounded-lg ${card.color}`}>
                    <card.icon className="h-6 w-6" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Tabs for different reports */}
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="bg-muted">
            <TabsTrigger value="summary">{t('profitLoss')}</TabsTrigger>
            <TabsTrigger value="products">{t('productReport')}</TabsTrigger>
            <TabsTrigger value="dues">Dues Report</TabsTrigger>
          </TabsList>

          {/* Profit & Loss Tab */}
          <TabsContent value="summary" className="space-y-4">
            {/* Date Filter */}
            <DateRangeFilter 
              onDateChange={setDateRange}
              defaultRange="alltime"
            />

            {/* Profit & Loss Statement */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {t('profitLoss')} Statement
                    {profitLossQuery.isFetching && (
                      <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </CardTitle>
                  {(dateRange.fromDate || dateRange.toDate) && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {dateRange.fromDate && dateRange.toDate 
                        ? `${dateRange.fromDate} to ${dateRange.toDate}`
                        : dateRange.fromDate 
                        ? `From ${dateRange.fromDate}`
                        : `Until ${dateRange.toDate}`
                      }
                    </span>
                  )}
                  {!dateRange.fromDate && !dateRange.toDate && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      All Time
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Revenue Section */}
                  <div className="p-4 bg-success/5 rounded-lg border border-success/20">
                    <h4 className="font-semibold text-success mb-3">{t('revenue')}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('totalSales')}</span>
                        <CurrencyDisplay amount={plData.revenue || 0} className="font-semibold" />
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-success/20 flex justify-between font-bold">
                      <span>Total {t('revenue')}</span>
                      <CurrencyDisplay amount={plData.revenue || 0} className="text-success" />
                    </div>
                  </div>

                  {/* Cost of Goods Sold */}
                  <div className="p-4 bg-info/5 rounded-lg border border-info/20">
                    <h4 className="font-semibold text-info mb-3">{t('cost')} of Goods Sold</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cost of items sold</span>
                        <CurrencyDisplay amount={cogs} className="font-semibold" />
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-info/20 flex justify-between font-bold">
                      <span>{t('grossProfit')}</span>
                      <CurrencyDisplay 
                        amount={grossProfit} 
                        className={grossProfit >= 0 ? 'text-success' : 'text-destructive'} 
                      />
                    </div>
                  </div>

                  {/* Expenses */}
                  <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                    <h4 className="font-semibold text-destructive mb-3">{t('expenses')}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Expenses</span>
                        <CurrencyDisplay amount={plData.expenses || 0} className="font-semibold" />
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-destructive/20 flex justify-between font-bold">
                      <span>{t('totalExpenses')}</span>
                      <CurrencyDisplay amount={plData.expenses || 0} className="text-destructive" />
                    </div>
                  </div>

                  {/* Net Profit */}
                  <div className={`p-4 rounded-lg border ${netProfit >= 0 ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">{t('netProfit')}</span>
                      <CurrencyDisplay 
                        amount={netProfit} 
                        className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`} 
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product Report Tab */}
          <TabsContent value="products" className="space-y-4">
            {/* Date Filter */}
            <DateRangeFilter 
              onDateChange={setDateRange}
              defaultRange="alltime"
            />

            {/* Product Filter */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {t('productReport')}
                  {(productWiseQuery.isFetching || itemsQuery.isFetching) && (
                    <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Product Selector */}
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-2">
                      <Label>{t('items')}</Label>
                      <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                        <SelectTrigger className="w-64 bg-background">
                          <SelectValue placeholder={t('all')} />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border z-50">
                          <SelectItem value="all">{t('all')} Products</SelectItem>
                          {items &&
                          items.map(item => (
                            <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                {(productWiseQuery.isFetching || itemsQuery.isFetching) && (
                  <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Updating report data...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Product Report Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t('productReport')} Summary</CardTitle>
                  {(appliedDateFrom || appliedDateTo) && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {appliedDateFrom && appliedDateTo 
                        ? `${appliedDateFrom} to ${appliedDateTo}`
                        : appliedDateFrom 
                        ? `From ${appliedDateFrom}`
                        : `Until ${appliedDateTo}`
                      }
                    </span>
                  )}
                  {!appliedDateFrom && !appliedDateTo && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      All Time
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-table-header hover:bg-table-header">
                      <TableHead>{t('itemName')}</TableHead>
                      <TableHead className="text-right">{t('soldQty')}</TableHead>
                      <TableHead className="text-right">{t('purchasedQty')}</TableHead>
                      <TableHead className="text-right">{t('currentStock')}</TableHead>
                      <TableHead className="text-right">{t('revenue')}</TableHead>
                      <TableHead className="text-right">{t('cost')}</TableHead>
                      <TableHead className="text-right">{t('profit')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productReport.length > 0 ? (
                      <>
                        {productReport.map((item) => (
                          <TableRow key={item.item_id}>
                            <TableCell className="font-medium">{item.item_name}</TableCell>
                            <TableCell className="text-right">{item.quantity_sold || 0}</TableCell>
                            <TableCell className="text-right">{item.quantity_purchased || 0}</TableCell>
                            <TableCell className="text-right">{item.current_stock || 0}</TableCell>
                            <TableCell className="text-right">
                              <CurrencyDisplay amount={item.total_revenue || 0} className="text-success" />
                            </TableCell>
                            <TableCell className="text-right">
                              <CurrencyDisplay amount={item.cost || 0} />
                            </TableCell>
                            <TableCell className="text-right">
                              <CurrencyDisplay 
                                amount={item.profit || 0} 
                                className={`${(item.profit || 0) >= 0 ? 'text-success' : 'text-destructive'} font-semibold`} 
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Totals Row */}
                        <TableRow className="bg-muted font-bold border-t-2 border-primary">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right">
                            {productReport.reduce((s, i) => s + (i.quantity_sold || 0), 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {productReport.reduce((s, i) => s + (i.quantity_purchased || 0), 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {productReport.reduce((s, i) => s + (i.current_stock || 0), 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <CurrencyDisplay 
                              amount={productReport.reduce((s, i) => s + (i.total_revenue || 0), 0)} 
                              className="text-success" 
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <CurrencyDisplay amount={productReport.reduce((s, i) => s + (i.cost || 0), 0)} />
                          </TableCell>
                          <TableCell className="text-right">
                            <CurrencyDisplay 
                              amount={productReport.reduce((s, i) => s + (i.profit || 0), 0)} 
                              className={productReport.reduce((s, i) => s + (i.profit || 0), 0) >= 0 ? 'text-success' : 'text-destructive'} 
                            />
                          </TableCell>
                        </TableRow>
                      </>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {productWiseQuery.isLoading && 'Loading product report...'}
                          {productWiseQuery.isError && `Error: ${productWiseQuery.error?.message || 'Failed to load data'}`}
                          {!productWiseQuery.isLoading && !productWiseQuery.isError && t('noDataFound')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dues Report Tab */}
          <TabsContent value="dues" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Customers by Dues */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-5 w-5 text-warning" />
                    Top {t('customers')} - {t('receivables')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-table-header hover:bg-table-header">
                        <TableHead>{t('customerName')}</TableHead>
                        <TableHead className="text-right">{t('totalDue')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customersWithDues &&
                      customersWithDues.length > 0 ? (
                        customersWithDues.map((customer) => (
                          <TableRow key={customer.customer_id}>
                            <TableCell>
                              <Link
                                to={`/customers/${customer.customer_id}`}
                                className="text-primary hover:underline font-medium"
                              >
                                {customer.customer_name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-right">
                              <CurrencyDisplay
                                amount={Math.max(0, customer.total_due || 0)}
                                className="font-semibold text-warning"
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground">
                            {t('noDataFound')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <div className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/20">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total {t('receivables')}</span>
                      <CurrencyDisplay 
                        amount={customerDuesData.reduce((sum, cd: any) => sum + Math.max(0, cd.total_due || cd.current_balance || cd.due_amount || 0), 0)} 
                        className="font-bold text-warning" 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Suppliers by Dues */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="h-5 w-5 text-destructive" />
                    Top {t('suppliers')} - {t('payables')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-table-header hover:bg-table-header">
                        <TableHead>{t('supplierName')}</TableHead>
                        <TableHead className="text-right">{t('totalPayable')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliersWithPayables &&
                      suppliersWithPayables.length > 0 ? (
                        suppliersWithPayables.map((supplier) => (
                          <TableRow key={supplier.supplier_id}>
                            <TableCell>
                              <Link
                                to={`/suppliers/${supplier.supplier_id}`}
                                className="text-primary hover:underline font-medium"
                              >
                                {supplier.supplier_name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-right">
                              <CurrencyDisplay
                                amount={Math.max(0, supplier.total_payable || 0)}
                                className="font-semibold text-destructive"
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground">
                            {t('noDataFound')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total {t('payables')}</span>
                      <CurrencyDisplay 
                        amount={supplierPayablesData.reduce((sum, sp: any) => sum + Math.max(0, sp.total_payable || sp.current_balance || sp.due_amount || 0), 0)} 
                        className="font-bold text-destructive" 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
