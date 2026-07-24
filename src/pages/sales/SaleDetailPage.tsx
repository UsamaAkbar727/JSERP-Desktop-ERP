import { useParams, Link, useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { StatusBadge } from '@/components/ui/status-badge';
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
} from '@/components/ui/dialog';
import { ArrowLeft, Printer, FileText, User, Calendar, Receipt } from 'lucide-react';
import { useSaleWithItems } from '@/hooks/useSales';
import { useSalePayments } from '@/hooks/usePayments';
import { Skeleton } from '@/components/ui/skeleton';
import { DetailPagePrint } from '@/components/print/DetailPagePrint';
import { useInvoiceSettings } from '@/hooks/useInvoiceSettings';
import { defaultInvoiceSettings } from '@/data/mockData';
import { openPrintWindow, transformSaleForPrint } from '@/lib/print-service';

export default function SaleDetailPage() {
  const { id } = useParams();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const { data: invoiceSettings = defaultInvoiceSettings } = useInvoiceSettings();

  const saleId = id || '';
  const { data: sale, isLoading: saleLoading, error: saleError } = useSaleWithItems(saleId, !!saleId);
  const { data: relatedPayments = [] } = useSalePayments(saleId);


    
  if (saleLoading) {
    return (
      <MainLayout title="Loading...">
        <div className="flex items-center justify-center h-96">
          <Skeleton className="h-64 w-full max-w-2xl" />
        </div>
      </MainLayout>
    );
  }

  if (saleError || !sale) {
    return (
      <MainLayout title="Sale Not Found">
        <div className="flex flex-col items-center justify-center h-96">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sale Not Found</h2>
          <p className="text-muted-foreground mb-4">{t('noDataFound')}</p>
          <Button onClick={() => navigate('/sales')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back')}
          </Button>
        </div>
      </MainLayout>
    );
  }

  const handleOpenPrintPreview = () => {
    if (!sale) {
      return;
    }
    setPrintDialogOpen(true);
  };

  const printSale = sale ? transformSaleForPrint(sale) : null;

  const handlePrint = () => {
    if (!printRef.current || !sale) {
      return;
    }

    const printContent = printRef.current.innerHTML;
    openPrintWindow(printContent, `Invoice ${sale.invoice_number}`, 'classic');
    setPrintDialogOpen(false);
  };

  return (
    <MainLayout title={`Invoice ${sale.invoice_number}`}>
      <div className="space-y-6">
        <PageHeader title={`Invoice: ${sale.invoice_number}`}>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/sales')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('back')}
            </Button>
            <Button variant="outline" onClick={handleOpenPrintPreview}>
              <Printer className="h-4 w-4 mr-2" />
              {t('print')}
            </Button>
          </div>
        </PageHeader>

        <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
          <DialogContent className="max-w-full md:max-w-5xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span>{t('print')} Invoice</span>
                <Button onClick={handlePrint} disabled={!printSale} size="sm">
                  <Printer className="h-4 w-4 mr-2" />
                  {t('print')}
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="border rounded-lg overflow-hidden bg-white">
              {printSale ? (
                <DetailPagePrint
                  ref={printRef}
                  sale={printSale}
                  settings={invoiceSettings}
                  detailTitle="رسید کی تفصیل"
                  statusLabel="کیفیت"
                  partyLabel="جناب"
                  paymentTitle="ادائیگی کی تاریخ"
                  outstandingLabel="باقی رقم"
                  payments={relatedPayments}
                />
              ) : (
                <div className="p-6 text-center text-muted-foreground">Failed to load invoice data</div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">{t('invoiceNumber')}</p>
                  <p className="font-semibold">{sale.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('date')}</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('customerName')}</p>
                  {sale.customer_id ? (
                    <Link
                      to={`/customers/${sale.customer_id}`}
                      className="font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <User className="h-4 w-4" />
                      {sale.customer_name}
                    </Link>
                  ) : (
                    <p className="font-semibold">{sale.customer_name || 'Walk-in'}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('status')}</p>
                  <StatusBadge status={sale.payment_status} />
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-table-header hover:bg-table-header">
                      <TableHead>#</TableHead>
                      <TableHead>{t('itemName')}</TableHead>
                      <TableHead className="text-center">{t('quantity')}</TableHead>
                      <TableHead>{t('unit')}</TableHead>
                      <TableHead className="text-right">{t('unitPrice')}</TableHead>
                      <TableHead className="text-right">{t('total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sale.items?.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell>{item.unit || 'pcs'}</TableCell>
                        <TableCell className="text-right">
                          <CurrencyDisplay amount={item.unit_price} />
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <CurrencyDisplay amount={item.total_price} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="mt-4 flex justify-end">
                <div className="w-72 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('subtotal')}</span>
                    <CurrencyDisplay amount={sale.subtotal} />
                  </div>
                  {sale.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>{t('discount')}</span>
                      <span>-<CurrencyDisplay amount={sale.discount_amount} /></span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>{t('grandTotal')}</span>
                    <CurrencyDisplay amount={sale.total_amount} />
                  </div>
                  <div className="flex justify-between text-sm text-success">
                    <span>{t('paid')}</span>
                    <CurrencyDisplay amount={sale.paid_amount} />
                  </div>
                  {sale.due_amount > 0 && (
                    <div className="flex justify-between font-semibold text-warning">
                      <span>{t('due')}</span>
                      <CurrencyDisplay amount={sale.due_amount} />
                    </div>
                  )}
                </div>
              </div>

              {sale.notes && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">{t('notes')}</p>
                  <p className="mt-1">{sale.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-5 w-5 text-success" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {relatedPayments &&
              relatedPayments.length > 0 ? (
                <div className="space-y-3">
                  {relatedPayments &&
                  relatedPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="p-3 bg-success/5 rounded-lg border border-success/20"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">{new Date(payment.payment_date).toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground">
                            via {payment.payment_method} • {payment.account_name}
                          </p>
                        </div>
                        <CurrencyDisplay
                          amount={payment.amount}
                          className="font-semibold text-success"
                        />
                      </div>
                      {payment.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No payments recorded</p>
              )}

              {sale.due_amount > 0 && (
                <div className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Outstanding Balance</span>
                    <CurrencyDisplay amount={sale.due_amount} className="font-bold text-warning" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
