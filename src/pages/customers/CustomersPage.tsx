import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DateRangeFilter, DateRange } from '@/components/ui/date-range-filter';
import { CustomerFormDialog } from '@/components/forms/CustomerFormDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Plus, Search, Eye, Phone, Edit, Trash2, AlertCircle, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from 'react-router-dom';
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks';
import { useCustomerFormSettings } from '@/hooks/useCustomerFormSettings';
import type { Customer, CreateCustomerInput } from '@/types/api';
import type { Customer as ERPCustomer, CustomerFormSettings } from '@/types/erp';
import { toast } from '@/hooks/use-toast';
import { defaultCustomerFormSettings } from '@/data/mockData';

export default function CustomersPage() {
  const { t, language } = useLanguage();

  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ type: 'last7days', fromDate: null, toDate: null });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<ERPCustomer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  // Use customer form settings hook
  const { data: formSettings = defaultCustomerFormSettings } = useCustomerFormSettings();

  // React Query hooks
  const { data: customers = [], isLoading, error } = useCustomers();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

   
  const filteredCustomers = customers.filter(
    (customer) => {
      // Status filter
      if (statusFilter === 'active' && customer.status !== 'active') return false;
      if (statusFilter === 'inactive' && customer.status !== 'inactive') return false;
      
      // Date range filter
      if (dateRange.fromDate && dateRange.toDate) {
        const customerDate = new Date(customer.created_at).toISOString().split('T')[0];
        if (customerDate < dateRange.fromDate || customerDate > dateRange.toDate) {
          return false;
        }
      }
      
      // Search filter
      return customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone?.includes(searchQuery) ||
        customer.city?.toLowerCase().includes(searchQuery.toLowerCase());
    }
  );
  const handleSave = async (data: Partial<ERPCustomer>) => {
    try {
      if (editingCustomer) {
                await updateCustomer.mutateAsync({
          id: editingCustomer.id,
          data: {
            name: data.name,
            name_urdu: data.nameUrdu,
            phone: data.phone,
            email: data.email,
            address: data.address,
            city: data.city,
            opening_balance: data.openingBalance,
            status: data.status as 'active' | 'inactive',
            notes: data.notes,
          },
        });
                toast({
          title: 'Success',
          description: 'Customer updated successfully',
        });
      } else {
        const customerData: CreateCustomerInput = {
          id: `CUST-${Date.now()}`,
          name: data.name || '',
          name_urdu: data.nameUrdu,
          phone: data.phone,
          email: data.email,
          address: data.address,
          city: data.city,
          opening_balance: data.openingBalance || 0,
          status: 'active',
        };
                await createCustomer.mutateAsync(customerData);
                toast({
          title: 'Success',
          description: 'Customer created successfully',
        });
      }
      setDialogOpen(false);
      setEditingCustomer(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Operation failed',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (customer: Customer) => {
    // Map API Customer to ERP Customer format for the dialog
    const erpCustomer = {
      id: customer.id,
      name: customer.name,
      nameUrdu: customer.name_urdu || '',
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      openingBalance: customer.opening_balance || 0,
      currentBalance: customer.current_balance || 0,
      status: customer.status,
      notes: customer.notes,
      createdAt: customer.created_at ? new Date(customer.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    };
    setEditingCustomer(erpCustomer);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deletingCustomer) {
      try {
                await deleteCustomer.mutateAsync(deletingCustomer.id);
                toast({
          title: t('deletedSuccessfully'),
          description: `Customer "${deletingCustomer.name}" has been removed`,
        });
        setDeleteDialogOpen(false);
        setDeletingCustomer(null);
      } catch (error) {
        console.error('❌ [CustomersPage] Delete failed:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Operation failed',
          variant: 'destructive',
        });
      }
    }
  };

  const openDeleteDialog = (customer: Customer) => {
    setDeletingCustomer(customer);
    setDeleteDialogOpen(true);
  };

  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    // Check if there are any customers to export
    if (!customers || customers.length === 0) {
      toast({
        title: 'Export Failed',
        description: 'No customers available to export',
        variant: 'destructive',
      });
      return;
    }

    try {
            const response = await window.api.export.customers({ 
        format, 
        status: 'all' // Always export both active and inactive customers
      });

      if (response.success) {
        toast({
          title: 'Export Successful',
          description: `Customers exported to ${response.data.filePath}`,
        });
      } else {
        throw new Error(response.error || 'Export failed');
      }
    } catch (error) {
      console.error('❌ [CustomersPage] Export failed:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export customers',
        variant: 'destructive',
      });
    }
  };

  return (
    <MainLayout title={t('customers')}>
      <div className="space-y-4 md:space-y-6">
        <PageHeader title={t('customers')}>
          <div className="flex gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="md:size-default" disabled={customers.length === 0}>
                  <Download className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-popover border border-border">
                <DropdownMenuItem onClick={() => handleExport('excel')} className="cursor-pointer">
                  Export as Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')} className="cursor-pointer">
                  Export as CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')} className="cursor-pointer">
                  Export as PDF (.pdf)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => { setEditingCustomer(null); setDialogOpen(true); }} size="sm" className="md:size-default">
              <Plus className="h-4 w-4 md:mr-2" />
              <span className="hidden sm:inline">{t('addCustomer')}</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </PageHeader>

        {/* Date Range Filter */}
        <DateRangeFilter 
          onDateChange={setDateRange}
          defaultRange="last7days"
        />

        {/* Search and Filters */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`${t('search')}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">Status:</span>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 border border-border rounded-md bg-background text-sm"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load customers'}
            </AlertDescription>
          </Alert>
        )}

        {/* Customers Table */}
        <Card className="table-container">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow className="bg-table-header hover:bg-table-header">
                <TableHead>{t('customerName')}</TableHead>
                <TableHead>{t('phone')}</TableHead>
                <TableHead>{t('city')}</TableHead>
                <TableHead className="text-right">{t('totalDue')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="text-center">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No results found' : 'No customers yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-table-row-hover">
                    <TableCell>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{customer.city || '-'}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay
                        amount={Math.max(0, customer.current_balance || 0)}
                        className={customer.current_balance && customer.current_balance > 0 ? 'text-warning font-semibold' : ''}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={customer.status} />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {customer.id ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link to={`/customers/${customer.id}`} className="inline-flex items-center justify-center">
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(customer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => openDeleteDialog(customer)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </Card>

        {/* Customer Form Dialog */}
        <CustomerFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          customer={editingCustomer}
          onSave={handleSave}
          formSettings={formSettings}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">{t('confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p className="font-semibold">
                  Are you sure you want to delete customer "{deletingCustomer?.name}"?
                </p>
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mt-2">
                  <p className="text-sm text-destructive font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Warning: Deleting this customer will also delete:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 ml-6 list-disc space-y-1">
                    <li>All sales transactions associated with this customer</li>
                    <li>All sales invoices and records</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-2">
                    <strong>Note:</strong> Account balances and ledger entries will remain unchanged.
                  </p>
                </div>
                <p className="text-sm text-destructive mt-2">
                  This action cannot be undone. Do you want to continue?
                </p>
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
