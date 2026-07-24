import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { PaymentMethodSelector } from '@/components/forms/PaymentMethodSelector';
import { PaymentMethod } from '@/types/erp';
import { Item } from '@/types/api';
import { toast } from '@/hooks/use-toast';
import { useActiveItems } from '@/hooks/useItems';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useAccounts, useRefreshAccounts } from '@/hooks/useAccounts';
import { useCreatePurchase } from '@/hooks/usePurchases';
import { useInvoiceNumberPreview, checkInvoiceNumberUnique } from '@/hooks/useInvoiceNumberFormat';
import { ArrowLeft, Plus, Minus, Trash2, Search, Package, Receipt, Save, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CartItem {
  item: Item;
  quantity: number;
  unitPrice: number;
}

export default function CreatePurchasePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const supplierId = searchParams.get('supplierId');
  const { t } = useLanguage();
    const refreshAccounts = useRefreshAccounts();

  const { data: items = [], isLoading: itemsLoading } = useActiveItems();
  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers({ status: 'active' });
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const createPurchaseMutation = useCreatePurchase();

  const [selectedSupplierId, setSelectedSupplierId] = useState(supplierId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState('0');
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(''); // Now stores account ID
  const [selectedAccount, setSelectedAccount] = useState(''); // Deprecated but kept for backward compatibility
  const [chequeAccountId, setChequeAccountId] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Bill number state
  const [billNumber, setBillNumber] = useState('');
  const [isManualBill, setIsManualBill] = useState(false);

  // Bill number preview (read-only, does NOT change DB counter)
  const { data: billPreview } = useInvoiceNumberPreview('purchase');

  // Pre-fill bill number when preview loads (only if not manually set)
  useEffect(() => {
    if (billPreview && !isManualBill) {
      setBillNumber(billPreview);
    }
  }, [billPreview, isManualBill]);

  useEffect(() => {
    // Set default account to first available account if none selected
    if (!paymentMethod && accounts.length > 0) {
      const firstAccount = accounts.find((a) => a.status === 'active');
      if (firstAccount) {
        setPaymentMethod(String(firstAccount.id));
        setSelectedAccount(String(firstAccount.id)); // Keep for backward compatibility
      }
    }
  }, [paymentMethod, accounts]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items.filter(item => item.status === 'active');
    return items.filter(
      (item) =>
        item.status === 'active' &&
        (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery, items]);

  const addToCart = (item: Item) => {
    const existing = cart.find((c) => c.item.id === item.id);
    if (existing) {
      setCart(cart.map((c) => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { item, quantity: 1, unitPrice: item.purchase_price }]);
    }
  };

  const updateQuantity = (itemId: string, newQty: number) => {
    // Ensure valid positive number
    if (isNaN(newQty) || newQty <= 0) {
      setCart(cart.filter((c) => c.item.id !== itemId));
      return;
    }
    setCart(cart.map((c) => c.item.id === itemId ? { ...c, quantity: newQty } : c));
  };

  const updatePrice = (itemId: string, price: number) => {
    // Ensure valid positive number, minimum 0.01
    const validPrice = isNaN(price) || price <= 0 ? 0.01 : price;
    setCart(cart.map((c) => (c.item.id === itemId ? { ...c, unitPrice: validPrice } : c)));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((c) => c.item.id !== itemId));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.quantity * c.unitPrice, 0);
  const discountAmount = discountType === 'percent'
    ? (subtotal * parseFloat(discount || '0')) / 100
    : parseFloat(discount || '0');
  const grandTotal = Math.max(0, subtotal - discountAmount);
  
  const selectedAccountDetails = accounts.find((a) => String(a.id) === paymentMethod);
  const accountBalance = selectedAccountDetails?.current_balance || 0;

  const requestedPayment = Math.max(0, parseFloat(paymentAmount || '0'));
  const effectivePayment = Math.min(requestedPayment, grandTotal);
  const actualDue = Math.max(0, grandTotal - effectivePayment);

 const handleSubmit = async () => {
  if (!selectedSupplierId) {
    toast({ title: 'Error', description: 'Please select a supplier', variant: 'destructive' });
    return;
  }

  if (cart.length === 0) {
    toast({ title: 'Error', description: 'Please add at least one item', variant: 'destructive' });
    return;
  }

  try {
    const selectedSupplier = suppliers.find(s => String(s.id) === selectedSupplierId);

    const selectedAccountForPayment = accounts.find(
      (a) => String(a.id) === paymentMethod
    );
    const accountBalance = selectedAccountForPayment?.current_balance || 0;

    // ── Bill number validation ────────────────────────────────────────────────
    if (isManualBill && billNumber) {
      const isUnique = await checkInvoiceNumberUnique('purchase', billNumber);
      if (!isUnique) {
        toast({
          title: 'Duplicate Bill Number',
          description: `Bill number "${billNumber}" already exists. Please use a different number.`,
          variant: 'destructive',
        });
        return;
      }
    }

    const purchaseId = `PURCHASE-${Date.now()}`;

    const requestedPaid = Math.max(0, parseFloat(paymentAmount || '0'));
    const finalPaid = Math.min(requestedPaid, grandTotal);
    const finalDue = Math.max(0, grandTotal - finalPaid);

    if (finalPaid > 0 && (!paymentMethod || paymentMethod === 'credit')) {
      toast({
        title: 'Error',
        description: 'Please select an account for payment',
        variant: 'destructive',
      });
      return;
    }

    if (finalPaid > 0 && selectedAccountForPayment && accountBalance < finalPaid) {
      toast({
        title: 'Insufficient Balance',
        description: `Account ${selectedAccountForPayment.account_name} has insufficient balance. Available: PKR ${accountBalance.toLocaleString()}`,
        variant: 'destructive',
      });
      return;
    }

    const paymentStatus =
      finalDue === 0
        ? 'paid'
        : finalPaid > 0
        ? 'partial'
        : 'due';

    /* ================================
       🔹 Purchase Data
    ================================= */

    const purchaseData = {
      id: purchaseId,
      bill_number: isManualBill ? billNumber : '', // backend auto-generates when auto_generate=true
      auto_generate: !isManualBill,

      supplier_id: selectedSupplierId,
      supplier_name: selectedSupplier?.name || '',

      purchase_date: new Date().toISOString().split('T')[0],

      subtotal,
      discount_amount: discountType === 'amount' ? discountAmount : 0,
      discount_percent: discountType === 'percent' ? parseFloat(discount || '0') : 0,

      total_amount: grandTotal,

      paid_amount: finalPaid,
      due_amount: finalDue,

      payment_status: paymentStatus,

      payment_method: finalPaid > 0 ? selectedAccountForPayment?.account_type : undefined,
      account_id: finalPaid > 0 ? paymentMethod : undefined,

      notes: notes || undefined,

      items: cart.map((c, index) => ({
        id: `ITEM-${purchaseId}-${index}`,
        item_id: c.item.id,
        item_name: c.item.name,
        quantity: c.quantity,
        unit_price: c.unitPrice,
        total_price: c.quantity * c.unitPrice,
        unit: c.item.unit,
      })),
    };

    /* ================================
       🔹 Payment Info
    ================================= */

    const paymentInfo =
      finalPaid > 0
        ? {
            amount: finalPaid,
            account_id: paymentMethod,
            method: selectedAccountForPayment?.account_type,
          }
        : undefined;

    const payload: any = {
      ...purchaseData,
    };

    if (paymentInfo) {
      payload.payment = paymentInfo;
    }

    /* ================================
       🔹 API Call
    ================================= */

    await createPurchaseMutation.mutateAsync(payload);

    await refreshAccounts();

    toast({
      title: t('createdSuccessfully'),
      description: `Purchase created. Paid: PKR ${finalPaid.toLocaleString()} | Due: PKR ${finalDue.toLocaleString()}`,
    });

    setTimeout(() => navigate('/purchases'), 500);

  } catch (error) {
    toast({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to create purchase',
      variant: 'destructive',
    });
  }
};

  const selectedSupplier = suppliers.find(s => String(s.id) === selectedSupplierId);

  return (
    <MainLayout title={t('createPurchase')}>
      <div className="space-y-6">
        <PageHeader title={t('createPurchase')}>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back')}
          </Button>
        </PageHeader>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: Items Selection */}
          <div className="xl:col-span-1">
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {t('items')}
                </CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`${t('search')} ${t('items')}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[400px] overflow-y-auto px-4 pb-4">
                  {itemsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-30 animate-pulse" />
                      <p className="text-sm">Loading items...</p>
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">
                        {searchQuery ? `No items found for "${searchQuery}"` : 'No items available'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {filteredItems.map((item) => {
                        const inCart = cart.find((c) => c.item.id === item.id);
                        
                        return (
                          <div
                            key={item.id}
                            onClick={() => addToCart(item)}
                            className={cn(
                              'group flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                              'hover:bg-accent hover:border-primary/50',
                              inCart && 'bg-primary/10 border-primary'
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg relative z-10 group-hover:bg-accent">
                                <Package className="h-4 w-4 text-primary group-hover:text-accent-foreground" />
                              </div>
                              <div className="min-w-0 flex-1 pl-1">
                                <p className="font-medium text-sm truncate whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-accent-foreground">{item.name}</p>
                                <p className="text-xs text-muted-foreground group-hover:text-accent-foreground truncate whitespace-nowrap overflow-hidden text-ellipsis">{item.sku}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 pl-3">
                              <CurrencyDisplay amount={item.purchase_price} className="text-sm font-semibold whitespace-nowrap group-hover:text-accent-foreground" />
                              <p className="text-xs text-muted-foreground group-hover:text-accent-foreground whitespace-nowrap">
                                Stock: {item.stock_quantity}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Cart & Payment */}
          <div className="xl:col-span-2 space-y-6">
            {/* Supplier Selection */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm mb-2 block">{t('selectSupplier')} *</Label>
                    <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder={t('selectSupplier')} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border z-50">
                        {suppliersLoading ? (
                          <div className="p-2 text-center text-sm text-muted-foreground">Loading...</div>
                        ) : suppliers.length === 0 ? (
                          <div className="p-2 text-center text-sm text-muted-foreground">No suppliers found</div>
                        ) : (
                          suppliers.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedSupplier && (
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('currentBalance')}:</span>
                        <CurrencyDisplay amount={Math.max(0, selectedSupplier.current_balance)} className="ml-2 font-semibold" />
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Bill Number ─────────────────────────────────────────── */}
                <div className="mt-4">
                  <Label className="text-sm mb-1.5 block">Bill Number</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={billNumber}
                      onChange={(e) => {
                        setBillNumber(e.target.value);
                        setIsManualBill(true);
                      }}
                      placeholder="Auto-generated"
                      className={cn('flex-1', isManualBill && 'border-amber-500 focus-visible:ring-amber-500')}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title={isManualBill ? 'Switch back to auto-generate' : 'Edit manually'}
                      onClick={() => {
                        if (isManualBill) {
                          setIsManualBill(false);
                          if (billPreview) setBillNumber(billPreview);
                        } else {
                          setIsManualBill(true);
                        }
                      }}
                    >
                      {isManualBill ? <Unlock className="h-4 w-4 text-amber-500" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isManualBill
                      ? '✎ Manual override — click lock icon to revert to auto-generate'
                      : '⟳ Auto-generated from format settings — click unlock to edit'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Items Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  {t('purchaseItems')} ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No items added</p>
                    <p className="text-sm">Click on items from the left panel to add them</p>
                  </div>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow className="bg-table-header hover:bg-table-header">
                          <TableHead className="w-[40%]">{t('item')}</TableHead>
                          <TableHead className="text-center w-[20%]">{t('quantity')}</TableHead>
                          <TableHead className="text-right w-[20%]">{t('price')}</TableHead>
                          <TableHead className="text-right w-[15%]">{t('total')}</TableHead>
                          <TableHead className="w-[5%]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cart.map((cartItem) => (
                          <TableRow key={cartItem.item.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{cartItem.item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {cartItem.item.sku} • {cartItem.item.unit}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(cartItem.item.id, cartItem.quantity - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  value={cartItem.quantity}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => {
                                    const inputValue = e.target.value;
                                    const value = inputValue === '' ? 1 : parseInt(inputValue, 10) || 1;
                                    updateQuantity(cartItem.item.id, value);
                                  }}
                                  className="w-16 h-8 text-center"
                                  min={1}
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(cartItem.item.id, cartItem.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                value={cartItem.unitPrice}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const inputValue = e.target.value;
                                  const value = inputValue === '' ? 0 : parseFloat(inputValue) || 0;
                                  updatePrice(cartItem.item.id, value);
                                }}
                                className="w-24 h-8 text-right ml-auto"
                                min="0.01"
                                step="0.01"
                              />
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              <CurrencyDisplay amount={cartItem.quantity * cartItem.unitPrice} />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => removeFromCart(cartItem.item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Payment Details */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Label className="text-sm w-24">{t('discount')}</Label>
                      <Input
                        type="number"
                        value={discount}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="flex-1"
                        placeholder="0"
                      />
                      <Select value={discountType} onValueChange={(v: 'amount' | 'percent') => setDiscountType(v)}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border z-50">
                          <SelectItem value="amount">PKR</SelectItem>
                          <SelectItem value="percent">%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-3">
                      <Label className="text-sm w-24">{t('paid')}</Label>
                      <Input
                        type="number"
                        value={paymentAmount}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="flex-1"
                        placeholder="0"
                      />
                    </div>

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
                      showCreditOption={false}
                      label="Pay From"
                    />

                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      rows={2}
                    />
                  </div>

                  {/* Right: Totals */}
                  <div className="space-y-3 p-4 bg-secondary/30 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('subtotal')}</span>
                      <CurrencyDisplay amount={subtotal} />
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-destructive">
                        <span>{t('discount')}</span>
                        <span>-<CurrencyDisplay amount={discountAmount} /></span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>{t('grandTotal')}</span>
                      <CurrencyDisplay amount={grandTotal} />
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">{t('paid')}</span>
                      <CurrencyDisplay amount={effectivePayment} className="text-success" />
                    </div>
                    <div className="flex justify-between font-semibold text-destructive">
                      <span>{t('payable')}</span>
                      <CurrencyDisplay amount={actualDue} />
                    </div>

                    <Button
                      onClick={handleSubmit}
                      className="w-full h-12 text-base font-semibold mt-4"
                      disabled={cart.length === 0 || !selectedSupplierId}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {t('createPurchase')}
                    </Button>
                    
                    {selectedAccount && accountBalance < effectivePayment && (
                      <p className="text-xs text-orange-500 text-center mt-2">
                        ⚠️ Account balance: <CurrencyDisplay amount={accountBalance} className="inline" />
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
