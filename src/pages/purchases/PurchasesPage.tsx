import { useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/page-header';
import { DateRangeFilter, DateRange } from '@/components/ui/date-range-filter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Eye, Printer, Edit } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { usePurchases, usePurchaseWithItems } from '@/hooks';
import { useInvoiceSettings } from '@/hooks/useInvoiceSettings';
import { InvoicePrint } from '@/components/print/InvoicePrint';
import { transformPurchaseForPrint, openPrintWindow } from '@/lib/print-service';
import { defaultInvoiceSettings } from '@/data/mockData';

export default function PurchasesPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ type: 'last7days', fromDate: null, toDate: null });
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);

  const { data: purchases = [], isLoading, error } = usePurchases();
  const { data: invoiceSettings = defaultInvoiceSettings } = useInvoiceSettings();
  // Fetch purchase with items when selected for printing
  const { data: purchaseWithItems, isLoading: isPrintDataLoading } = usePurchaseWithItems(
    selectedPurchaseId || '',
    !!selectedPurchaseId && printDialogOpen
  );
  
  const filteredPurchases = purchases.filter(
    (purchase) => {
      // Date range filter
      if (dateRange.fromDate && dateRange.toDate) {
        const purchaseDate = new Date(purchase.purchase_date).toISOString().split('T')[0];
        if (purchaseDate < dateRange.fromDate || purchaseDate > dateRange.toDate) {
          return false;
        }
      }
      
      // Search filter
      return purchase.bill_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase());
    }
  );

  const handlePrintClick = (purchaseId: string) => {
    setSelectedPurchaseId(purchaseId);
    setPrintDialogOpen(true);
  };

  const handlePrint = () => {
    if (printRef.current && purchaseWithItems) {
      const printContent = printRef.current.innerHTML;
      try {
        openPrintWindow(printContent, `Bill ${purchaseWithItems.bill_number}`, 'classic');
        setPrintDialogOpen(false);
      } catch (error) {
        console.error('Print error:', error);
        alert('Failed to open print window. Please allow popups and try again.');
      }
    }
  };

  const printPurchase = purchaseWithItems ? transformPurchaseForPrint(purchaseWithItems) : null;

  return (
    <MainLayout title={t('purchases')}>
      <div className="space-y-4 md:space-y-6">
        <PageHeader title={t('purchases')}>
          <Button onClick={() => navigate('/purchases/new')} size="sm" className="md:size-default">
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden sm:inline">{t('createPurchase')}</span>
            <span className="sm:hidden">New</span>
          </Button>
        </PageHeader>

        {/* Print Preview Dialog */}
        <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
          <DialogContent className="max-w-full md:max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span>{t('print')} Bill</span>
                <Button onClick={handlePrint} disabled={isPrintDataLoading || !printPurchase} size="sm">
                  <Printer className="h-4 w-4 mr-2" />
                  {t('print')}
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="border rounded-lg overflow-hidden">
              {isPrintDataLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Skeleton className="h-96 w-full" />
                </div>
              ) : printPurchase ? (
                <InvoicePrint ref={printRef} sale={printPurchase} settings={invoiceSettings} />
              ) : (
                <div className="flex items-center justify-center p-12">
                  <p className="text-muted-foreground">Failed to load bill data</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

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
              placeholder={`${t('search')} ${t('billNumber')}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Purchases Table */}
        <Card className="table-container">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow className="bg-table-header hover:bg-table-header">
                <TableHead>{t('billNumber')}</TableHead>
                <TableHead>{t('supplierName')}</TableHead>
                <TableHead>{t('date')}</TableHead>
                <TableHead className="text-right">{t('total')}</TableHead>
                <TableHead className="text-right">{t('paid')}</TableHead>
                <TableHead className="text-right">{t('due')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="text-center">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.map((purchase) => (
                <TableRow key={purchase.id} className="hover:bg-table-row-hover">
                  <TableCell className="font-medium">{purchase.bill_number}</TableCell>
                  <TableCell>
                    {purchase.supplier_id ? (
                      <Link
                        to={`/suppliers/${purchase.supplier_id}`}
                        className="text-primary hover:underline"
                      >
                        {purchase.supplier_name}
                      </Link>
                    ) : (
                      purchase.supplier_name || '-'
                    )}
                  </TableCell>
                  <TableCell>{new Date(purchase.purchase_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay amount={purchase.total_amount} />
                  </TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay amount={purchase.paid_amount} className="text-success" />
                  </TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay
                      amount={purchase.due_amount}
                      className={purchase.due_amount > 0 ? 'text-destructive font-semibold' : ''}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={purchase.payment_status} />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {purchase.id ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link to={`/purchases/${purchase.id}`} className="inline-flex items-center justify-center">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {purchase.id ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link to={`/purchases/edit/${purchase.id}`} className="inline-flex items-center justify-center">
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handlePrintClick(purchase.id)}
                        disabled={!purchase.id}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredPurchases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {t('noDataFound')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
