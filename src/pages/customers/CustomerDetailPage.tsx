import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { StatusBadge } from '@/components/ui/status-badge';
import { StatsCard } from '@/components/ui/stats-card';
import { PaymentMethodSelector } from '@/components/forms/PaymentMethodSelector';
import { PaymentTypeSelector } from '@/components/forms/PaymentTypeSelector';
import { InvoiceItemsDropdown } from '@/components/ui/invoice-items-dropdown';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRangeFilter, DateRange } from '@/components/ui/date-range-filter';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Plus,
  Wallet,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Phone,
  Mail,
  MapPin,
  Edit,
} from 'lucide-react';

import { toast } from '@/hooks/use-toast';
import { PaymentMethod, PaymentType } from '@/types/erp';
import { useCustomer, useCustomerSales } from '@/hooks';
import { useCustomerPayments, useCreatePayment } from '@/hooks/usePayments';
import { useAccounts, useRefreshAccounts } from '@/hooks/useAccounts';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ type: 'alltime', fromDate: null, toDate: null });
  
  // Payment form state
  const [paymentType, setPaymentType] = useState<PaymentType>('full');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(''); // Now stores account ID
  const [selectedAccount, setSelectedAccount] = useState(''); // Deprecated but kept for backward compatibility
  const [chequeAccountId, setChequeAccountId] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Fetch customer data from database
  const { data: customer, isLoading: customerLoading, error: customerError } = useCustomer(id || '', !!id);
  const { data: accounts = [] } = useAccounts({ status: 'active' });
  
  // Fetch customer sales and payments - use string ID directly
  const { data: customerSales = [] } = useCustomerSales(customer?.id);
  const { data: customerPayments = [] } = useCustomerPayments(customer?.id || '');
  // Payment mutation
  const createPaymentMutation = useCreatePayment();
  const refreshAccounts = useRefreshAccounts();

  // Filter sales and payments by date range
  const filteredSales = customerSales.filter((sale) => {
    if (!dateRange.fromDate || !dateRange.toDate) return true;
    const saleDate = (sale.sale_date || '').split('T')[0];
    return saleDate >= dateRange.fromDate && saleDate <= dateRange.toDate;
  });

  const filteredPayments = customerPayments.filter((payment) => {
    if (!dateRange.fromDate || !dateRange.toDate) return true;
    const paymentDate = (payment.payment_date || '').split('T')[0];
    return paymentDate >= dateRange.fromDate && paymentDate <= dateRange.toDate;
  });

  const sortedFilteredSales = [...filteredSales].sort((a, b) => {
    const saleDateDiff = new Date(b.sale_date || b.created_at || 0).getTime() - new Date(a.sale_date || a.created_at || 0).getTime();
    if (saleDateDiff !== 0) return saleDateDiff;

    const createdAtDiff = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    if (createdAtDiff !== 0) return createdAtDiff;

    return String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true, sensitivity: 'base' });
  });

  const sortedFilteredPayments = [...filteredPayments].sort((a, b) => {
    const paymentDateDiff = new Date(b.payment_date || b.created_at || 0).getTime() - new Date(a.payment_date || a.created_at || 0).getTime();
    if (paymentDateDiff !== 0) return paymentDateDiff;

    const createdAtDiff = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    if (createdAtDiff !== 0) return createdAtDiff;

    return String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true, sensitivity: 'base' });
  });

  // Calculate totalDue dynamically from opening balance + sales - receipts
  // Use paid_amount from sale records (always up to date whether paid at creation, edit, or via payment)
  // customerPayments is only used for payment history display, not for total calculation
  const totalSales = customerSales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
  const totalReceived = customerSales.reduce((sum: number, s: any) => sum + (s.paid_amount || 0), 0);
  const totalDue = Math.max(0, (customer?.opening_balance || 0) + totalSales - totalReceived);

  // Set payment amount when dialog opens with full payment
  useEffect(() => {
    if (paymentDialogOpen && paymentType === 'full') {
      setPaymentAmount(totalDue > 0 ? totalDue.toString() : '0');
    }
  }, [paymentDialogOpen, paymentType, totalDue]);

  // Set default payment account when accounts load
  useEffect(() => {
    if (!paymentMethod && accounts.length > 0) {
      const firstAccount = accounts.find((a) => a.status === 'active');
      if (firstAccount) {
        setPaymentMethod(String(firstAccount.id));
        setSelectedAccount(String(firstAccount.id)); // Keep for backward compatibility
      }
    }
  }, [paymentMethod, accounts]);

  if (customerLoading) {
    return (
      <MainLayout title={t('customerDetails')}>
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Skeleton className="h-64 w-full" />
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (customerError || !customer) {
    return (
      <MainLayout title={t('customerDetails')}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('noDataFound')}</p>
          <Link to="/customers">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('back')}
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const resetPaymentForm = () => {
    setPaymentType('full');
    setPaymentAmount('');
    setPaymentMethod(''); // Will be set automatically by useEffect
    setSelectedAccount('');
    setChequeAccountId('');
    setChequeNumber('');
    setPaymentNotes('');
  };

  const handlePaymentTypeChange = (type: PaymentType) => {
    setPaymentType(type);
    if (type === 'full') {
      setPaymentAmount(totalDue > 0 ? totalDue.toString() : '0');
    } else {
      setPaymentAmount('0');
    }
  };

  const handlePayment = async () => {
    if (totalDue <= 0) {
      toast({
        title: 'Error',
        description: 'No due amount available',
        variant: 'destructive',
      });
      return;
    }

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    if (parseFloat(paymentAmount) > totalDue) {
      toast({
        title: 'Error',
        description: 'Payment amount cannot exceed due amount',
        variant: 'destructive',
      });
      return;
    }
    
    const selectedAccountDetails = accounts.find(acc => acc.id === paymentMethod);
    if (!paymentMethod || !selectedAccountDetails) {
      toast({
        title: 'Error',
        description: 'Please select an account',
        variant: 'destructive',
      });
      return;
    }

    if (selectedAccountDetails.account_type === 'cheque' && (!chequeNumber || !chequeAccountId)) {
      toast({
        title: 'Error',
        description: 'Please fill cheque details',
        variant: 'destructive',
      });
      return;
    }

    try {
      const selectedAccountObj = accounts.find(a => a.id === paymentMethod);
      const paymentData = {
        id: `PAY-${Date.now()}`,
        payment_type: 'receipt' as const,
        payment_date: new Date().toISOString().split('T')[0],
        customer_id: customer.id,
        account_id: paymentMethod,
        account_name: selectedAccountObj?.account_name || '',
        payment_method: selectedAccountObj?.account_type || 'cash',
        cheque_account_id: selectedAccountObj?.account_type === 'cheque' ? chequeAccountId : undefined,
        cheque_number: selectedAccountObj?.account_type === 'cheque' ? chequeNumber : undefined,
        amount: parseFloat(paymentAmount),
        notes: paymentNotes || undefined,
        is_full_payment: paymentType === 'full',
      };

     const payment= await createPaymentMutation.mutateAsync(paymentData);

      // Backend automatically updates account balance via PaymentsRepository
      // No manual balance update needed

      // Refresh accounts to show updated balances
      refreshAccounts();

      toast({
        title: t('paymentRecorded'),
        description: `Received PKR ${parseFloat(paymentAmount).toLocaleString()} from ${customer.name}`,
      });
      setPaymentDialogOpen(false);
      resetPaymentForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record payment',
        variant: 'destructive',
      });
    }
  };

  return (
    <MainLayout title={t('customerDetails')}>
      <div className="space-y-4 md:space-y-6">
        <PageHeader
          title={language === 'ur' && customer.name_urdu ? customer.name_urdu : customer.name}
        >
          <Link to="/customers">
            <Button variant="outline" size="sm" className="md:size-default">
              <ArrowLeft className="h-4 w-4 md:mr-2" />
              <span className="hidden sm:inline">{t('back')}</span>
            </Button>
          </Link>
        </PageHeader>

        {/* Customer Info + Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Customer Info Card */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm md:text-base">{t('customerDetails')}</CardTitle>
              
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {customer.phone}
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {customer.email}
                  </div>
                )}
                {(customer.address || customer.city) && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {[customer.address, customer.city].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('status')}</span>
                  <StatusBadge status={customer.status} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('openingBalance')}</span>
                  <CurrencyDisplay amount={customer.opening_balance || 0} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard
              title={t('totalSales')}
              value={totalSales}
              icon={ShoppingCart}
              iconClassName="bg-success/10 text-success"
            />
            <StatsCard
              title={t('totalReceived')}
              value={totalReceived}
              icon={TrendingDown}
              iconClassName="bg-info/10 text-info"
            />
            <StatsCard
              title={t('totalDue')}
              value={totalDue}
              icon={TrendingUp}
              iconClassName="bg-warning/10 text-warning"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={() => navigate(`/sales/new?customerId=${customer.id}`)}
            className="bg-success hover:bg-success/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('createSale')}
          </Button>

          <Dialog open={paymentDialogOpen} onOpenChange={(open) => {
            setPaymentDialogOpen(open);
            if (!open) resetPaymentForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                <Wallet className="h-4 w-4 mr-2" />
                {t('receivePayment')}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card max-w-md max-h-[90vh] overflow-y-auto my-6">
              <DialogHeader>
                <DialogTitle>{t('receivePayment')} - {customer.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Payment Type Selector (Full/Partial) */}
                <PaymentTypeSelector
                  paymentType={paymentType}
                  onPaymentTypeChange={handlePaymentTypeChange}
                  totalDue={totalDue}
                  amount={paymentAmount}
                  onAmountChange={setPaymentAmount}
                />

                {/* Payment Method Selector */}
                <PaymentMethodSelector
                  paymentMethod={paymentMethod}
                  onPaymentMethodChange={(accountId) => {
                    setPaymentMethod(accountId);
                    setSelectedAccount(accountId); // Keep for backward compatibility
                  }}
                  selectedAccount={selectedAccount}
                  onAccountChange={setSelectedAccount}
                  chequeAccountId={chequeAccountId}
                  onChequeAccountChange={setChequeAccountId}
                  chequeNumber={chequeNumber}
                  onChequeNumberChange={setChequeNumber}
                  showCreditOption={false}
                />

                <div className="space-y-2">
                  <Label htmlFor="notes">{t('notes')}</Label>
                  <Textarea
                    id="notes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Optional notes..."
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} className="flex-1">
                    {t('cancel')}
                  </Button>
                  <Button onClick={handlePayment} className="flex-1">
                    {t('save')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Date Range Filter */}
        <div className="w-full">
          <DateRangeFilter 
            onDateChange={setDateRange}
            defaultRange="alltime"
            className="w-full"
          />
        </div>

        {/* Recent Invoices & Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Invoices */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Total Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-table-header hover:bg-table-header">
                    <TableHead>{t('invoiceNumber')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead className="text-right">{t('total')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFilteredSales.length > 0 ? (
                    sortedFilteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">
                          <Link to={`/sales/${sale.id}`} className="text-primary hover:underline">
                            {sale.invoice_number}
                          </Link>
                        </TableCell>
                        <TableCell>{new Date(sale.sale_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <CurrencyDisplay amount={sale.total_amount} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={sale.payment_status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/sales/edit/${sale.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            {t('edit')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        {t('noDataFound')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Total Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-table-header hover:bg-table-header">
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('accountName')}</TableHead>
                    <TableHead className="text-right">{t('amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFilteredPayments.length > 0 ? (
                    sortedFilteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell>{payment.account_name}</TableCell>
                        <TableCell className="text-right">
                          <CurrencyDisplay amount={payment.amount} className="text-success" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        {t('noDataFound')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
