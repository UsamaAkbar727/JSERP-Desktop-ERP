import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/page-header';
import { DateRangeFilter, DateRange } from '@/components/ui/date-range-filter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, Wand2 } from 'lucide-react';
import { mockUnits, generateSku, defaultItemFormSettings, ItemFormSettings } from '@/data/mockData';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Item as ERPItem } from '@/types/erp';
import { Item as APIItem } from '@/types/api';
import { useItems, useCreateItem, useUpdateItem, useDeleteItem } from '@/hooks';

export default function ItemsPage() {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ type: 'last7days', fromDate: null, toDate: null });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ERPItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ERPItem | null>(null);
  const [itemSettings, setItemSettings] = useState<ItemFormSettings>(defaultItemFormSettings);
  
  // Fetch items from database
  const { data: items = [], isLoading, error } = useItems({ status: 'active' });
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();

  // Map API items to ERP format
  const mappedItems: ERPItem[] = items.map((item: APIItem): ERPItem => ({
    id: item.id,
    name: item.name,
    nameUrdu: item.name_urdu || '',
    sku: item.sku || '',
    salePrice: item.sale_price,
    purchasePrice: item.purchase_price,
    openingStock: item.opening_stock || 0,
    stockQuantity: item.stock_quantity,
    lowStockThreshold: item.low_stock_threshold,
    unitId: item.unit_id,
    unit: item.unit,
    status: item.status,
    description: item.description || '',
    createdAt: item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  }));
  
  const [formData, setFormData] = useState({
    name: '',
    nameUrdu: '',
    sku: '',
    salePrice: '',
    purchasePrice: '',
    openingStock: '',
    lowStockThreshold: '5',
    unitId: '1',
  });

  // Auto generate SKU on dialog open for new items
  useEffect(() => {
    if (dialogOpen && !editingItem && itemSettings.autoGenerateSku) {
      setFormData(prev => ({ ...prev, sku: generateSku() }));
    }
  }, [dialogOpen, editingItem, itemSettings.autoGenerateSku]);

  const filteredItems: ERPItem[] = mappedItems.filter(
    (item) => {
      // Status filter
      if (item.status !== 'active') return false;
      
      // Date range filter
      if (dateRange.fromDate && dateRange.toDate && item.createdAt) {
        const itemDate = item.createdAt;
        if (itemDate < dateRange.fromDate || itemDate > dateRange.toDate) {
          return false;
        }
      }
      
      // Search filter
      return item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    }
  );

  const resetForm = () => {
    setFormData({ 
      name: '', 
      nameUrdu: '', 
      sku: '', 
      salePrice: '', 
      purchasePrice: '', 
      openingStock: '',
      lowStockThreshold: '5',
      unitId: '1'
    });
    setEditingItem(null);
  };

  const handleOpenDialog = (item?: ERPItem) => {
    if (item) {
      const erpItem: ERPItem = {
        id: item.id,
        name: item.name,
        nameUrdu: item.nameUrdu || '',
        sku: item.sku,
        salePrice: item.salePrice,
        purchasePrice: item.purchasePrice,
        openingStock: item.openingStock || 0,
        stockQuantity: item.stockQuantity,
        lowStockThreshold: item.lowStockThreshold,
        unitId: item.unitId,
        unit: item.unit,
        status: item.status,
        description: item.description || '',
      };
      setEditingItem(erpItem);
      setFormData({
        name: item.name,
        nameUrdu: item.nameUrdu || '',
        sku: item.sku || '',
        salePrice: item.salePrice.toString(),
        purchasePrice: item.purchasePrice.toString(),
        openingStock: item.openingStock?.toString() || '0',
        lowStockThreshold: item.lowStockThreshold.toString(),
        unitId: item.unitId,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.salePrice || !formData.purchasePrice) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingItem) {
                await updateItem.mutateAsync({
          id: editingItem.id,
          data: {
            name: formData.name,
            name_urdu: formData.nameUrdu,
            sku: formData.sku,
            sale_price: parseFloat(formData.salePrice),
            purchase_price: parseFloat(formData.purchasePrice),
            low_stock_threshold: parseInt(formData.lowStockThreshold) || 5,
            unit_id: formData.unitId,
            unit: getUnitName(formData.unitId),
            status: 'active',
          },
        });
                toast({
          title: t('updatedSuccessfully'),
          description: `Item "${formData.name}" has been updated`,
        });
      } else {
        const itemData = {
          id: `ITEM-${Date.now()}`,
          name: formData.name,
          name_urdu: formData.nameUrdu,
          sku: formData.sku || `SKU-${Date.now()}`,
          sale_price: parseFloat(formData.salePrice),
          purchase_price: parseFloat(formData.purchasePrice),
          opening_stock: parseInt(formData.openingStock) || 0,
          stock_quantity: parseInt(formData.openingStock) || 0,
          low_stock_threshold: parseInt(formData.lowStockThreshold) || 5,
          unit_id: formData.unitId,
          unit: getUnitName(formData.unitId),
          status: 'active' as const,
        };
                await createItem.mutateAsync(itemData);
                toast({
          title: t('createdSuccessfully'),
          description: `Item "${formData.name}" has been added`,
        });
      }
      
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('❌ [ItemsPage] Operation failed:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Operation failed',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateSku = () => {
    setFormData(prev => ({ ...prev, sku: generateSku() }));
  };

  const handleDeleteClick = (item: ERPItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      await deleteItem.mutateAsync(itemToDelete.id);
      toast({
        title: t('deletedSuccessfully'),
        description: `Item "${itemToDelete.name}" has been deleted`,
      });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete item';
      
      // Check if error is due to existing transactions
      if (errorMessage.includes('existing') || errorMessage.includes('Cannot delete')) {
        // Set status to inactive instead
        try {
          await updateItem.mutateAsync({
            id: itemToDelete.id,
            data: { status: 'inactive' },
          });
          toast({
            title: 'Status Updated',
            description: `Item "${itemToDelete.name}" has been set to inactive (has existing transactions)`,
          });
          setDeleteDialogOpen(false);
          setItemToDelete(null);
        } catch (updateError) {
          toast({
            title: 'Error',
            description: 'Failed to update item status',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    }
  };

  const getStockStatus = (item: ERPItem) => {
    if (item.stockQuantity <= 0) return 'out';
    if (item.stockQuantity <= item.lowStockThreshold) return 'low';
    return 'in';
  };

  const getUnitName = (unitId: string) => {
    const unit = mockUnits.find(u => u.id === unitId);
    return unit?.symbol || 'pcs';
  };

  
  return (
    <MainLayout title={t('items')}>
      <div className="space-y-4 md:space-y-6">
        <PageHeader title={t('items')}>
          <Button onClick={() => handleOpenDialog()} size="sm" className="md:size-default">
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden sm:inline">{t('add')} {t('items')}</span>
            <span className="sm:hidden">Add</span>
          </Button>
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

        {/* Items Table */}
        <Card className="table-container">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow className="bg-table-header hover:bg-table-header">
                <TableHead>{t('itemName')}</TableHead>
                <TableHead>{t('sku')}</TableHead>
                <TableHead>{t('unit')}</TableHead>
                <TableHead className="text-right">{t('salePrice')}</TableHead>
                <TableHead className="text-right">{t('purchasePrice')}</TableHead>
                <TableHead className="text-right">{t('openingStock')}</TableHead>
                <TableHead className="text-right">{t('currentStock')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="text-center">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const stockStatus = getStockStatus(item);
                return (
                  <TableRow key={item.id} className="hover:bg-table-row-hover">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{item.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{item.sku || '-'}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-muted rounded text-xs font-medium">
                        {getUnitName(item.unitId)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={item.salePrice} />
                    </TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={item.purchasePrice} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.openingStock || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {stockStatus === 'low' && (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        )}
                        <span
                          className={cn(
                            'font-semibold',
                            stockStatus === 'out' && 'text-destructive',
                            stockStatus === 'low' && 'text-warning',
                            stockStatus === 'in' && 'text-success'
                          )}
                        >
                          {item.stockQuantity}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full font-medium",
                        stockStatus === 'out' && "bg-destructive/10 text-destructive",
                        stockStatus === 'low' && "bg-warning/10 text-warning",
                        stockStatus === 'in' && "bg-success/10 text-success"
                      )}>
                        {stockStatus === 'out' && t('outOfStock')}
                        {stockStatus === 'low' && t('lowStock')}
                        {stockStatus === 'in' && t('inStock')}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleOpenDialog(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteClick(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {t('noDataFound')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </Card>

        {/* Add/Edit Item Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="bg-card max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? `${t('edit')} ${t('items')}` : `${t('add')} ${t('items')}`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('itemName')} (English) *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Item name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('itemName')} (اردو)</Label>
                  <Input
                    value={formData.nameUrdu}
                    onChange={(e) => setFormData({ ...formData, nameUrdu: e.target.value })}
                    placeholder="آئٹم کا نام"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center justify-between">
                    <span>{t('sku')}</span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs"
                      onClick={handleGenerateSku}
                    >
                      <Wand2 className="h-3 w-3 mr-1" />
                      Auto Generate
                    </Button>
                  </Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="SKU-ABC-1234"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('unit')} *</Label>
                  <Select value={formData.unitId} onValueChange={(value) => setFormData({ ...formData, unitId: value })}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={t('unit')} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border z-50">
                      {mockUnits.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name} ({unit.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('salePrice')} *</Label>
                  <Input
                    type="number"
                    value={formData.salePrice}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                    placeholder="0"
                    className="input-currency"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('purchasePrice')} *</Label>
                  <Input
                    type="number"
                    value={formData.purchasePrice}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    placeholder="0"
                    className="input-currency"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('openingStock')}</Label>
                  <Input
                    type="number"
                    value={formData.openingStock}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormData({ ...formData, openingStock: e.target.value })}
                    placeholder="0"
                    disabled={!!editingItem}
                  />
                  {editingItem && (
                    <p className="text-xs text-muted-foreground">Opening stock cannot be changed after creation</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Low Stock Alert</Label>
                  <Input
                    type="number"
                    value={formData.lowStockThreshold}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                  {t('cancel')}
                </Button>
                <Button onClick={handleSubmit} className="flex-1">
                  {editingItem ? t('update') : t('save')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{itemToDelete?.name}"? <br />
                If this item has existing transactions, it will be set to inactive instead.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
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
