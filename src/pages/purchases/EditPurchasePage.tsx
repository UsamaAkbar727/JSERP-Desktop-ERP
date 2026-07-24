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
import { PaymentMethod } from '@/types/erp';
import { Item } from '@/types/api';
import { toast } from '@/hooks/use-toast';
import { useActiveItems } from '@/hooks/useItems';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useAccounts, useRefreshAccounts } from '@/hooks/useAccounts';
import { useUpdatePurchase, usePurchaseWithItems } from '@/hooks/usePurchases';
import { checkInvoiceNumberUnique } from '@/hooks/useInvoiceNumberFormat';
import { ArrowLeft, Plus, Minus, Trash2, Search, Package, Receipt, Save, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface CartItem {
  item: Item;
  quantity: number;
  unitPrice: number;
}

export default function EditPurchasePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const refreshAccounts = useRefreshAccounts();

  const { data: items = [], isLoading: itemsLoading } = useActiveItems();
  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers({ status: 'active' });
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: purchaseData, isLoading: purchaseLoading, error } = usePurchaseWithItems(id!, !!id);
  const updatePurchaseMutation = useUpdatePurchase();

  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState('0');
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [chequeAccountId, setChequeAccountId] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [isManualBill, setIsManualBill] = useState(false);

  // Load existing purchase data when component mounts
  useEffect(() => {
    if (purchaseData && items.length > 0) {
      // Set basic form values
      setSelectedSupplierId(purchaseData.supplier_id || '');
      setBillNumber(purchaseData.bill_number || '');
      setDiscount(purchaseData.discount_amount?.toString() || '0');
      setDiscountType(purchaseData.discount_percent > 0 ? 'percent' : 'amount');
      setPaymentAmount(purchaseData.paid_amount?.toString() || '0');
      setPaymentMethod(purchaseData.account_id || '');
      setSelectedAccount(purchaseData.account_id || '');
      // setChequeAccountId(purchaseData.cheque_account_id || ''); // Field doesn't exist
      setNotes(purchaseData.notes || '');

      // Convert purchase items to cart items
      const cartItems: CartItem[] = [];
      if (purchaseData.items) {
        for (const purchaseItem of purchaseData.items) {
          const item = items.find(i => i.id === purchaseItem.item_id);
          if (item) {
            cartItems.push({
              item,
              quantity: purchaseItem.quantity,
              unitPrice: purchaseItem.unit_price,
            });
          }
        }
      }
      setCart(cartItems);
    }
  }, [purchaseData, items]);

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
      removeFromCart(itemId);
      return;
    }
    
    setCart(cart.map((c) => 
      c.item.id === itemId ? { ...c, quantity: newQty } : c
    ));
  };

  const updatePrice = (itemId: string, newPrice: number) => {
    if (isNaN(newPrice) || newPrice < 0) return;
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

  const grandTotal = subtotal - discountAmount;
  const payment = parseFloat(paymentAmount) || 0;
  const dueAmount = grandTotal - payment;

  const handleUpdatePurchase = async () => {
    if (!selectedSupplierId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a supplier',
        variant: 'destructive',
      });
      return;
    }

    if (!billNumber.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Bill number is required',
        variant: 'destructive',
      });
      return;
    }

    // Check if bill number was changed and validate uniqueness
    if (billNumber !== purchaseData?.bill_number) {
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

    if (cart.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one item to the purchase',
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
      const selectedSupplier = suppliers.find(s => String(s.id) === selectedSupplierId);
      
      if (!selectedSupplier) {
        throw new Error('Selected supplier not found');
      }

      const resolvedPaymentMethod: PaymentMethod = paymentMethod === 'cash' ? 'cash' 
        : paymentMethod === 'cheque' ? 'cheque' 
        : accounts.find(a => String(a.id) === paymentMethod)?.account_type === 'bank' ? 'bank' 
        : 'cash';

      const finalDue = dueAmount;
      const finalPaid = payment;
      
      const paymentStatus = finalDue <= 0 ? 'paid' : finalPaid > 0 ? 'partial' : 'due';

      const updateData = {
        bill_number: billNumber,
        supplier_id: selectedSupplierId,
        supplier_name: selectedSupplier.name,
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
        // Note: For simplicity, we're only updating the purchase header, not items
        // In a real application, you might want to handle item updates as well
      };

      await updatePurchaseMutation.mutateAsync({
        id: id!,
        data: updateData,
      });

      // Refresh accounts to show updated balances
      refreshAccounts();

      toast({
        title: t('updatedSuccessfully'),
        description: `Purchase updated for ${selectedSupplier?.name || 'Supplier'}. Total: PKR ${grandTotal.toLocaleString()}`,
      });

      // Navigate back to purchases list
      navigate('/purchases');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update purchase',
        variant: 'destructive',
      });
    }
  };

  // Loading state
  if (purchaseLoading) {
    return (
      <MainLayout title={t('editPurchase')}>
        <div className="space-y-6">
          <PageHeader title={t('editPurchase')}>
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
  if (error || !purchaseData) {
    return (
      <MainLayout title={t('editPurchase')}>
        <div className="flex flex-col items-center justify-center h-96">
          <h2 className="text-xl font-semibold mb-2">Purchase Not Found</h2>
          <p className="text-muted-foreground mb-4">The purchase you're trying to edit doesn't exist.</p>
          <Button onClick={() => navigate('/purchases')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchases
          </Button>
        </div>
      </MainLayout>
    );
  }

  const selectedSupplier = suppliers.find(s => String(s.id) === selectedSupplierId);

  return (
    <MainLayout title={t('editPurchase')}>
      <div className="space-y-6">
        <PageHeader title={`${t('editPurchase')} - ${purchaseData.bill_number}`}>
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
                            <span className="text-xs font-medium text-primary">
                              <CurrencyDisplay amount={item.purchase_price} />
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

          {/* Right: Purchase Form */}
          <div className="xl:col-span-2 space-y-6">
            {/* Supplier Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('purchaseDetails')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('supplier')} *</Label>
                    <Select 
                      value={selectedSupplierId} 
                      onValueChange={setSelectedSupplierId}
                      disabled={suppliersLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectSupplier')} />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={String(supplier.id)}>
                            {supplier.name}
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

                {/* Bill Number */}
                <div className="mt-4">
                  <Label className="text-sm mb-1.5 block">Bill Number</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={billNumber}
                      onChange={(e) => {
                        setBillNumber(e.target.value);
                        setIsManualBill(true);
                      }}
                      disabled={!isManualBill}
                      placeholder="Bill number"
                      className={cn('flex-1', isManualBill && 'border-amber-500 focus-visible:ring-amber-500')}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title={isManualBill ? 'Lock to prevent changes' : 'Unlock to edit'}
                      onClick={() => {
                        setIsManualBill(!isManualBill);
                        if (isManualBill && purchaseData) {
                          // Reset to original if locking
                          setBillNumber(purchaseData.bill_number || '');
                        }
                      }}
                    >
                      {isManualBill ? <Unlock className="h-4 w-4 text-amber-500" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isManualBill
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
                                    const value = inputValue === '' ? 0 : parseInt(inputValue, 10) || 0;
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
                        onClick={handleUpdatePurchase} 
                        className="w-full" 
                        size="lg"
                        disabled={cart.length === 0 || !selectedSupplierId || updatePurchaseMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {updatePurchaseMutation.isPending ? t('updating') : t('updatePurchase')}
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