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
  Receipt,
  TrendingUp,
  TrendingDown,
  Phone,
  Mail,
  MapPin,
  Edit,
} from 'lucide-react';

import { toast } from '@/hooks/use-toast';
import { PaymentMethod, PaymentType } from '@/types/erp';
import { useSupplier, useSupplierPurchases } from '@/hooks';
import { useSupplierPaymentsList, useCreatePayment } from '@/hooks/usePayments';
import { useAccounts, useRefreshAccounts } from '@/hooks/useAccounts';

export default function SupplierDetailPage() {
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

  // Fetch supplier data from database
  const { data: supplier, isLoading: supplierLoading, error: supplierError, refetch: refetchSupplier } = useSupplier(id || '', !!id);
  const { data: accounts = [] } = useAccounts({ status: 'active' });
  // Fetch supplier purchases and payments using string ID
  const supplierId = supplier?.id || '';
  const { data: supplierPurchases = [], refetch: refetchPurchases } = useSupplierPurchases(supplierId);
  const { data: supplierPayments = [], refetch: refetchPayments } = useSupplierPaymentsList(supplierId);
  
  
  
  // Payment mutation
  const createPaymentMutation = useCreatePayment();
  const refreshAccounts = useRefreshAccounts();

  // Filter purchases and payments by date range
  const filteredPurchases = supplierPurchases.filter((purchase) => {
    if (!dateRange.fromDate || !dateRange.toDate) return true;
    const purchaseDate = (purchase.purchase_date || '').split('T')[0];
    return purchaseDate >= dateRange.fromDate && purchaseDate <= dateRange.toDate;
  });

  const filteredPayments = supplierPayments.filter((payment) => {
    if (!dateRange.fromDate || !dateRange.toDate) return true;
    const paymentDate = (payment.payment_date || '').split('T')[0];
    return paymentDate >= dateRange.fromDate && paymentDate <= dateRange.toDate;
  });

  const sortedFilteredPurchases = [...filteredPurchases].sort((a, b) => {
    const purchaseDateDiff = new Date(b.purchase_date || b.created_at || 0).getTime() - new Date(a.purchase_date || a.created_at || 0).getTime();
    if (purchaseDateDiff !== 0) return purchaseDateDiff;

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

  // Calculate totalPayable dynamically from sum of due amounts in purchases
  // This ensures UI shows correct amount based on actual purchase payment statuses
  const totalPurchases = supplierPurchases.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0);
  const totalDueFromPurchases = supplierPurchases.reduce((sum: number, p: any) => sum + (p.due_amount || 0), 0);
  const totalPaid = supplierPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  
  // Total payable = opening balance + due amounts from all purchases
  // Note: We use totalDueFromPurchases instead of (totalPurchases - totalPaid) 
  // because payments are allocated to purchases and reflected in their due_amount
  const totalPayable = Math.max(0, (supplier?.opening_balance || 0) + totalDueFromPurchases);
  
  

  // Set payment amount when dialog opens with full payment
  useEffect(() => {
    if (paymentDialogOpen && paymentType === 'full') {
      setPaymentAmount(totalPayable > 0 ? totalPayable.toString() : '0');
    }
  }, [paymentDialogOpen, paymentType, totalPayable]);

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

  if (supplierLoading) {
    return (
      <MainLayout title={t('supplierDetails')}>
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

  if (supplierError || !supplier) {
    return (
      <MainLayout title={t('supplierDetails')}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('noDataFound')}</p>
          <Link to="/suppliers">
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
      setPaymentAmount(totalPayable > 0 ? totalPayable.toString() : '0');
    } else {
      setPaymentAmount('0');
    }
  };

  const handlePayment = async () => {
    if (totalPayable <= 0) {
      toast({
        title: 'Error',
        description: 'No payable amount available',
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

    if (parseFloat(paymentAmount) > totalPayable) {
      toast({
        title: 'Error',
        description: 'Payment amount cannot exceed payable amount',
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

    // Check if account has sufficient balance
    const accountToCheck = selectedAccountDetails.account_type === 'cheque' ? chequeAccountId : paymentMethod;
    const accountObjToCheck = accounts.find(a => a.id === accountToCheck);
    
    if (accountObjToCheck && accountObjToCheck.current_balance < parseFloat(paymentAmount)) {
      toast({
        title: 'Insufficient Balance',
        description: `Account ${accountObjToCheck.account_name} has insufficient balance. Available: PKR ${accountObjToCheck.current_balance.toLocaleString()}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const paymentData = {
        id: `PAY-${Date.now()}`,
        payment_type: 'payment' as const,
        payment_date: new Date().toISOString().split('T')[0],
        supplier_id: supplier.id,
        account_id: accountToCheck,
        account_name: accountObjToCheck?.account_name || '',
        payment_method: selectedAccountDetails?.account_type || 'cash',
        cheque_account_id: selectedAccountDetails.account_type === 'cheque' ? chequeAccountId : undefined,
        cheque_number: selectedAccountDetails.account_type === 'cheque' ? chequeNumber : undefined,
        amount: parseFloat(paymentAmount),
        notes: paymentNotes || undefined,
        is_full_payment: paymentType === 'full',
      };

     const payment= await createPaymentMutation.mutateAsync(paymentData);

      // Backend automatically updates account balance via PaymentsRepository
      // No manual balance update needed

      // Refresh data to show updated balances and payables
      refreshAccounts();
      await refetchPurchases(); // This will update totalDueFromPurchases
      await refetchPayments(); // This will update payment history
      await refetchSupplier(); // This will update supplier data

      toast({
        title: t('paymentRecorded'),
        description: `Paid PKR ${parseFloat(paymentAmount).toLocaleString()} to ${supplier.name}`,
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
    <MainLayout title={t('supplierDetails')}>
      <div className="space-y-4 md:space-y-6">
        <PageHeader
          title={language === 'ur' && supplier.name_urdu ? supplier.name_urdu : supplier.name}
        >
          <Link to="/suppliers">
            <Button variant="outline" size="sm" className="md:size-default">
              <ArrowLeft className="h-4 w-4 md:mr-2" />
              <span className="hidden sm:inline">{t('back')}</span>
            </Button>
          </Link>
        </PageHeader>

        {/* Supplier Info + Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Supplier Info Card */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm md:text-base">{t('supplierDetails')}</CardTitle>
              {/* <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8">
                <Edit className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button> */}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {supplier.phone}
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {supplier.email}
                  </div>
                )}
                {(supplier.address || supplier.city) && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {[supplier.address, supplier.city].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('status')}</span>
                  <StatusBadge status={supplier.status} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('openingBalance')}</span>
                  <CurrencyDisplay amount={supplier.opening_balance || 0} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard
              title={t('totalPurchases')}
              value={totalPurchases}
              icon={Receipt}
              iconClassName="bg-info/10 text-info"
            />
            <StatsCard
              title={t('totalPaid')}
              value={totalPaid}
              icon={TrendingDown}
              iconClassName="bg-success/10 text-success"
            />
            <StatsCard
              title={t('totalPayable')}
              value={totalPayable}
              icon={TrendingUp}
              iconClassName="bg-destructive/10 text-destructive"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button className="bg-info hover:bg-info/90" onClick={() => navigate(`/purchases/new?supplierId=${supplier.id}`)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('createPurchase')}
          </Button>

          <Dialog open={paymentDialogOpen} onOpenChange={(open) => {
            setPaymentDialogOpen(open);
            if (!open) resetPaymentForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                <Wallet className="h-4 w-4 mr-2" />
                {t('makePayment')}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card max-w-md max-h-[90vh] overflow-y-auto my-6">
              <DialogHeader>
                <DialogTitle>{t('makePayment')} - {supplier.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Payment Type Selector (Full/Partial) */}
                <PaymentTypeSelector
                  paymentType={paymentType}
                  onPaymentTypeChange={handlePaymentTypeChange}
                  totalDue={totalPayable}
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
                  label="Pay From"
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
                  <Button onClick={handlePayment} className="flex-1 bg-destructive hover:bg-destructive/90">
                    {t('makePayment')}
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

        {/* Recent Purchases & Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Purchases */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('totalPurchases')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-table-header hover:bg-table-header">
                    <TableHead>{t('billNumber')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead className="text-right">{t('total')}</TableHead>
                    <TableHead className="text-right">{t('paid')}</TableHead>
                    <TableHead className="text-right">{t('due')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFilteredPurchases.length > 0 ? (
                    sortedFilteredPurchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-medium">
                          <Link to={`/purchases/${purchase.id}`} className="text-primary hover:underline">
                            {purchase.bill_number}
                          </Link>
                        </TableCell>
                        <TableCell>{new Date(purchase.purchase_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <CurrencyDisplay amount={purchase.total_amount} />
                        </TableCell>
                        <TableCell className="text-right">
                          <CurrencyDisplay amount={purchase.paid_amount || 0} className="text-success" />
                        </TableCell>
                        <TableCell className="text-right">
                          <CurrencyDisplay amount={purchase.due_amount || 0} className="text-destructive font-semibold" />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={purchase.payment_status} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
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
                          <CurrencyDisplay amount={payment.amount} className="text-destructive" />
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
