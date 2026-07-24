import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/page-header';
import { DateRangeFilter, DateRange } from '@/components/ui/date-range-filter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, DollarSign, TrendingDown, Calendar, Edit, Trash2, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useExpenses, useAccounts, useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/hooks';
import { useActiveExpenseCategories } from '@/hooks/useExpenseCategories';
import type { Expense } from '@/types/api';

export default function ExpensesPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ type: 'last7days', fromDate: null, toDate: null });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  // Fetch from database
  const { data: expenses = [], isLoading, error } = useExpenses();
  const { data: accounts = [] } = useAccounts();
  const { data: expenseCategories = [] } = useActiveExpenseCategories();
  // Mutations
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  
    
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    amount: '',
    accountId: '',
  });

  const getAccountDisplayName = (account: { account_type: string; bank_name?: string; account_name: string }) => {
    if (account.account_type === 'bank' && account.bank_name?.trim()) {
      return account.bank_name;
    }

    return account.account_name;
  };

  const filteredExpenses = expenses.filter(
    (expense) => {
      // Date range filter
      if (dateRange.fromDate && dateRange.toDate) {
        const expenseDate = new Date(expense.date).toISOString().split('T')[0];
        if (expenseDate < dateRange.fromDate || expenseDate > dateRange.toDate) {
          return false;
        }
      }
      
      // Category filter
      if (selectedCategory && expense.category !== selectedCategory) {
        return false;
      }
      
      // Search filter
      return expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.category?.toLowerCase().includes(searchQuery.toLowerCase());
    }
  );

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const thisMonthExpenses = expenses
    .filter((e) => new Date(e.date).getMonth() === new Date().getMonth())
    .reduce((sum, e) => sum + e.amount, 0);

  const expensesByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: '',
      description: '',
      amount: '',
      accountId: '',
    });
    setEditingExpense(null);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date,
      category: expense.category,
      description: expense.description || '',
      amount: expense.amount.toString(),
      accountId: expense.account_id || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
            
    if (!formData.category ||  !formData.amount || !formData.accountId) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    const account = accounts.find((a) => a.id.toString() === formData.accountId);
    
    // Check if account has sufficient balance
    if (account && account.current_balance < parseFloat(formData.amount)) {
      toast({
        title: 'Insufficient Balance',
        description: `Account "${getAccountDisplayName(account)}" has insufficient balance. Available: PKR ${account.current_balance.toFixed(2)}, Required: PKR ${parseFloat(formData.amount).toFixed(2)}`,
        variant: 'destructive',
      });
      return;
    }

    if (editingExpense) {
      // Update existing expense
      const selectedAccount = accounts.find((a) => a.id.toString() === formData.accountId);
      
            
      updateExpense.mutate(
        {
          id: editingExpense.id,
          data: {
            date: formData.date,
            category: formData.category,
            description: formData.description,
            amount: parseFloat(formData.amount),
            account_id: formData.accountId,
            account_name: selectedAccount ? getAccountDisplayName(selectedAccount) : '',
          },
        },
        {
          onSuccess: (data) => {
                        toast({
              title: t('updatedSuccessfully'),
              description: `Expense updated successfully`,
            });
            setDialogOpen(false);
            resetForm();
          },
          onError: (error) => {
            console.error('[ExpensesPage] Update error:', error);
            toast({
              title: 'Error',
              description: error.message,
              variant: 'destructive',
            });
          },
        }
      );
    } else {
      // Create new expense
      const selectedAccount = accounts.find((a) => a.id.toString() === formData.accountId);
      const expenseId = `EXP-${Date.now()}`;
      
            
      createExpense.mutate(
        {
          id: expenseId,
          date: formData.date,
          category: formData.category,
          description: formData.description,
          amount: parseFloat(formData.amount),
          account_id: formData.accountId,
          account_name: selectedAccount ? getAccountDisplayName(selectedAccount) : '',
        },
        {
          onSuccess: (data) => {
                        toast({
              title: t('createdSuccessfully'),
              description: `Expense of PKR ${formData.amount} recorded`,
            });
            setDialogOpen(false);
            resetForm();
          },
          onError: (error) => {
            console.error('[ExpensesPage] Create error:', error);
            console.error('[ExpensesPage] Error details:', {
              message: error.message,
              stack: error.stack,
              error: error,
            });
            toast({
              title: 'Error',
              description: error.message,
              variant: 'destructive',
            });
          },
        }
      );
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleDelete = (id: string) => {
        
    deleteExpense.mutate(id, {
      onSuccess: (data) => {
                toast({
          title: t('deletedSuccessfully'),
          description: 'Expense has been removed',
        });
      },
      onError: (error) => {
        console.error('[ExpensesPage] Delete error:', error);
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  return (
    <MainLayout title="Expenses">
      <div className="space-y-6">
        <PageHeader title="Expense Manager">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigate('/settings#expense-categories');
                setTimeout(() => {
                  document.getElementById('expense-categories')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
              }}
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Categories
            </Button>
            <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
            <DialogContent className="bg-card max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('date')} *</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border z-50">
                        {expenseCategories &&
                        expenseCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('description')} </Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What was this expense for?"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('amount')} *</Label>
                    <Input
                      type="number"
                      value={formData.amount}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0"
                      className="input-currency"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pay From *</Label>
                    <Select
                      value={formData.accountId}
                      onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder={t('selectAccount')} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border z-50">
                        {accounts
                          .filter((a) => a.status === 'active')
                          .map((account) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {getAccountDisplayName(account)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => handleDialogClose(false)} className="flex-1">
                    {t('cancel')}
                  </Button>
                  <Button onClick={handleSubmit} className="flex-1">
                    {editingExpense ? t('update') : t('save')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </PageHeader>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Total Expenses"
            value={totalExpenses}
            icon={DollarSign}
            iconClassName="bg-destructive/10 text-destructive"
          />
          <StatsCard
            title="This Month"
            value={thisMonthExpenses}
            icon={Calendar}
            iconClassName="bg-warning/10 text-warning"
          />
          <StatsCard
            title="Expense Count"
            value={expenses.length}
            icon={TrendingDown}
            isCurrency={false}
            iconClassName="bg-info/10 text-info"
          />
        </div>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(expensesByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount]) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    className={cn(
                      "h-auto p-3 flex flex-col items-start gap-1 hover:shadow-md transition-all",
                      selectedCategory === category && "ring-2 ring-primary"
                    )}
                    onClick={() => {
                      if (selectedCategory === category) {
                        setSelectedCategory(null);
                        setSearchQuery('');
                      } else {
                        setSelectedCategory(category);
                        setSearchQuery(category);
                      }
                    }}
                  >
                    <p className={cn(
                      "text-xs transition-colors",
                      selectedCategory === category 
                        ? "text-primary-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    )}>
                      {category}
                    </p>
                    <CurrencyDisplay 
                      amount={amount} 
                      className={cn(
                        "font-semibold transition-colors",
                        selectedCategory === category 
                          ? "text-primary-foreground" 
                          : "hover:text-foreground"
                      )} 
                    />
                  </Button>
                ))}
            </div>
            {selectedCategory && (
              <div className="mt-4 flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Showing expenses for: <span className="font-semibold text-foreground">{selectedCategory}</span>
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory(null);
                    setSearchQuery('');
                  }}
                  className="h-7 px-2 text-xs"
                >
                  Clear Filter
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Date Range Filter */}
        <DateRangeFilter 
          onDateChange={setDateRange}
          defaultRange="last7days"
        />

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Expenses Table */}
        <Card className="table-container">
          <Table>
            <TableHeader>
              <TableRow className="bg-table-header hover:bg-table-header">
                <TableHead>{t('date')}</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>{t('description')}</TableHead>
                <TableHead>{t('accountName')}</TableHead>
                <TableHead className="text-right">{t('amount')}</TableHead>
                <TableHead className="text-center">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => (
                <TableRow key={expense.id} className="hover:bg-table-row-hover">
                  <TableCell>{expense.date}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-secondary rounded text-xs font-medium">
                      {expense.category}
                    </span>
                  </TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{expense.account_name}</TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay amount={expense.amount} className="font-semibold text-destructive" />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleEdit(expense)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(expense.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredExpenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('noDataFound')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </MainLayout>
  );
}
