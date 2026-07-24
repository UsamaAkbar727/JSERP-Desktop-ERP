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
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Plus, Search, Eye, Printer, AlertCircle, Edit } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useSales, useSaleWithItems } from '@/hooks';
import { useInvoiceSettings } from '@/hooks/useInvoiceSettings';
import { InvoicePrint } from '@/components/print/InvoicePrint';
import { transformSaleForPrint, openPrintWindow } from '@/lib/print-service';
import { defaultInvoiceSettings } from '@/data/mockData';

export default function SalesPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ type: 'last7days', fromDate: null, toDate: null });
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const { data: sales = [], isLoading, error } = useSales();
  const { data: invoiceSettings = defaultInvoiceSettings } = useInvoiceSettings();
  
  // Fetch sale with items when selected for printing
  const { data: saleWithItems, isLoading: isPrintDataLoading } = useSaleWithItems(
    selectedSaleId || '',
    !!selectedSaleId && printDialogOpen
  );
  
  const filteredSales = sales.filter(
    (sale) => {
      // Date range filter
      if (dateRange.fromDate && dateRange.toDate) {
        const saleDate = new Date(sale.sale_date).toISOString().split('T')[0];
        if (saleDate < dateRange.fromDate || saleDate > dateRange.toDate) {
          return false;
        }
      }
      
      // Search filter
      return sale.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    }
  );
  const handlePrintClick = (saleId: string) => {
    setSelectedSaleId(saleId);
    setPrintDialogOpen(true);
  };

  const handlePrint = () => {
    if (printRef.current && saleWithItems) {
      const printContent = printRef.current.innerHTML;
      try {
        openPrintWindow(printContent, `Invoice ${saleWithItems.invoice_number}`, 'classic');
        setPrintDialogOpen(false);
      } catch (error) {
        console.error('Print error:', error);
        alert('Failed to open print window. Please allow popups and try again.');
      }
    }
  };

  const printSale = saleWithItems ? transformSaleForPrint(saleWithItems) : null;
  
  return (
    <MainLayout title={t('sales')}>
      <div className="space-y-4 md:space-y-6">
        <PageHeader title={t('sales')}>
          <Button onClick={() => navigate('/sales/new')} size="sm" className="md:size-default">
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden sm:inline">{t('createSale')}</span>
            <span className="sm:hidden">New</span>
          </Button>
        </PageHeader>

        {/* Print Preview Dialog */}
        <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
          <DialogContent className="max-w-full md:max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span>{t('print')} Invoice</span>
                <Button onClick={handlePrint} disabled={isPrintDataLoading || !printSale} size="sm">
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
              ) : printSale ? (
                <InvoicePrint ref={printRef} sale={printSale} settings={invoiceSettings} />
              ) : (
                <div className="flex items-center justify-center p-12">
                  <p className="text-muted-foreground">Failed to load invoice data</p>
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
              placeholder={`${t('search')} ${t('invoiceNumber')}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load sales'}
            </AlertDescription>
          </Alert>
        )}

        {/* Sales Table */}
        <Card className="table-container">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow className="bg-table-header hover:bg-table-header">
                <TableHead>{t('invoiceNumber')}</TableHead>
                <TableHead>{t('customerName')}</TableHead>
                <TableHead>{t('date')}</TableHead>
                <TableHead className="text-right">{t('total')}</TableHead>
                <TableHead className="text-right">{t('paid')}</TableHead>
                <TableHead className="text-right">{t('due')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="text-center">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                  </TableRow>
                ))
              ) :filteredSales &&
               filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No results found' : 'No sales yet'}
                  </TableCell>
                </TableRow>
              ) : (filteredSales &&
                filteredSales.map((sale) => {
                  const dueAmount = sale.total_amount - sale.paid_amount;
                  return (
                    <TableRow key={sale.id} className="hover:bg-table-row-hover">
                      <TableCell className="font-medium">{sale.invoice_number}</TableCell>
                      <TableCell>
                        {sale.customer_id ? (
                          <Link
                            to={`/customers/${sale.customer_id}`}
                            className="text-primary hover:underline"
                          >
                            {sale.customer_name}
                          </Link>
                        ) : (
                          sale.customer_name || '-'
                        )}
                      </TableCell>
                      <TableCell>{new Date(sale.sale_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay amount={sale.total_amount} />
                      </TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay amount={sale.paid_amount} className="text-success" />
                      </TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay
                          amount={dueAmount}
                          className={dueAmount > 0 ? 'text-warning font-semibold' : ''}
                        />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={sale.payment_status} />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {sale.id ? (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8" 
                              asChild
                            >
                              <Link to={`/sales/${sale.id}`} className="inline-flex items-center justify-center">
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {sale.id ? (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8" 
                              asChild
                            >
                              <Link to={`/sales/edit/${sale.id}`} className="inline-flex items-center justify-center">
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
                            onClick={() => handlePrintClick(sale.id)}
                            disabled={!sale.id}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
