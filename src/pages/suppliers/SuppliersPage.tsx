import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/page-header';
import { DateRangeFilter, DateRange } from '@/components/ui/date-range-filter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { StatusBadge } from '@/components/ui/status-badge';
import { SupplierFormDialog } from '@/components/forms/SupplierFormDialog';
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
import { Plus, Search, Eye, Phone, Edit, Trash2, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from 'react-router-dom';
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks';
import { useSupplierFormSettings } from '@/hooks/useSupplierFormSettings';
import type { Supplier, CreateSupplierInput } from '@/types/api';
import type { Supplier as ERPSupplier } from '@/types/erp';
import { toast } from '@/hooks/use-toast';
import { defaultSupplierFormSettings } from '@/data/mockData';

export default function SuppliersPage() {
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ type: 'last7days', fromDate: null, toDate: null });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<ERPSupplier | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  // Use supplier form settings hook
  const { data: formSettings = defaultSupplierFormSettings } = useSupplierFormSettings();

  // React Query hooks - Load only active suppliers in table
  const { data: suppliers = [], isLoading, error } = useSuppliers({ status: 'active' });
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const filteredSuppliers = suppliers.filter(
    (supplier) => {
      // Status filter
      if (supplier.status !== 'active') return false;
      
      // Date range filter
      if (dateRange.fromDate && dateRange.toDate) {
        const supplierDate = new Date(supplier.created_at).toISOString().split('T')[0];
        if (supplierDate < dateRange.fromDate || supplierDate > dateRange.toDate) {
          return false;
        }
      }
      
      // Search filter
      return supplier.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.phone?.includes(searchQuery) ||
        supplier.city?.toLowerCase().includes(searchQuery.toLowerCase());
    }
  );

  const handleSave = async (data: Partial<ERPSupplier>) => {
    try {
      if (editingSupplier) {
                await updateSupplier.mutateAsync({
          id: editingSupplier.id,
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
          description: 'Supplier updated successfully',
        });
      } else {
        const supplierData: CreateSupplierInput = {
          id: `SUPP-${Date.now()}`,
          name: data.name || '',
          name_urdu: data.nameUrdu,
          phone: data.phone,
          email: data.email,
          address: data.address,
          city: data.city,
          opening_balance: data.openingBalance || 0,
          status: 'active',
          notes: data.notes,
        };
                await createSupplier.mutateAsync(supplierData);
                toast({
          title: 'Success',
          description: 'Supplier created successfully',
        });
      }
      setDialogOpen(false);
      setEditingSupplier(null);
    } catch (error) {
      console.error('❌ [SuppliersPage] Operation failed:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Operation failed',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (supplier: Supplier) => {
    // Map API Supplier to ERP Supplier format for the dialog
    const erpSupplier: ERPSupplier = {
      id: supplier.id,
      name: supplier.name,
      nameUrdu: supplier.name_urdu || '',
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city,
      openingBalance: supplier.opening_balance || 0,
      currentBalance: supplier.current_balance || 0,
      status: supplier.status,
      notes: supplier.notes,
      createdAt: supplier.created_at ? new Date(supplier.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    };
    setEditingSupplier(erpSupplier);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deletingSupplier) {
      try {
                await deleteSupplier.mutateAsync(deletingSupplier.id);
                toast({
          title: t('deletedSuccessfully'),
          description: `Supplier "${deletingSupplier.name}" has been removed`,
        });
        setDeleteDialogOpen(false);
        setDeletingSupplier(null);
      } catch (error) {
        console.error('❌ [SuppliersPage] Delete failed:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Operation failed',
          variant: 'destructive',
        });
      }
    }
  };

  const openDeleteDialog = (supplier: Supplier) => {
    setDeletingSupplier(supplier);
    setDeleteDialogOpen(true);
  };

  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    // Check if there are any suppliers to export
    if (!suppliers || suppliers.length === 0) {
      toast({
        title: 'Export Failed',
        description: 'No suppliers available to export',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Export all suppliers (both active and inactive)
      const response = await window.api.export.suppliers({ format });

      if (response.success) {
        toast({
          title: 'Export Successful',
          description: `Suppliers exported to ${response.data.filePath}`,
        });
      } else {
        throw new Error(response.error || 'Export failed');
      }
    } catch (error) {
      console.error('❌ [SuppliersPage] Export failed:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export suppliers',
        variant: 'destructive',
      });
    }
  };

  return (
    <MainLayout title={t('suppliers')}>
      <div className="space-y-4 md:space-y-6">
        <PageHeader title={t('suppliers')}>
          <div className="flex gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="md:size-default" disabled={suppliers.length === 0}>
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
            <Button onClick={() => { setEditingSupplier(null); setDialogOpen(true); }} size="sm" className="md:size-default">
              <Plus className="h-4 w-4 md:mr-2" />
              <span className="hidden sm:inline">{t('addSupplier')}</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </PageHeader>

        {/* Date Range Filter */}
        <DateRangeFilter 
          onDateChange={setDateRange}
          defaultRange="last7days"
        />

        {/* Search */}
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
        </div>

        {/* Suppliers Table */}
        <Card className="table-container">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow className="bg-table-header hover:bg-table-header">
                <TableHead>{t('supplierName')}</TableHead>
                <TableHead>{t('phone')}</TableHead>
                <TableHead>{t('city')}</TableHead>
                <TableHead className="text-right">{t('totalPayable')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="text-center">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id} className="hover:bg-table-row-hover">
                  <TableCell>
                    <div>
                      <p className="font-medium">{supplier.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {supplier.phone && (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3" />
                        {supplier.phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{supplier.city || '-'}</TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay
                      amount={Math.max(0, supplier.current_balance || 0)}
                      className={supplier.current_balance && supplier.current_balance > 0 ? 'text-destructive font-semibold' : ''}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={supplier.status} />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link to={`/suppliers/${supplier.id}`} className="inline-flex items-center justify-center">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(supplier)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => openDeleteDialog(supplier)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSuppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('noDataFound')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </Card>

        {/* Supplier Form Dialog */}
        <SupplierFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          supplier={editingSupplier}
          onSave={handleSave}
          formSettings={formSettings}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p className="font-semibold text-destructive">
                  Warning: Deleting supplier "{deletingSupplier?.name}" will also delete all related purchases!
                </p>
                <p>
                  This action cannot be undone. The supplier and all associated purchase records will be permanently removed.
                </p>
                <p className="text-sm">
                  Note: This will not affect your accounts or financial records.
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
