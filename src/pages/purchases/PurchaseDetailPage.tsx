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
import { ArrowLeft, Printer, FileText, Truck, Calendar, Receipt } from 'lucide-react';
import { usePurchaseWithItems } from '@/hooks/usePurchases';
import { usePurchasePayments } from '@/hooks/usePayments';
import { DetailPagePrint } from '@/components/print/DetailPagePrint';
import { useInvoiceSettings } from '@/hooks/useInvoiceSettings';
import { defaultInvoiceSettings } from '@/data/mockData';
import { openPrintWindow, transformPurchaseForPrint } from '@/lib/print-service';

export default function PurchaseDetailPage() {
  const { id } = useParams();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const { data: invoiceSettings = defaultInvoiceSettings } = useInvoiceSettings();

  const purchaseId = id || '';
  const { data: purchase, isLoading, error } = usePurchaseWithItems(purchaseId, !!purchaseId);
  const { data: relatedPayments = [] } = usePurchasePayments(purchaseId);
  const handleOpenPrintPreview = () => {
    if (!purchase) {
      return;
    }
    setPrintDialogOpen(true);
  };

  const printPurchase = purchase ? transformPurchaseForPrint(purchase) : null;

  const handlePrint = () => {
    if (!printRef.current || !purchase) {
      return;
    }

    const printContent = printRef.current.innerHTML;
    openPrintWindow(printContent, `Bill ${purchase.bill_number || ''}`, 'classic');
    setPrintDialogOpen(false);
  };

  if (isLoading) {
    return (
      <MainLayout title="Loading...">
        <div className="flex items-center justify-center h-96">
          <p>Loading purchase details...</p>
        </div>
      </MainLayout>
    );
  }

  if (error || !purchase) {
    return (
      <MainLayout title="Purchase Not Found">
        <div className="flex flex-col items-center justify-center h-96">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Purchase Not Found</h2>
          <p className="text-muted-foreground mb-4">{t('noDataFound')}</p>
          <Button onClick={() => navigate('/purchases')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back')}
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`Bill ${purchase.bill_number}`}>
      <div className="space-y-6">
        <PageHeader title={`Bill: ${purchase.bill_number}`}>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/purchases')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('back')}
            </Button>
            <Button variant="outline" onClick={handleOpenPrintPreview}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </PageHeader>

        <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
          <DialogContent className="max-w-full md:max-w-5xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span>{t('print')} Bill</span>
                <Button onClick={handlePrint} disabled={!printPurchase} size="sm">
                  <Printer className="h-4 w-4 mr-2" />
                  {t('print')}
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="border rounded-lg overflow-hidden bg-white">
              {printPurchase ? (
                <DetailPagePrint
                  ref={printRef}
                  sale={printPurchase}
                  settings={invoiceSettings}
                  detailTitle="بِل کی تفصیل"
                  statusLabel="کیفیت"
                  partyLabel="سپلائر"
                  paymentTitle="ادائیگی کی تاریخ"
                  outstandingLabel="قابل ادائیگی"
                  payments={relatedPayments}
                />
              ) : (
                <div className="p-6 text-center text-muted-foreground">Failed to load bill data</div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bill Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Bill Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">{t('billNumber')}</p>
                  <p className="font-semibold">{purchase.bill_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('date')}</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(purchase.purchase_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('supplierName')}</p>
                  {purchase.supplier_id ? (
                    <Link
                      to={`/suppliers/${purchase.supplier_id}`}
                      className="font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <Truck className="h-4 w-4" />
                      {purchase.supplier_name}
                    </Link>
                  ) : (
                    <p className="font-semibold">{purchase.supplier_name || '-'}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('status')}</p>
                  <StatusBadge status={purchase.payment_status} />
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
                    {purchase.items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell>{item.unit_name || 'pcs'}</TableCell>
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
                    <CurrencyDisplay amount={purchase.subtotal} />
                  </div>
                  {purchase.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>{t('discount')}</span>
                      <span>-<CurrencyDisplay amount={purchase.discount_amount} /></span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>{t('grandTotal')}</span>
                    <CurrencyDisplay amount={purchase.total_amount} />
                  </div>
                  <div className="flex justify-between text-sm text-success">
                    <span>{t('paid')}</span>
                    <CurrencyDisplay amount={purchase.paid_amount} />
                  </div>
                  {purchase.due_amount > 0 && (
                    <div className="flex justify-between font-semibold text-destructive">
                      <span>{t('payable')}</span>
                      <CurrencyDisplay amount={purchase.due_amount} />
                    </div>
                  )}
                </div>
              </div>

              {purchase.notes && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">{t('notes')}</p>
                  <p className="mt-1">{purchase.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-5 w-5 text-destructive" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {relatedPayments.length > 0 ? (
                <div className="space-y-3">
                  {relatedPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="p-3 bg-destructive/5 rounded-lg border border-destructive/20"
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
                          className="font-semibold text-destructive"
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

              {purchase.due_amount > 0 && (
                <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Outstanding Payable</span>
                    <CurrencyDisplay amount={purchase.due_amount} className="font-bold text-destructive" />
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
