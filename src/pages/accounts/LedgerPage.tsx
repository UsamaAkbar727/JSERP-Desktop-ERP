import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { StatsCard } from '@/components/ui/stats-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccount, useAccountLedger } from '@/hooks';
import type { Transaction } from '@/types/api';

export default function LedgerPage() {
  const { id } = useParams();
  const { t } = useLanguage();

  // Date filter states - default to last 7 days
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });
  const [appliedDateFrom, setAppliedDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [appliedDateTo, setAppliedDateTo] = useState(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });
  const [isApplying, setIsApplying] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('7'); // Track active filter
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Get today's date for max date restriction
  const today = useMemo(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  }, []);

  // Function to get current filter type
  const getCurrentFilter = () => {
    const todayStr = today;
    if (!appliedDateFrom && !appliedDateTo) {
      return 'all';
    }
    if (appliedDateFrom === todayStr && appliedDateTo === todayStr) {
      return 'today';
    }
    
    const fromDate = new Date(appliedDateFrom);
    const toDate = new Date(appliedDateTo);
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 6) return '7'; // 7 days (including today)
    if (daysDiff === 29) return '30'; // 30 days
    if (daysDiff >= 89 && daysDiff <= 91) return '90'; // 3 months (approx)
    
    return 'custom';
  };

  // Get filter display name
  const getFilterDisplayName = () => {
    const current = getCurrentFilter();
    switch (current) {
      case 'today': return 'Today';
      case '7': return 'Last 7 Days';
      case '30': return 'Last 30 Days';
      case '90': return 'Last 3 Months';
      case 'all': return 'All Time';
      case 'custom': return `${appliedDateFrom} to ${appliedDateTo}`;
      default: return 'Custom Range';
    }
  };

  // Filter handler functions
  const handleApplyFilter = () => {
    setIsApplying(true);
    
    // Apply filter - React Query will auto-refetch when queryKey changes
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
    setActiveFilter('custom');
    
    // Visual feedback
    setTimeout(() => {
      setIsApplying(false);
    }, 300);
  };

  const handleClearFilter = () => {
    setDateFrom('');
    setDateTo('');
    setAppliedDateFrom('');
    setAppliedDateTo('');
    setActiveFilter('all');
  };

  const handleQuickFilter = (days: number | 'today' | 'all') => {
    const todayDate = new Date();
    const todayStr = todayDate.toISOString().split('T')[0];
    
    if (days === 'today') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
      setAppliedDateFrom(todayStr);
      setAppliedDateTo(todayStr);
      setActiveFilter('today');
    } else if (days === 'all') {
      setDateFrom('');
      setDateTo('');
      setAppliedDateFrom('');
      setAppliedDateTo('');
      setActiveFilter('all');
    } else {
      const fromDate = new Date();
      fromDate.setDate(todayDate.getDate() - days);
      const fromStr = fromDate.toISOString().split('T')[0];
      
      setDateFrom(fromStr);
      setDateTo(todayStr);
      setAppliedDateFrom(fromStr);
      setAppliedDateTo(todayStr);
      setActiveFilter(days.toString());
    }
  };


  // Fetch account data and transactions from database
  const { data: account, isLoading: accountLoading } = useAccount(id || '', !!id);
  const { data: transactions = [], isLoading: transactionsLoading } = useAccountLedger(
    id || '', 
    appliedDateFrom || undefined,
    appliedDateTo || undefined
  );
  if (accountLoading || transactionsLoading) {
    return (
      <MainLayout title={t('ledger')}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  if (!account) {
    return (
      <MainLayout title={t('ledger')}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('noDataFound')}</p>
          <Link to="/accounts">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('back')}
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  // Convert transactions to proper format for display
  const accountTransactions = transactions.map((t: Transaction) => ({
    id: t.id,
    transactionDate: t.transaction_date,
    referenceType: t.reference_type || 'transaction',
    referenceId: t.reference_id,
    accountId: t.account_id,
    direction: t.direction,
    amount: t.amount,
    description: t.description || 'Transaction',
  })).sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  const totalIn = accountTransactions
    .filter((t) => t.direction === 'in')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalOut = accountTransactions
    .filter((t) => t.direction === 'out')
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate running balance
  let runningBalance = account.opening_balance;
  const transactionsWithBalance = [...accountTransactions]
    .sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()) // oldest first for running balance
    .map((tx) => {
      if (tx.direction === 'in') {
        runningBalance += tx.amount;
      } else {
        runningBalance -= tx.amount;
      }
      return { ...tx, balanceAfter: runningBalance };
    })
    .reverse(); // newest first for display

  return (
    <MainLayout title={`${t('ledger')} - ${account.account_name}`}>
      <div className="space-y-6">
        <PageHeader title={`${account.account_name} Ledger`}>
          <Link to="/accounts">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('back')}
            </Button>
          </Link>
        </PageHeader>

        {/* Account Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            title={t('openingBalance')}
            value={account.opening_balance}
            icon={Wallet}
            iconClassName="bg-primary/10 text-primary"
          />
          <StatsCard
            title="Total In"
            value={totalIn}
            icon={TrendingUp}
            iconClassName="bg-success/10 text-success"
          />
          <StatsCard
            title="Total Out"
            value={totalOut}
            icon={TrendingDown}
            iconClassName="bg-destructive/10 text-destructive"
          />
          <StatsCard
            title={t('currentBalance')}
            value={account.current_balance}
            icon={Wallet}
            iconClassName="bg-primary/10 text-primary"
          />
        </div>

        {/* Date Filter */}
        <Card>
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setIsFilterExpanded((prev) => !prev)}
          >
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                {t('dateRange')}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-normal text-muted-foreground">
                  Active: <span className="font-medium text-primary">{getFilterDisplayName()}</span>
                </span>
                {isFilterExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardTitle>
          </CardHeader>
          {isFilterExpanded && <CardContent>
            <div className="space-y-4">
              {/* Quick Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={getCurrentFilter() === 'today' ? 'default' : 'outline'}
                  onClick={() => handleQuickFilter('today')}
                  className={cn(
                    "text-xs",
                    getCurrentFilter() === 'today' && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Today
                </Button>
                <Button
                  size="sm"
                  variant={getCurrentFilter() === '7' ? 'default' : 'outline'}
                  onClick={() => handleQuickFilter(7)}
                  className={cn(
                    "text-xs",
                    getCurrentFilter() === '7' && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  Last 7 Days
                </Button>
                <Button
                  size="sm"
                  variant={getCurrentFilter() === '30' ? 'default' : 'outline'}
                  onClick={() => handleQuickFilter(30)}
                  className={cn(
                    "text-xs",
                    getCurrentFilter() === '30' && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  Last 30 Days
                </Button>
                <Button
                  size="sm"
                  variant={getCurrentFilter() === '90' ? 'default' : 'outline'}
                  onClick={() => handleQuickFilter(90)}
                  className={cn(
                    "text-xs",
                    getCurrentFilter() === '90' && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  Last 3 Months
                </Button>
                <Button
                  size="sm"
                  variant={getCurrentFilter() === 'all' ? 'default' : 'outline'}
                  onClick={() => handleQuickFilter('all')}
                  className={cn(
                    "text-xs",
                    getCurrentFilter() === 'all' && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  All Time
                </Button>
              </div>
              
              {/* Custom Date Range */}
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label>{t('fromDate')}</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    max={today}
                    onChange={(e) => setDateFrom(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                    className="w-40"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('toDate')}</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    max={today}
                    onChange={(e) => setDateTo(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                    className="w-40"
                  />
                </div>
                <Button 
                  onClick={handleApplyFilter}
                  disabled={isApplying}
                  className={isApplying ? 'opacity-70 scale-95 transition-all' : ''}
                >
                  {isApplying ? '⏳ Applying...' : t('applyFilter')}
                </Button>
                <Button variant="outline" onClick={handleClearFilter}>
                  {t('clearFilter')}
                </Button>
              </div>
            </div>
          </CardContent>}
        </Card>

        {/* Account Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Account Type</p>
                <p className="font-medium capitalize">{account.account_type.replace('_', ' ')}</p>
              </div>
              {account.account_number && (
                <div>
                  <p className="text-muted-foreground">Account Number</p>
                  <p className="font-mono font-medium">{account.account_number}</p>
                </div>
              )}
              {account.bank_name && (
                <div>
                  <p className="text-muted-foreground">Bank Name</p>
                  <p className="font-medium">{account.bank_name}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium capitalize text-success">{account.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ledger Entries */}
        <Card className="table-container">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-table-header hover:bg-table-header">
                <TableHead>{t('date')}</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>{t('description')}</TableHead>
                <TableHead className="text-right">In</TableHead>
                <TableHead className="text-right">Out</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Opening Balance Row */}
              <TableRow className="bg-primary/5">
                <TableCell>-</TableCell>
                <TableCell>
                  <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs font-medium">
                    Opening
                  </span>
                </TableCell>
                <TableCell className="font-medium">Opening Balance</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right">
                  <CurrencyDisplay amount={account.opening_balance} className="font-semibold" />
                </TableCell>
              </TableRow>

              {transactionsWithBalance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {transactionsLoading ? 'Loading transactions...' : 'No transactions found'}
                  </TableCell>
                </TableRow>
              ) : (
                transactionsWithBalance.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-table-row-hover">
                    <TableCell>{tx.transactionDate}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                          tx.direction === 'in'
                            ? 'bg-success/15 text-success'
                            : 'bg-destructive/15 text-destructive'
                        )}
                      >
                        {tx.direction === 'in' ? (
                          <ArrowDownRight className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        {tx.referenceType.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell className="text-right">
                      {tx.direction === 'in' && (
                        <CurrencyDisplay amount={tx.amount} className="text-success font-medium" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {tx.direction === 'out' && (
                        <CurrencyDisplay amount={tx.amount} className="text-destructive font-medium" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={tx.balanceAfter} className="font-semibold" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </MainLayout>
  );
}
