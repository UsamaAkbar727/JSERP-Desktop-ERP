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
import type { Item } from '@/types/api';
import type { PaymentMethod } from '@/types/erp';
import { toast } from '@/hooks/use-toast';
import { useActiveItems, useCreateSale } from '@/hooks';
import { useActiveCustomers } from '@/hooks/useCustomers';
import { useAccounts, useRefreshAccounts } from '@/hooks/useAccounts';
import { useInvoiceNumberPreview, checkInvoiceNumberUnique } from '@/hooks/useInvoiceNumberFormat';
import { ArrowLeft, Plus, Minus, Trash2, Search, Package, ShoppingCart, Save, AlertTriangle, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CartItem {
  item: Item;
  quantity: number;
  unitPrice: number;
}

export default function CreateSalePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('customerId');
  const { t } = useLanguage();
  
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId || '');
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

  // Invoice number state (auto-generated but user-editable)
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isManualInvoice, setIsManualInvoice] = useState(false);

  // Fetch real data from database
  const { data: items = [] } = useActiveItems();
  const { data: customers = [], isLoading: customersLoading } = useActiveCustomers();
  const { data: accounts = [] } = useAccounts();
  const createSaleMutation = useCreateSale();
  const refreshAccounts = useRefreshAccounts();

  // Invoice number preview (does NOT change DB counter)
  const { data: invoicePreview } = useInvoiceNumberPreview('sale');

  // Pre-fill invoice number when preview loads (only if not manually set)
  useEffect(() => {
    if (invoicePreview && !isManualInvoice) {
      setInvoiceNumber(invoicePreview);
    }
  }, [invoicePreview, isManualInvoice]);

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
    if (!searchQuery.trim()) return items;
    return items.filter(
      (item) =>
        (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery, items]);

  const addToCart = (item: Item) => {
    const existing = cart.find((c) => c.item.id === item.id);
    const currentQty = existing ? existing.quantity : 0;
    
    if (currentQty >= item.stock_quantity) {
      toast({
        title: 'Out of Stock',
        description: `Only ${item.stock_quantity} ${item.unit}(s) available`,
        variant: 'destructive',
      });
      return;
    }

    if (existing) {
      setCart(cart.map((c) => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { item, quantity: 1, unitPrice: item.sale_price }]);
    }
  };

  const updateQuantity = (itemId: string, newQty: number) => {
    const cartItem = cart.find((c) => c.item.id === itemId);
    if (!cartItem) return;
    
    if (newQty <= 0) {
      setCart(cart.filter((c) => c.item.id !== itemId));
      return;
    }
    
    if (newQty > cartItem.item.stock_quantity) {
      toast({
        title: 'Stock Limit',
        description: `Only ${cartItem.item.stock_quantity} ${cartItem.item.unit}(s) available`,
        variant: 'destructive',
      });
      return;
    }
    
    setCart(cart.map((c) => c.item.id === itemId ? { ...c, quantity: newQty } : c));
  };

  const updatePrice = (itemId: string, price: number) => {
    setCart(cart.map((c) => (c.item.id === itemId ? { ...c, unitPrice: price } : c)));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((c) => c.item.id !== itemId));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.quantity * c.unitPrice, 0);
  const discountAmount = discountType === 'percent'
    ? (subtotal * parseFloat(discount || '0')) / 100
    : parseFloat(discount || '0');
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const payment = parseFloat(paymentAmount || '0');
  const dueAmount = Math.max(0, grandTotal - payment);
  
  // Calculate total profit/loss
  const totalProfit = cart.reduce((sum, c) => {
    const profit = (c.unitPrice - c.item.purchase_price) * c.quantity;
    return sum + profit;
  }, 0);
  
  // Check if any items are sold at a loss
  const hasLossItems = cart.some(c => c.unitPrice < c.item.purchase_price);

  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      toast({ title: 'Error', description: 'Please select a customer', variant: 'destructive' });
      return;
    }

    if (cart.length === 0) {
      toast({ title: 'Error', description: 'Please add at least one item', variant: 'destructive' });
      return;
    }

    if (payment > 0) {
      if (paymentMethod !== 'cheque' && !selectedAccount) {
        toast({ title: 'Error', description: 'Please select a payment account', variant: 'destructive' });
        return;
      }
      if (paymentMethod === 'cheque' && (!chequeNumber || !chequeAccountId)) {
        toast({ title: 'Error', description: 'Please fill cheque details', variant: 'destructive' });
        return;
      }
    }

    try {
      const selectedAccountDetails = accounts.find(acc => acc.id === paymentMethod);
      const resolvedPaymentMethod =
        paymentMethod === 'cheque' || paymentMethod === 'credit'
          ? paymentMethod
          : selectedAccountDetails?.account_type || 'cash';
      const resolvedAccountId = paymentMethod === 'cheque' ? chequeAccountId : paymentMethod;
      const selectedCustomer = customers.find(c => String(c.id) === selectedCustomerId);

      // ── Invoice number validation ────────────────────────────────────────────
      // If the user manually edited the invoice number, validate it's unique.
      // Otherwise the backend will auto-generate it atomically.
      if (isManualInvoice && invoiceNumber) {
        const isUnique = await checkInvoiceNumberUnique('sale', invoiceNumber);
        if (!isUnique) {
          toast({
            title: 'Duplicate Invoice Number',
            description: `Invoice number "${invoiceNumber}" already exists. Please use a different number.`,
            variant: 'destructive',
          });
          return;
        }
      }

      const saleId = `SALE-${Date.now()}`;

      // Prepare sale data matching backend expectations
      const saleData = {
        id: saleId,
        invoice_number: isManualInvoice ? invoiceNumber : '', // backend auto-generates when auto_generate=true
        auto_generate: !isManualInvoice,
        customer_id: selectedCustomerId,
        customer_name: selectedCustomer?.name || '',
        sale_date: new Date().toISOString().split('T')[0],
        subtotal: subtotal,
        discount_amount: discountType === 'amount' ? discountAmount : 0,
        discount_percent: discountType === 'percent' ? parseFloat(discount || '0') : 0,
        total_amount: grandTotal,
        paid_amount: payment,
        due_amount: dueAmount,
        payment_status: (dueAmount === 0 ? 'paid' : payment > 0 ? 'partial' : 'due') as 'paid' | 'partial' | 'due',
        payment_method: payment > 0 ? resolvedPaymentMethod : undefined,
        account_id: payment > 0 && resolvedAccountId ? resolvedAccountId : undefined,
        cheque_account_id: paymentMethod === 'cheque' ? chequeAccountId : undefined,
        notes: notes || undefined,
        items: cart.map((c, index) => ({
          id: `ITEM-${saleId}-${index}`,
          item_id: c.item.id,
          item_name: c.item.name,
          quantity: c.quantity,
          unit_price: c.unitPrice,
          total_price: c.quantity * c.unitPrice,
          unit: c.item.unit,
        })),
      };

      // Add payment info if payment is made
      const paymentInfo = payment > 0 ? {
        amount: payment,
        account_id: selectedAccount,
        method: resolvedPaymentMethod,
      } : undefined;

      // Call API directly with correct structure
      // Don't spread saleData with payment - send them as separate properties
      const createPayload: any = {
        ...saleData,
      };
      
      if (paymentInfo) {
        createPayload.payment = paymentInfo;
      }

     

      await createSaleMutation.mutateAsync(createPayload);

      // Backend automatically updates account balance via PaymentsRepository
      // No manual balance update needed

      // Refresh accounts to show updated balances
      refreshAccounts();

      toast({
        title: t('createdSuccessfully'),
        description: `Sale created for ${selectedCustomer?.name || 'Customer'}. Total: PKR ${grandTotal.toLocaleString()}`,
      });

      // Navigate immediately - mutation's onSuccess already invalidated cache
      navigate('/sales');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create sale',
        variant: 'destructive',
      });
    }
  };

  const selectedCustomer = customers.find(c => String(c.id) === selectedCustomerId);

  return (
    <MainLayout title={t('createSale')}>
      <div className="space-y-6">
        <PageHeader title={t('createSale')}>
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
                  {filteredItems.length === 0 ? (
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
                        const isOutOfStock = item.stock_quantity <= 0;
                        const remainingStock = item.stock_quantity - (inCart?.quantity || 0);
                        
                        return (
                          <div
                            key={item.id}
                            onClick={() => !isOutOfStock && addToCart(item)}
                            className={cn(
                              'group flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                              'hover:bg-accent hover:border-primary/50',
                              inCart && 'bg-primary/10 border-primary',
                              isOutOfStock && 'opacity-50 cursor-not-allowed'
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
                              <CurrencyDisplay amount={item.sale_price} className="text-sm font-semibold whitespace-nowrap group-hover:text-accent-foreground" />
                              <p className={cn(
                                "text-xs whitespace-nowrap group-hover:text-accent-foreground",
                                remainingStock <= 0 ? "text-destructive" : "text-muted-foreground"
                              )}>
                                {remainingStock} {t('left')}
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
            {/* Customer Selection */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm mb-2 block">{t('selectCustomer')} *</Label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder={t('selectCustomer')} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border z-50">
                        {customersLoading ? (
                          <div className="p-2 text-center text-sm text-muted-foreground">Loading...</div>
                        ) : customers.length === 0 ? (
                          <div className="p-2 text-center text-sm text-muted-foreground">No customers found</div>
                        ) : (
                          customers.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedCustomer && (
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('currentBalance')}:</span>
                        <CurrencyDisplay amount={Math.max(0, selectedCustomer.current_balance)} className="ml-2 font-semibold" />
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Invoice Number ─────────────────────────────────────── */}
                <div className="mt-4">
                  <Label className="text-sm mb-1.5 block">Invoice Number</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={invoiceNumber}
                      onChange={(e) => {
                        setInvoiceNumber(e.target.value);
                        setIsManualInvoice(true);
                      }}
                      placeholder="Auto-generated"
                      className={cn('flex-1', isManualInvoice && 'border-amber-500 focus-visible:ring-amber-500')}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title={isManualInvoice ? 'Switch back to auto-generate' : 'Edit manually'}
                      onClick={() => {
                        if (isManualInvoice) {
                          // Revert to auto
                          setIsManualInvoice(false);
                          if (invoicePreview) setInvoiceNumber(invoicePreview);
                        } else {
                          setIsManualInvoice(true);
                        }
                      }}
                    >
                      {isManualInvoice ? <Unlock className="h-4 w-4 text-amber-500" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isManualInvoice
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
                  <ShoppingCart className="h-4 w-4" />
                  {t('cartItems')} ({cart.length})
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
                          <TableHead className="w-[30%]">{t('item')}</TableHead>
                          <TableHead className="text-center w-[15%]">{t('quantity')}</TableHead>
                          <TableHead className="text-right w-[15%]">{t('price')}</TableHead>
                          <TableHead className="text-right w-[15%]">{t('total')}</TableHead>
                          <TableHead className="text-right w-[20%]">Profit/Loss</TableHead>
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
                                  {cartItem.item.sku} • Stock: {cartItem.item.stock_quantity} {cartItem.item.unit}
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
                                    const value = inputValue === '' ? 0 : parseInt(inputValue, 10) || 0;
                                    updateQuantity(cartItem.item.id, value);
                                  }}
                                  className="w-16 h-8 text-center"
                                  min={1}
                                  max={cartItem.item.stock_quantity}
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(cartItem.item.id, cartItem.quantity + 1)}
                                  disabled={cartItem.quantity >= cartItem.item.stock_quantity}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Input
                                  type="number"
                                  value={cartItem.unitPrice}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => {
                                    const inputValue = e.target.value;
                                    const value = inputValue === '' ? 0 : parseFloat(inputValue) || 0;
                                    updatePrice(cartItem.item.id, value);
                                  }}
                                  className={cn(
                                    "w-24 h-8 text-right",
                                    cartItem.unitPrice < cartItem.item.purchase_price && "border-destructive"
                                  )}
                                />
                                {cartItem.unitPrice < cartItem.item.purchase_price && (
                                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              <CurrencyDisplay amount={cartItem.quantity * cartItem.unitPrice} />
                            </TableCell>
                            <TableCell className="text-right">
                              {(() => {
                                const itemProfit = (cartItem.unitPrice - cartItem.item.purchase_price) * cartItem.quantity;
                                const isLoss = itemProfit < 0;
                                return (
                                  <div className="flex flex-col items-end">
                                    <CurrencyDisplay 
                                      amount={Math.abs(itemProfit)} 
                                      className={cn(
                                        "font-semibold",
                                        isLoss ? "text-destructive" : "text-success"
                                      )}
                                    />
                                    <span className={cn(
                                      "text-xs",
                                      isLoss ? "text-destructive" : "text-muted-foreground"
                                    )}>
                                      {isLoss ? 'Loss' : 'Profit'}
                                    </span>
                                  </div>
                                );
                              })()}
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
                      <div className="flex-1 flex gap-2">
                        <Input
                          type="number"
                          value={paymentAmount}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="flex-1"
                          placeholder="0"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setPaymentAmount(grandTotal.toString())}
                          title="Fill full amount"
                        >
                          Full
                        </Button>
                      </div>
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
                      label="Receive Into"
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
                      <span className="text-muted-foreground">Total Profit/Loss</span>
                      <CurrencyDisplay 
                        amount={Math.abs(totalProfit)} 
                        className={cn(
                          "font-semibold",
                          totalProfit < 0 ? "text-destructive" : "text-success"
                        )}
                      />
                    </div>
                    {hasLossItems && (
                      <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>Warning: Some items are being sold below cost</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">{t('paid')}</span>
                      <CurrencyDisplay amount={payment} className="text-success" />
                    </div>
                    <div className="flex justify-between font-semibold text-warning">
                      <span>{t('due')}</span>
                      <CurrencyDisplay amount={dueAmount} />
                    </div>

                    <Button
                      onClick={handleSubmit}
                      className="w-full h-12 text-base font-semibold mt-4"
                      disabled={cart.length === 0 || createSaleMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {t('createSale')} - <CurrencyDisplay amount={grandTotal} className="ml-1" />
                    </Button>
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
