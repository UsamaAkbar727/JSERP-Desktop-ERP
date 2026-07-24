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
import { Customer, Item } from '@/types/erp';
import { useAccounts } from '@/hooks';
import { toast } from '@/hooks/use-toast';
import { Plus, Minus, Trash2, Search, Package, ShoppingCart, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CartItem {
  item: Item;
  quantity: number;
  unitPrice: number;
}

interface CreateSaleDialogStandaloneProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  onSaleCreated: () => void;
}

export function CreateSaleDialogStandalone({
  open,
  onOpenChange,
  customer,
  onSaleCreated,
}: CreateSaleDialogStandaloneProps) {
  const { t } = useLanguage();
  const { data: accounts = [] } = useAccounts({ status: 'active' });
  const [selectedCustomerId, setSelectedCustomerId] = useState(customer?.id || 'walk-in');
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

  // Set default account to first active account if none selected
  useEffect(() => {
    if (!paymentMethod && accounts.length > 0) {
      const firstAccount = accounts.find((a) => a.status === 'active');
      if (firstAccount) {
        setPaymentMethod(String(firstAccount.id));
        setSelectedAccount(String(firstAccount.id));
      }
    }
  }, [paymentMethod, accounts]);

  // Set customer when prop changes
  useEffect(() => {
    if (customer) {
      setSelectedCustomerId(customer.id);
    }
  }, [customer]);

  const filteredItems = useMemo(() => {
    return []; // Items will come from backend API calls
  }, [searchQuery]);

  const addToCart = (item: Item) => {
    const existing = cart.find((c) => c.item.id === item.id);
    const currentQty = existing ? existing.quantity : 0;
    
    // Check stock availability
    if (currentQty >= item.stockQuantity) {
      toast({
        title: 'Out of Stock',
        description: `Only ${item.stockQuantity} ${item.unit}(s) available`,
        variant: 'destructive',
      });
      return;
    }

    if (existing) {
      setCart(
        cart.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      setCart([...cart, { item, quantity: 1, unitPrice: item.salePrice }]);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(
      cart
        .map((c) => {
          if (c.item.id === itemId) {
            const newQty = Math.max(0, c.quantity + delta);
            if (newQty > c.item.stockQuantity) {
              toast({
                title: 'Stock Limit',
                description: `Only ${c.item.stockQuantity} ${c.item.unit}(s) available`,
                variant: 'destructive',
              });
              return c;
            }
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
  
  // Calculate total profit/loss
  const totalProfit = cart.reduce((sum, c) => {
    const profit = (c.unitPrice - c.item.purchasePrice) * c.quantity;
    return sum + profit;
  }, 0);
  
  // Check if any items are sold at a loss
  const hasLossItems = cart.some(c => c.unitPrice < c.item.purchasePrice);

  const resetForm = () => {
    setCart([]);
    setDiscount('0');
    setPaymentAmount('');
    setPaymentMethod('');
    setSelectedAccount('');
    setChequeAccountId('');
    setChequeNumber('');
    setNotes('');
    if (!customer) {
      setSelectedCustomerId('walk-in');
    }
  };

  const handleSubmit = () => {
    if (!selectedCustomerId) {
      toast({
        title: 'Error',
        description: 'Please select a customer',
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
      if (paymentMethod !== 'cheque' && !selectedAccount) {
        toast({
          title: 'Error',
          description: 'Please select a payment account',
          variant: 'destructive',
        });
        return;
      }
      if (paymentMethod === 'cheque' && (!chequeNumber || !chequeAccountId)) {
        toast({
          title: 'Error',
          description: 'Please fill cheque details',
          variant: 'destructive',
        });
        return;
      }
    }

    // TODO: Implement backend customer lookup
    const selectedCustomer = { id: selectedCustomerId, name: 'Customer' };
    
    toast({
      title: t('createdSuccessfully'),
      description: `Sale created for ${selectedCustomer?.name}. Total: PKR ${grandTotal.toLocaleString()}`,
    });

    onSaleCreated();
    onOpenChange(false);
    resetForm();
  };

  // TODO: Implement backend customer lookup
  const selectedCustomer = { id: selectedCustomerId, name: 'Customer' };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="bg-card max-w-5xl max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            {t('createSale')} {selectedCustomer ? `- ${selectedCustomer.name}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[70vh]">
          {/* Left: Cart */}
          <div className="w-[420px] flex flex-col bg-secondary/30 border-r border-border">
            {/* Customer Selection */}
            {!customer && (
              <div className="p-4 border-b border-border">
                <Label className="text-sm mb-2 block">{t('selectCustomer')} *</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t('selectCustomer')} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    {/* TODO: Implement customers list from backend */ []?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
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
                  <ShoppingCart className="h-4 w-4" />
                  Cart ({cart.length} items)
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
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={cartItem.unitPrice}
                                  onChange={(e) =>
                                    updatePrice(cartItem.item.id, parseFloat(e.target.value) || 0)
                                  }
                                  className={cn(
                                    "w-20 h-7 text-xs input-currency",
                                    cartItem.unitPrice < cartItem.item.purchasePrice && "border-destructive"
                                  )}
                                />
                                {cartItem.unitPrice < cartItem.item.purchasePrice && (
                                  <AlertTriangle className="h-3 w-3 text-destructive" />
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <CurrencyDisplay
                              amount={cartItem.quantity * cartItem.unitPrice}
                              className="font-semibold text-sm"
                            />
                            {(() => {
                              const itemProfit = (cartItem.unitPrice - cartItem.item.purchasePrice) * cartItem.quantity;
                              const isLoss = itemProfit < 0;
                              return (
                                <div className={cn(
                                  "text-xs mt-0.5",
                                  isLoss ? "text-destructive" : "text-success"
                                )}>
                                  {isLoss ? 'Loss' : 'Profit'}: {Math.abs(itemProfit).toFixed(0)}
                                </div>
                              );
                            })()}
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
                <div className="flex justify-between pt-1 border-t">
                  <span className="text-muted-foreground">Profit/Loss</span>
                  <CurrencyDisplay 
                    amount={Math.abs(totalProfit)} 
                    className={cn(
                      "font-semibold",
                      totalProfit < 0 ? "text-destructive" : "text-success"
                    )}
                  />
                </div>
                {hasLossItems && (
                  <div className="flex items-center gap-1 p-1.5 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    <span>Some items sold below cost</span>
                  </div>
                )}
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
                
                {parseFloat(paymentAmount || '0') > 0 && (
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
                )}
                
                <div className="flex justify-between font-semibold text-warning">
                  <span>{t('due')}</span>
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
                disabled={cart.length === 0 || !selectedCustomerId}
              >
                {t('createSale')} - <CurrencyDisplay amount={grandTotal} className="ml-1" />
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
                  const isOutOfStock = item.stockQuantity <= 0;
                  const isLowStock = item.stockQuantity <= item.lowStockThreshold && item.stockQuantity > 0;
                  const remainingStock = item.stockQuantity - (inCart?.quantity || 0);
                  
                  return (
                    <div
                      key={item.id}
                      onClick={() => !isOutOfStock && addToCart(item)}
                      className={cn(
                        'pos-item-card',
                        inCart && 'selected',
                        isOutOfStock && 'opacity-50 cursor-not-allowed'
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
                            <CurrencyDisplay amount={item.salePrice} className="text-sm font-semibold" />
                            <span className={cn(
                              "text-xs px-1.5 py-0.5 rounded",
                              isOutOfStock && "bg-destructive/10 text-destructive",
                              isLowStock && "bg-warning/10 text-warning",
                              !isOutOfStock && !isLowStock && "text-muted-foreground"
                            )}>
                              {remainingStock} left
                            </span>
                          </div>
                        </div>
                      </div>
                      {inCart && (
                        <div className="mt-2 text-xs text-primary font-medium flex items-center gap-1">
                          In cart: {inCart.quantity}
                          {remainingStock <= 0 && (
                            <AlertCircle className="h-3 w-3 text-warning" />
                          )}
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
