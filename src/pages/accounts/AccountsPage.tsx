import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/page-header';
import { DateRangeFilter, DateRange } from '@/components/ui/date-range-filter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Wallet,
  Banknote,
  Smartphone,
  CreditCard,
  Eye,
  TrendingUp,
  TrendingDown,
  Edit,
  Trash2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AccountType, Account as ERPAccount } from '@/types/erp';
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from '@/hooks';
import { useInflowOutflowSummary } from '@/hooks/useTransactions';
import type { Account, CreateAccountInput, UpdateAccountInput } from '@/types/api';

export default function AccountsPage() {
  const { t } = useLanguage();
  const [dateRange, setDateRange] = useState<DateRange>({ type: 'last7days', fromDate: null, toDate: null });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  
  // Fetch from database - only active accounts
  const { data: accounts = [], isLoading, error } = useAccounts({ status: 'active' });
  const { data: inflowOutflowSummary } = useInflowOutflowSummary(
    dateRange.fromDate || undefined,
    dateRange.toDate || undefined
  );
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  
    
  const [formData, setFormData] = useState({
    accountName: '',
    accountType: 'cash' as AccountType,
    accountNumber: '',
    bankName: '',
    openingBalance: '',
    description: '',
  });

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'cash':
        return Banknote;
      case 'bank':
        return CreditCard;
      case 'mobile_wallet':
        return Smartphone;
      default:
        return Wallet;
    }
  };

  const getAccountTypeLabel = (type: AccountType) => {
    switch (type) {
      case 'cash':
        return t('cash');
      case 'bank':
        return t('bank');
      case 'mobile_wallet':
        return t('mobileWallet');
      default:
        return t('custom');
    }
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0);
  const totalInflows = inflowOutflowSummary?.totalInflows || 0;
  const totalOutflows = inflowOutflowSummary?.totalOutflows || 0;
  const handleSubmit = async () => {
    if (!formData.accountName) {
      toast({
        title: 'Error',
        description: 'Please enter account name',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingAccount) {
        // Update existing account
        const updateData: UpdateAccountInput = {
          account_name: formData.accountName,
          account_type: formData.accountType as any,
          account_number: formData.accountNumber || undefined,
          bank_name: formData.bankName || undefined,
          opening_balance: parseFloat(formData.openingBalance) || 0,
          status: 'active',
          description: formData.description || undefined,
        };
        await updateAccount.mutateAsync({ id: editingAccount.id, data: updateData });
        
        toast({
          title: t('updatedSuccessfully'),
          description: `Account "${formData.accountName}" has been updated`,
        });
      } else {
        // Create new account
        const accountData: CreateAccountInput = {
          id: `ACC-${Date.now()}`,
          account_name: formData.accountName,
          account_type: formData.accountType as any,
          account_number: formData.accountNumber || undefined,
          bank_name: formData.bankName || undefined,
          opening_balance: parseFloat(formData.openingBalance) || 0,
          current_balance: parseFloat(formData.openingBalance) || 0,
          status: 'active',
          description: formData.description || undefined,
        };

        await createAccount.mutateAsync(accountData);
        
        toast({
          title: t('createdSuccessfully'),
          description: `Account "${formData.accountName}" has been added`,
        });
      }
      
      setDialogOpen(false);
      setEditingAccount(null);
      setFormData({
        accountName: '',
        accountType: 'cash',
        accountNumber: '',
        bankName: '',
        openingBalance: '',
        description: '',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Operation failed',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      accountName: account.account_name,
      accountType: account.account_type,
      accountNumber: account.account_number || '',
      bankName: account.bank_name || '',
      openingBalance: account.opening_balance.toString(),
      description: account.description || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deletingAccount) {
      try {
                await deleteAccount.mutateAsync(deletingAccount.id);
                toast({
          title: t('deletedSuccessfully'),
          description: `Account "${deletingAccount.account_name}" has been set to inactive`,
        });
        setDeleteDialogOpen(false);
        setDeletingAccount(null);
      } catch (error) {
        console.error('❌ [AccountsPage] Delete failed:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Operation failed',
          variant: 'destructive',
        });
      }
    }
  };

  const openDeleteDialog = (account: Account) => {
    setDeletingAccount(account);
    setDeleteDialogOpen(true);
  };

  return (
    <MainLayout title={t('accounts')}>
      <div className="space-y-6">
        <PageHeader title={t('accounts')}>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingAccount(null);
              setFormData({
                accountName: '',
                accountType: 'cash',
                accountNumber: '',
                bankName: '',
                openingBalance: '',
                description: '',
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingAccount(null);
                setFormData({
                  accountName: '',
                  accountType: 'cash',
                  accountNumber: '',
                  bankName: '',
                  openingBalance: '',
                  description: '',
                });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                {t('add')} {t('accounts')}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>
                  {editingAccount ? `${t('edit')} ${t('accounts')}` : `${t('add')} ${t('accounts')}`}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t('accountName')} *</Label>
                  <Input
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    placeholder="Account name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('accountType')}</Label>
                  <Select
                    value={formData.accountType}
                    onValueChange={(value: AccountType) =>
                      setFormData({ ...formData, accountType: value })
                    }
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border z-50">
                      <SelectItem value="cash">{t('cash')}</SelectItem>
                      <SelectItem value="bank">{t('bank')}</SelectItem>
                      <SelectItem value="mobile_wallet">{t('mobileWallet')}</SelectItem>
                      <SelectItem value="cheque">{t('cheque')}</SelectItem>
                      <SelectItem value="custom">{t('custom')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.accountType === 'bank' || formData.accountType === 'mobile_wallet') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <Input
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        placeholder="Account number"
                      />
                    </div>
                    {formData.accountType === 'bank' && (
                      <div className="space-y-2">
                        <Label>Bank Name</Label>
                        <Input
                          value={formData.bankName}
                          onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                          placeholder="Bank name"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{t('openingBalance')}</Label>
                  <Input
                    type="number"
                    value={formData.openingBalance}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                    placeholder="0"
                    className="input-currency"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('description')}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description..."
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                    {t('cancel')}
                  </Button>
                  <Button onClick={handleSubmit} className="flex-1">
                    {t('save')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </PageHeader>

        {/* Date Range Filter */}
        {/* <DateRangeFilter 
          onDateChange={setDateRange}
          defaultRange="last7days"
        /> */}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="card-stats bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('currentBalance')}</p>
                <CurrencyDisplay amount={totalBalance} className="text-2xl font-bold" />
              </div>
              <div className="p-3 bg-primary/20 rounded-xl">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>
          <Card className="card-stats bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Inflows</p>
                <CurrencyDisplay amount={totalInflows} className="text-2xl font-bold text-success" />
              </div>
              <div className="p-3 bg-success/20 rounded-xl">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </Card>
          <Card className="card-stats bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Outflows</p>
                <CurrencyDisplay amount={totalOutflows} className="text-2xl font-bold text-destructive" />
              </div>
              <div className="p-3 bg-destructive/20 rounded-xl">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </Card>
        </div>

        {/* Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const Icon = getAccountIcon(account.account_type as AccountType);
            return (
              <Card key={account.id} className="hover:shadow-lg transition-all duration-200 hover:border-primary/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{account.account_name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {getAccountTypeLabel(account.account_type as AccountType)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={account.status} />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{t('currentBalance')}</span>
                      <CurrencyDisplay amount={account.current_balance} className="text-xl font-bold" />
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{t('openingBalance')}</span>
                      <CurrencyDisplay amount={account.opening_balance} />
                    </div>
                    {account.account_number && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Account #</span>
                        <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">{account.account_number}</span>
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Link to={`/accounts/${account.id}/ledger`} className="flex-1">
                        <Button variant="outline" className="w-full" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          {t('view')} {t('ledger')}
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(account)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => openDeleteDialog(account)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingAccount?.account_name}"?
                <br /><br />
                <strong>Note:</strong> This account will be set to inactive status. All transaction history will be preserved, but the account will no longer be available for new transactions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
