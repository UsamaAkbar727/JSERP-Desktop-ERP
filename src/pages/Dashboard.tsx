import { MainLayout } from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { StatsCard } from '@/components/ui/stats-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ShoppingCart,
  Receipt,
  TrendingUp,
  TrendingDown,
  Users,
  Truck,
  Plus,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboardSummary, useSales, usePurchases, useCustomersWithDues, useSuppliersWithPayables } from '@/hooks';

export default function Dashboard() {
  const { t } = useLanguage();
  
    
  // Fetch dashboard summary
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useDashboardSummary();
  
    
  // Fetch customers and suppliers with dues/payables
  const { data: customersWithDues = [] } = useCustomersWithDues();
  const { data: suppliersWithPayables = [] } = useSuppliersWithPayables();
  
    
  // Fetch recent sales and purchases for transactions list
  const { data: recentSales = [] } = useSales({ limit: 5, sortBy: 'sale_date', sortOrder: 'desc' });
  const { data: recentPurchases = [] } = usePurchases({ limit: 5, sortBy: 'purchase_date', sortOrder: 'desc' });

  
  const recentTransactions = [
    ...recentSales.map(s => ({
      id: s.id,
      type: 'sale' as const,
      description: `${t('sales')} - ${s.invoice_number}`,
      amount: s.total_amount,
      date: s.sale_date,
      status: s.payment_status,
    })),
    ...recentPurchases.map(p => ({
      id: p.id,
      type: 'purchase' as const,
      description: `${t('purchases')} - ${p.bill_number}`,
      amount: p.total_amount,
      date: p.purchase_date,
      status: p.payment_status,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  return (
    <MainLayout title={t('dashboard')}>
      <div className="space-y-4 md:space-y-6">
        {/* Welcome Message */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">{t('welcome')}, Admin!</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>

        {/* Error State */}
        {summaryError && (
          <Alert variant="destructive" className="border-destructive">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="ml-2">
              <div className="space-y-2">
                <p className="font-semibold">Failed to load dashboard data</p>
                <p className="text-sm">{summaryError.message}</p>
                {summaryError.message.includes('Electron') && (
                  <div className="mt-3 p-3 bg-destructive/10 rounded-md text-sm">
                    <p className="font-medium mb-1">⚠️ How to fix this:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Stop the current dev server (Ctrl+C)</li>
                      <li>Run: <code className="bg-black/20 px-2 py-1 rounded">npm run electron:dev</code></li>
                      <li>Wait for both Vite and Electron to start</li>
                    </ol>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <StatsCard
                title={t('todaySales')}
                value={summary?.sales.today || 0}
                icon={ShoppingCart}
                trend="up"
                trendValue={`This Month: ${summary?.sales.month || 0}`}
                iconClassName="bg-success/10 text-success"
              />
              <StatsCard
                title={t('todayPurchases')}
                value={summary?.purchases.today || 0}
                icon={Receipt}
                trendValue={`This Month: ${summary?.purchases.month || 0}`}
                iconClassName="bg-info/10 text-info"
              />
              <StatsCard
                title={t('receivables')}
                value={summary?.receivables || 0}
                icon={TrendingUp}
                iconClassName="bg-warning/10 text-warning"
              />
              <StatsCard
                title={t('payables')}
                value={summary?.payables || 0}
                icon={TrendingDown}
                iconClassName="bg-destructive/10 text-destructive"
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('quickActions')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 md:gap-3">
              <Link to="/sales/new" className="btn-quick-action">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Plus className="h-5 w-5 text-success" />
                </div>
                <span className="text-sm font-medium">{t('createSale')}</span>
              </Link>
              <Link to="/purchases/new" className="btn-quick-action">
                <div className="p-2 bg-info/10 rounded-lg">
                  <Plus className="h-5 w-5 text-info" />
                </div>
                <span className="text-sm font-medium">{t('createPurchase')}</span>
              </Link>
              <Link to="/customers/new" className="btn-quick-action">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium">{t('addCustomer')}</span>
              </Link>
              <Link to="/suppliers/new" className="btn-quick-action">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Truck className="h-5 w-5 text-accent" />
                </div>
                <span className="text-sm font-medium">{t('addSupplier')}</span>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t('recentTransactions')}</CardTitle>
              <Link to="/reports">
                <Button variant="ghost" size="sm" className="text-primary">
                  {t('view')} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div
                    key={`${tx.type}-${tx.id}`}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          tx.type === 'sale'
                            ? 'bg-success/10'
                            : 'bg-info/10'
                        }`}
                      >
                        {tx.type === 'sale' ? (
                          <ShoppingCart className="h-4 w-4 text-success" />
                        ) : (
                          <Receipt className="h-4 w-4 text-info" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{tx.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={tx.status as 'paid' | 'partial' | 'due'} />
                      <CurrencyDisplay
                        amount={tx.amount}
                        className="font-semibold"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customers & Suppliers with Dues */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Customers with Dues */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t('customers')} - {t('receivables')}
              </CardTitle>
              <Link to="/customers">
                <Button variant="ghost" size="sm" className="text-primary">
                  {t('view')} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {customersWithDues
                  .slice(0, 5)
                  .map((customer) => (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.phone}</p>
                      </div>
                      <CurrencyDisplay
                        amount={Math.max(0, customer.current_balance || 0)}
                        className="font-semibold text-warning"
                      />
                    </div>
                  ))}
                {customersWithDues.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('noDataFound')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Suppliers with Dues */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-5 w-5 text-accent" />
                {t('suppliers')} - {t('payables')}
              </CardTitle>
              <Link to="/suppliers">
                <Button variant="ghost" size="sm" className="text-primary">
                  {t('view')} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {suppliersWithPayables
                  .slice(0, 5)
                  .map((supplier) => (
                    <div
                      key={supplier.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{supplier.name}</p>
                        <p className="text-xs text-muted-foreground">{supplier.phone}</p>
                      </div>
                      <CurrencyDisplay
                        amount={Math.max(0, supplier.current_balance || 0)}
                        className="font-semibold text-destructive"
                      />
                    </div>
                  ))}
                {suppliersWithPayables.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('noDataFound')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
