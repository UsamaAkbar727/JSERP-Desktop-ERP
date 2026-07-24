import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { useActiveItems } from '@/hooks';
import { useActiveCustomers } from '@/hooks/useCustomers';
import { useAccounts, useRefreshAccounts } from '@/hooks/useAccounts';
import { useUpdateSale, useSaleWithItems } from '@/hooks/useSales';
import { checkInvoiceNumberUnique } from '@/hooks/useInvoiceNumberFormat';
import { ArrowLeft, Plus, Minus, Trash2, Search, Package, ShoppingCart, Save, AlertTriangle, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface CartItem {
  item: Item;
  quantity: number;
  unitPrice: number;
}

export default function EditSalePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [discount, setDiscount] = useState('0');
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [chequeAccountId, setChequeAccountId] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isManualInvoice, setIsManualInvoice] = useState(false);

  // Fetch real data from database
  const { data: items = [] } = useActiveItems();
  const { data: customers = [], isLoading: customersLoading } = useActiveCustomers();
  const { data: accounts = [] } = useAccounts();
  const { data: saleData, isLoading: saleLoading, error } = useSaleWithItems(id!, !!id);
  const updateSaleMutation = useUpdateSale();
  const refreshAccounts = useRefreshAccounts();

  // Load existing sale data when component mounts
  useEffect(() => {
    if (saleData && items.length > 0) {
      // Set basic form values
      setSelectedCustomerId(saleData.customer_id || '');
      setInvoiceNumber(saleData.invoice_number || '');
      setDiscount(saleData.discount_amount?.toString() || '0');
      setDiscountType(saleData.discount_percent > 0 ? 'percent' : 'amount');
      setPaymentAmount(saleData.paid_amount?.toString() || '0');
      setPaymentMethod(saleData.account_id || '');
      setSelectedAccount(saleData.account_id || '');
      setChequeAccountId(saleData.cheque_account_id || '');
      setNotes(saleData.notes || '');

      // Convert sale items to cart items
      const cartItems: CartItem[] = [];
      if (saleData.items) {
        for (const saleItem of saleData.items) {
          const item = items.find(i => i.id === saleItem.item_id);
          if (item) {
            cartItems.push({
              item,
              quantity: saleItem.quantity,
              unitPrice: saleItem.unit_price,
            });
          }
        }
      }
      setCart(cartItems);
    }
  }, [saleData, items]);

  useEffect(() => {
    // Set default account to first available account if none selected
    if (!paymentMethod && accounts.length > 0) {
      const firstAccount = accounts.find((a) => a.status === 'active');
      if (firstAccount) {
        setPaymentMethod(String(firstAccount.id));
        setSelectedAccount(String(firstAccount.id));
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
      setCart(cart.map((c) => 
        c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart([...cart, { item, quantity: 1, unitPrice: item.sale_price }]);
    }
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(cart.filter((c) => c.item.id !== itemId));
      return;
    }

    const item = cart.find((c) => c.item.id === itemId);
    if (item && newQuantity > item.item.stock_quantity) {
      toast({
        title: 'Stock Limit',
        description: `Only ${item.item.stock_quantity} ${item.item.unit}(s) available`,
        variant: 'destructive',
      });
      return;
    }

    setCart(cart.map((c) => 
      c.item.id === itemId ? { ...c, quantity: newQuantity } : c
    ));
  };

  const updatePrice = (itemId: string, newPrice: number) => {
    setCart(cart.map((c) => 
      c.item.id === itemId ? { ...c, unitPrice: newPrice } : c
    ));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((c) => c.item.id !== itemId));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  
  const discountAmount = useMemo(() => {
    const discountValue = parseFloat(discount) || 0;
    if (discountType === 'percent') {
      return (subtotal * discountValue) / 100;
    }
    return discountValue;
  }, [discount, discountType, subtotal]);

  const grandTotal = Math.max(0, subtotal - discountAmount);
  const payment = parseFloat(paymentAmount) || 0;
  
  // Calculate total profit/loss
  const totalProfit = cart.reduce((sum, c) => {
    const profit = (c.unitPrice - c.item.purchase_price) * c.quantity;
    return sum + profit;
  }, 0);
  
  // Check if any items are sold at a loss
  const hasLossItems = cart.some(c => c.unitPrice < c.item.purchase_price);
  const dueAmount = Math.max(0, grandTotal - payment);

  const handleUpdateSale = async () => {
    if (!selectedCustomerId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a customer',
        variant: 'destructive',
      });
      return;
    }

    if (!invoiceNumber.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Invoice number is required',
        variant: 'destructive',
      });
      return;
    }

    // Check if invoice number was changed and validate uniqueness
    if (invoiceNumber !== saleData?.invoice_number) {
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

    if (cart.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one item to the cart',
        variant: 'destructive',
      });
      return;
    }

    if (!paymentMethod && payment > 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select a payment method for the payment amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      const selectedCustomer = customers.find(c => String(c.id) === selectedCustomerId);
      
      if (!selectedCustomer) {
        throw new Error('Selected customer not found');
      }
      const resolvedPaymentMethod: PaymentMethod = paymentMethod === 'cash' ? 'cash' 
        : paymentMethod === 'cheque' ? 'cheque' 
        : accounts.find(a => String(a.id) === paymentMethod)?.account_type === 'bank' ? 'bank' 
        : 'cash';

      const finalDue = dueAmount;
      const finalPaid = payment;
      
      const paymentStatus = finalDue <= 0 ? 'paid' : finalPaid > 0 ? 'partial' : 'due';

      const updateData = {
        invoice_number: invoiceNumber,
        customer_id: selectedCustomerId,
        customer_name: selectedCustomer.name,
        subtotal,
        discount_amount: discountAmount,
        discount_percent: discountType === 'percent' ? parseFloat(discount) || 0 : 0,
        total_amount: grandTotal,
        paid_amount: finalPaid,
        due_amount: finalDue,
        payment_status: paymentStatus as 'paid' | 'partial' | 'due',
        payment_method: resolvedPaymentMethod,
        account_id: paymentMethod === 'cash' ? null : paymentMethod,
        cheque_account_id: resolvedPaymentMethod === 'cheque' ? chequeAccountId || null : null,
        notes,
        items: cart.map((c, index) => ({
          id: `SI-${id}-${c.item.id}-${index}`,
          item_id: String(c.item.id),
          item_name: c.item.name,
          quantity: c.quantity,
          unit_price: c.unitPrice,
          total_price: c.quantity * c.unitPrice,
          unit: c.item.unit,
          purchase_price: c.item.purchase_price,
          profit: (c.unitPrice - c.item.purchase_price) * c.quantity,
        })),
      };

      const update=await updateSaleMutation.mutateAsync({
        id: id!,
        data: updateData,
      });
    
      // Refresh accounts to show updated balances
      refreshAccounts();

      toast({
        title: t('updatedSuccessfully'),
        description: `Sale updated for ${selectedCustomer?.name || 'Customer'}. Total: PKR ${grandTotal.toLocaleString()}`,
      });

      // Navigate back to sales list
      navigate('/sales');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update sale',
        variant: 'destructive',
      });
    }
  };

  // Loading state
  if (saleLoading) {
    return (
      <MainLayout title={t('editSale')}>
        <div className="space-y-6">
          <PageHeader title={t('editSale')}>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('back')}
            </Button>
          </PageHeader>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="space-y-4">
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="xl:col-span-2 space-y-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (error || !saleData) {
    return (
      <MainLayout title={t('editSale')}>
        <div className="flex flex-col items-center justify-center h-96">
          <h2 className="text-xl font-semibold mb-2">Sale Not Found</h2>
          <p className="text-muted-foreground mb-4">The sale you're trying to edit doesn't exist.</p>
          <Button onClick={() => navigate('/sales')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sales
          </Button>
        </div>
      </MainLayout>
    );
  }

  const selectedCustomer = customers.find(c => String(c.id) === selectedCustomerId);

  return (
    <MainLayout title={t('editSale')}>
      <div className="space-y-6">
        <PageHeader title={`${t('editSale')} - ${saleData.invoice_number}`}>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back')}
          </Button>
        </PageHeader>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: Items Selection */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('addItems')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder={t('searchItems')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => addToCart(item)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.sku}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs">
                              Stock: {item.stock_quantity} {item.unit}
                            </span>
                            <span className="text-xs font-medium text-success">
                              <CurrencyDisplay amount={item.sale_price} />
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(item);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredItems.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No items found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Sale Form */}
          <div className="xl:col-span-2 space-y-6">
            {/* Customer Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('saleDetails')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('customer')} *</Label>
                    <Select 
                      value={selectedCustomerId} 
                      onValueChange={setSelectedCustomerId}
                      disabled={customersLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectCustomer')} />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={String(customer.id)}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('notes')}</Label>
                    <Textarea
                      placeholder={t('addNotes')}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={1}
                    />
                  </div>
                </div>

                {/* Invoice Number */}
                <div className="mt-4">
                  <Label className="text-sm mb-1.5 block">Invoice Number</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={invoiceNumber}
                      onChange={(e) => {
                        setInvoiceNumber(e.target.value);
                        setIsManualInvoice(true);
                      }}
                      disabled={!isManualInvoice}
                      placeholder="Invoice number"
                      className={cn('flex-1', isManualInvoice && 'border-amber-500 focus-visible:ring-amber-500')}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title={isManualInvoice ? 'Lock to prevent changes' : 'Unlock to edit'}
                      onClick={() => {
                        setIsManualInvoice(!isManualInvoice);
                        if (isManualInvoice && saleData) {
                          // Reset to original if locking
                          setInvoiceNumber(saleData.invoice_number || '');
                        }
                      }}
                    >
                      {isManualInvoice ? <Unlock className="h-4 w-4 text-amber-500" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isManualInvoice
                      ? '✎ Editing mode — click lock icon to revert changes'
                      : '🔒 Locked — click unlock to edit'}
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
                        <SelectContent>
                          <SelectItem value="amount">PKR</SelectItem>
                          <SelectItem value="percent">%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-3">
                      <Label className="text-sm w-24">{t('payment')}</Label>
                      <Input
                        type="number"
                        value={paymentAmount}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="flex-1"
                        placeholder="0"
                      />
                    </div>

                    {payment > 0 && (
                      <div className="space-y-3">
                        <PaymentMethodSelector
                          paymentMethod={paymentMethod}
                          onPaymentMethodChange={setPaymentMethod}
                          selectedAccount={selectedAccount}
                          onAccountChange={setSelectedAccount}
                          chequeAccountId={chequeAccountId}
                          onChequeAccountChange={setChequeAccountId}
                          chequeNumber={chequeNumber}
                          onChequeNumberChange={setChequeNumber}
                        />
                      </div>
                    )}
                  </div>

                  {/* Right: Summary */}
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('subtotal')}</span>
                      <CurrencyDisplay amount={subtotal} />
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>{t('discount')}</span>
                        <span>-<CurrencyDisplay amount={discountAmount} /></span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-semibold border-t pt-2">
                      <span>{t('total')}</span>
                      <CurrencyDisplay amount={grandTotal} />
                    </div>
                    <div className="flex justify-between border-t pt-2">
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
                    {payment > 0 && (
                      <>
                        <div className="flex justify-between text-success">
                          <span>{t('paying')}</span>
                          <CurrencyDisplay amount={payment} />
                        </div>
                        <div className="flex justify-between text-warning font-semibold">
                          <span>{t('due')}</span>
                          <CurrencyDisplay amount={Math.max(0, dueAmount)} />
                        </div>
                      </>
                    )}

                    <div className="pt-4">
                      <Button 
                        onClick={handleUpdateSale} 
                        className="w-full" 
                        size="lg"
                        disabled={cart.length === 0 || !selectedCustomerId || updateSaleMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {updateSaleMutation.isPending ? t('updating') : t('updateSale')}
                      </Button>
                    </div>
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
