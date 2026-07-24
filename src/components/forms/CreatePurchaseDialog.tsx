import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { PaymentMethodSelector } from '@/components/forms/PaymentMethodSelector';
import { Supplier, Item, PaymentMethod } from '@/types/erp';
import { useAccounts } from '@/hooks';
import { toast } from '@/hooks/use-toast';
import { Plus, Minus, Trash2, Search, Package, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CartItem {
  item: Item;
  quantity: number;
  unitPrice: number;
}

interface CreatePurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier;
  onPurchaseCreated: () => void;
}

export function CreatePurchaseDialog({
  open,
  onOpenChange,
  supplier,
  onPurchaseCreated,
}: CreatePurchaseDialogProps) {
  const { t } = useLanguage();
  const { data: accounts = [] } = useAccounts({ status: 'active' });
  const [selectedSupplierId, setSelectedSupplierId] = useState(supplier?.id || '');
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

  // Set default account based on available accounts
  useEffect(() => {
    if (!paymentMethod && accounts.length > 0) {
      const firstAccount = accounts.find((a) => a.status === 'active');
      if (firstAccount) {
        setPaymentMethod(String(firstAccount.id));
        setSelectedAccount(String(firstAccount.id)); // Keep for backward compatibility
      }
    }
  }, [paymentMethod, accounts]);

  // Set supplier when prop changes
  useEffect(() => {
    if (supplier) {
      setSelectedSupplierId(supplier.id);
    }
  }, [supplier]);

  const filteredItems = useMemo(() => {
    return []; // Items will come from backend API calls
  }, [searchQuery]);

  const addToCart = (item: Item) => {
    const existing = cart.find((c) => c.item.id === item.id);
    if (existing) {
      setCart(
        cart.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      setCart([...cart, { item, quantity: 1, unitPrice: item.purchasePrice }]);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(
      cart
        .map((c) => {
          if (c.item.id === itemId) {
            const newQty = Math.max(0, c.quantity + delta);
            return { ...c, quantity: newQty };
          }
          return c;
        })
        .filter((c) => c.quantity > 0)
    );
  };

  const updatePrice = (itemId: string, price: number) => {
    setCart(
      cart.map((c) => (c.item.id === itemId ? { ...c, unitPrice: price } : c))
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((c) => c.item.id !== itemId));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.quantity * c.unitPrice, 0);
  const discountAmount =
    discountType === 'percent'
      ? (subtotal * parseFloat(discount || '0')) / 100
      : parseFloat(discount || '0');
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const payment = parseFloat(paymentAmount || '0');
  const dueAmount = Math.max(0, grandTotal - payment);

  const resetForm = () => {
    setCart([]);
    setDiscount('0');
    setPaymentAmount('');
    setPaymentMethod(''); // Will be set automatically by useEffect
    setSelectedAccount('');
    setChequeAccountId('');
    setChequeNumber('');
    setNotes('');
    if (!supplier) {
      setSelectedSupplierId('');
    }
  };

  const handleSubmit = () => {
    if (!selectedSupplierId) {
      toast({
        title: 'Error',
        description: 'Please select a supplier',
        variant: 'destructive',
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one item',
        variant: 'destructive',
      });
      return;
    }

    if (payment > 0) {
      const selectedAccountDetails = accounts.find(acc => acc.id === paymentMethod);
      if (!paymentMethod || !selectedAccountDetails) {
        toast({
          title: 'Error',
          description: 'Please select a payment account',
          variant: 'destructive',
        });
        return;
      }
      if (selectedAccountDetails.account_type === 'cheque' && (!chequeNumber || !chequeAccountId)) {
        toast({
          title: 'Error',
          description: 'Please fill cheque details',
          variant: 'destructive',
        });
        return;
      }
    }

    // TODO: Implement backend supplier lookup
    const selectedSupplier = { id: selectedSupplierId, name: 'Supplier' };
    
    // In a real app, this would:
    // 1. Create purchase record
    // 2. Increase stock quantities for each item
    // 3. Update supplier balance
    // 4. Record payment if any
    toast({
      title: t('createdSuccessfully'),
      description: `Purchase created for ${selectedSupplier?.name}. Total: PKR ${grandTotal.toLocaleString()}`,
    });

    onPurchaseCreated();
    onOpenChange(false);
    resetForm();
  };

  // TODO: Implement backend supplier lookup
  const selectedSupplier = { id: selectedSupplierId, name: 'Supplier' };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="bg-card max-w-5xl max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            {t('createPurchase')} {selectedSupplier ? `- ${selectedSupplier.name}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[70vh]">
          {/* Left: Cart */}
          <div className="w-[420px] flex flex-col bg-secondary/30 border-r border-border">
            {/* Supplier Selection */}
            {!supplier && (
              <div className="p-4 border-b border-border">
                <Label className="text-sm mb-2 block">{t('selectSupplier')} *</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t('selectSupplier')} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    {/* TODO: Implement suppliers list from backend */ []?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Cart Items */}
            <div className="flex-1 overflow-auto">
              <div className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Items ({cart.length})
                </h3>

                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No items added</p>
                    <p className="text-xs">Click on items to add</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((cartItem) => (
                      <div
                        key={cartItem.item.id}
                        className="bg-card rounded-lg p-3 border border-border"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {cartItem.item.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{cartItem.item.unit}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(cartItem.item.id, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-medium">
                                {cartItem.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(cartItem.item.id, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <span className="text-xs text-muted-foreground">×</span>
                              <Input
                                type="number"
                                value={cartItem.unitPrice}
                                onChange={(e) =>
                                  updatePrice(cartItem.item.id, parseFloat(e.target.value) || 0)
                                }
                                className="w-20 h-7 text-xs input-currency"
                              />
                            </div>
                          </div>
                          <div className="text-right">
                            <CurrencyDisplay
                              amount={cartItem.quantity * cartItem.unitPrice}
                              className="font-semibold text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive mt-1"
                              onClick={() => removeFromCart(cartItem.item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Totals & Payment */}
            <div className="border-t border-border bg-card p-4 space-y-3">
              {/* Discount */}
              <div className="flex items-center gap-2">
                <Label className="text-sm w-20">{t('discount')}</Label>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="flex-1 h-8 text-sm"
                  placeholder="0"
                />
                <Select value={discountType} onValueChange={(v: 'amount' | 'percent') => setDiscountType(v)}>
                  <SelectTrigger className="w-20 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    <SelectItem value="amount">PKR</SelectItem>
                    <SelectItem value="percent">%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Totals */}
              <div className="space-y-1 text-sm">
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
                <div className="flex justify-between font-bold text-base pt-1 border-t">
                  <span>{t('grandTotal')}</span>
                  <CurrencyDisplay amount={grandTotal} />
                </div>
              </div>

              {/* Payment Amount */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Label className="text-sm w-20">{t('paid')}</Label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="flex-1 h-8 text-sm input-currency"
                    placeholder="0"
                  />
                </div>
                
                {/* Payment Method - Always show for payable account selection */}
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
                
                <div className="flex justify-between font-semibold text-destructive">
                  <span>{t('payable')}</span>
                  <CurrencyDisplay amount={dueAmount} />
                </div>
              </div>

              {/* Notes */}
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                rows={2}
                className="text-sm"
              />

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                className="w-full h-11 text-base font-semibold"
                disabled={cart.length === 0 || !selectedSupplierId}
              >
                {t('createPurchase')} - <CurrencyDisplay amount={grandTotal} className="ml-1" />
              </Button>
            </div>
          </div>

          {/* Right: Items Selection */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredItems.map((item) => {
                  const inCart = cart.find((c) => c.item.id === item.id);
                  
                  return (
                    <div
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className={cn(
                        'pos-item-card cursor-pointer',
                        inCart && 'selected'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.sku}</p>
                          <div className="flex items-center justify-between mt-1">
                            <CurrencyDisplay amount={item.purchasePrice} className="text-sm font-semibold" />
                            <span className="text-xs text-muted-foreground">
                              Stock: {item.stockQuantity}
                            </span>
                          </div>
                        </div>
                      </div>
                      {inCart && (
                        <div className="mt-2 text-xs text-primary font-medium">
                          In cart: {inCart.quantity}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
