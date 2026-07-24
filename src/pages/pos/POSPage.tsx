import { useState, useMemo, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { PaymentMethodSelector } from '@/components/forms/PaymentMethodSelector';
import { POSPrintDialog } from '@/components/pos/POSPrintDialog';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Package,
  ShoppingCart,
  User,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { defaultInvoiceSettings } from '@/data/mockData';
import { Sale } from '@/types/erp';
import { Item, Customer } from '@/types/api';
import { useActiveItems } from '@/hooks/useItems';
import { useActiveCustomers } from '@/hooks/useCustomers';
import { useAccounts, useRefreshAccounts } from '@/hooks/useAccounts';
import { useInvoiceSettings } from '@/hooks/useInvoiceSettings';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useRefreshSales } from '@/hooks';

interface CartItem {
  item: Item;
  quantity: number;
  unitPrice: number;
}

export default function POSPage() {
  const { t } = useLanguage();
  
  const { data: items = [], isLoading: itemsLoading } = useActiveItems();
  const { data: customers = [], isLoading: customersLoading } = useActiveCustomers();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: invoiceSettings = defaultInvoiceSettings } = useInvoiceSettings();
    const refreshAccounts = useRefreshAccounts();
        const refreshSales = useRefreshSales();
  const hasInitializedDefaultCustomer = useRef(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(''); // Now stores account ID
  const [selectedAccount, setSelectedAccount] = useState(''); // Deprecated but kept for backward compatibility
  const [chequeAccountId, setChequeAccountId] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  const walkInCustomer = useMemo(
    () => customers.find((c) => String(c.id) === '1') || null,
    [customers]
  );

  useEffect(() => {
    if (hasInitializedDefaultCustomer.current || customers.length === 0) {
      return;
    }

    if (walkInCustomer) {
      setSelectedCustomer(walkInCustomer);
    }

    hasInitializedDefaultCustomer.current = true;
  }, [customers.length, walkInCustomer]);

  // Set default account to first available account if none selected
  useEffect(() => {
    if (!paymentMethod && accounts.length > 0) {
      const firstAccount = accounts.find((a) => a.status === 'active');
      if (firstAccount) {
        setPaymentMethod(String(firstAccount.id));
        setSelectedAccount(String(firstAccount.id)); // Keep for backward compatibility
      }
    }
  }, [paymentMethod, accounts]);

  const filteredItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.status === 'active' &&
        (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery, items]);

  const filteredCustomers = useMemo(() => {
    // Filter out Walk-in Customer (id='1') from the list
    const availableCustomers = customers.filter(c => String(c.id) !== '1');
    
    if (!customerSearch) return availableCustomers.slice(0, 8);
    return availableCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.includes(customerSearch)
    );
  }, [customerSearch, customers]);

  const addToCart = (item: Item) => {
    // Check stock availability
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
      setCart(
        cart.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      setCart([...cart, { item, quantity: 1, unitPrice: item.sale_price }]);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(
      cart
        .map((c) => {
          if (c.item.id === itemId) {
            const newQty = Math.max(0, c.quantity + delta);
            // Check stock limit
            if (newQty > c.item.stock_quantity) {
              toast({
                title: 'Stock Limit',
                description: `Only ${c.item.stock_quantity} ${c.item.unit}(s) available`,
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

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((c) => c.item.id !== itemId));
  };

  const updateUnitPrice = (itemId: string, newPrice: number) => {
    setCart(
      cart.map((c) =>
        c.item.id === itemId ? { ...c, unitPrice: Math.max(0, newPrice) } : c
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setChequeNumber('');
    setChequeAccountId('');
    setSelectedCustomer(walkInCustomer);
  };

  const closeCustomerSelector = () => {
    setShowCustomerSelect(false);
    setCustomerSearch('');
    if (!selectedCustomer && walkInCustomer) {
      setSelectedCustomer(walkInCustomer);
    }
  };

  const subtotal = cart.reduce((sum, c) => sum + c.quantity * c.unitPrice, 0);
  const discountAmount = discount;
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const payment = parseFloat(paymentAmount || '0');
  const dueAmount = Math.max(0, grandTotal - payment);
  const itemCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const  handleCheckout = async () => {
    if (cart.length === 0) {
      toast({ title: 'Error', description: 'Cart is empty', variant: 'destructive' });
      return;
    }
    
    let customerForSale = selectedCustomer || walkInCustomer;
    if (!customerForSale) {
      toast({ title: 'Error', description: 'Walk-in Customer not found. Please create default customer.', variant: 'destructive' });
      return;
    }
    if (!selectedAccount && paymentMethod !== 'cheque' && paymentMethod !== 'credit') {
      toast({ 
        title: 'Error', 
        description: 'Please select payment account', 
        variant: 'destructive' 
      });
      return;
    }
    
    // Check if accounts are available
    if (accounts.length === 0 && paymentMethod !== 'credit') {
      toast({ 
        title: 'Error', 
        description: 'No payment accounts available. Please add accounts first.', 
        variant: 'destructive' 
      });
      return;
    }
    
    // Check if selected payment method account exists
    // if (paymentMethod && paymentMethod !== 'credit') {
    //   const selectedAccountDetails = accounts.find(acc => acc.id === paymentMethod);
    //   if (!selectedAccountDetails) {
    //     toast({ 
    //       title: 'Error', 
    //       description: 'Selected payment account not found. Please select a valid account.', 
    //       variant: 'destructive' 
    //     });
    //     return;
    //   }
    // }
    
    if (paymentMethod === 'cheque' && (!chequeNumber || !chequeAccountId)) {
      toast({ title: 'Error', description: 'Please fill cheque details', variant: 'destructive' });
      return;
    }

    try {
      const selectedAccountDetails = accounts.find(acc => acc.id === paymentMethod);
      const resolvedPaymentMethod =
        paymentMethod === 'cheque' || paymentMethod === 'credit'
          ? paymentMethod
          : selectedAccountDetails?.account_type || 'cash';
      const resolvedAccountId = paymentMethod === 'cheque' ? chequeAccountId : paymentMethod;
      const saleId = `SALE-${Date.now()}`;
      const invoiceNo = `INV-${Date.now()}`;

      // Prepare sale data matching backend expectations
      const paymentStatus = (dueAmount === 0 ? 'paid' : payment > 0 ? 'partial' : 'due') as 'paid' | 'partial' | 'due';
      const saleData = {
        id: saleId,
        invoice_number: invoiceNo,
        customer_id: customerForSale?.id ? String(customerForSale.id) : '1',
        customer_name: customerForSale?.name || '',
        sale_date: new Date().toISOString().split('T')[0],
        subtotal: subtotal,
        discount_amount: discountAmount,
        discount_percent: 0,
        total_amount: grandTotal,
        paid_amount: payment,
        due_amount: dueAmount,
        payment_status: paymentStatus,
        payment_method: resolvedPaymentMethod,
        account_id: payment > 0 ? resolvedAccountId : null,
        cheque_account_id: paymentMethod === 'cheque' ? chequeAccountId : undefined,
        notes: payment === 0 ? 'Credit Sale - Due Payment' : undefined,
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
        account_id: resolvedAccountId,
        method: resolvedPaymentMethod,
      } : undefined;

      const createPayload: any = {
        ...saleData,
      };
      
      if (paymentInfo) {
        createPayload.payment = paymentInfo;
      }

     

      const response = await window.api.sales.create(createPayload);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create sale');
      }

      // Backend automatically updates account balance via PaymentsRepository
      // No manual balance update needed

      // Create a sale object for printing
      const newSale: Sale = {
        id: saleId,
        invoiceNumber: invoiceNo,
        customerId: String(customerForSale?.id || '1'),
        customerName: customerForSale?.name || '',
        saleDate: new Date().toISOString().split('T')[0],
        items: cart.map((c, idx) => ({
          id: `item-${idx}`,
          saleId: saleId,
          itemId: c.item.id,
          itemName: c.item.name,
          quantity: c.quantity,
          unit: c.item.unit,
          unitPrice: c.unitPrice,
          totalPrice: c.quantity * c.unitPrice,
        })),
        subtotal: subtotal,
        discountAmount: discountAmount,
        discountPercent: 0,
        totalAmount: grandTotal,
        paidAmount: payment,
        dueAmount: dueAmount,
        paymentStatus: paymentStatus,
      };
      setLastSale(newSale);
      setShowPrintDialog(true);
        refreshAccounts()
 refreshSales()
      const statusMessage = payment === 0 ? 'Credit Sale Complete!' : dueAmount > 0 ? 'Partial Payment Recorded!' : 'Sale Complete!';
      const description = `Total: PKR ${grandTotal.toLocaleString()}${customerForSale ? ` - ${customerForSale.name}` : ''}${dueAmount > 0 ? ` (Due: PKR ${dueAmount.toLocaleString()})` : ''}`;
      
      toast({
        title: statusMessage,
        description: description,
      });

      clearCart();
    } catch (error) {
      console.error('POS Checkout Error:', error);
      
      let errorMessage = 'Failed to create sale';
      
      if (error instanceof Error) {
        const errorText = error.message.toLowerCase();
        if (errorText.includes('foreign key') || errorText.includes('constraint')) {
          if (errorText.includes('account')) {
            errorMessage = 'Payment account not found. Please select a valid account.';
          } else if (errorText.includes('customer')) {
            errorMessage = 'Customer not found. Please try again.';
          } else {
            errorMessage = 'Invalid data reference. Please check your selections.';
          }
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };


  return (
    <MainLayout>
      {/* Print Dialog */}
      {lastSale && (
        <POSPrintDialog
          open={showPrintDialog}
          onOpenChange={setShowPrintDialog}
          sale={lastSale}
          settings={invoiceSettings}
        />
      )}
      <div className="h-[calc(100vh-5rem)] flex gap-4  -m-6">
        {/* Left: Cart - Primary Focus with more space */}
        <div className="w-[550px] min-w-[450px] bg-card border-r border-border flex flex-col">
          {/* Customer Selection */}
          <div className="p-4 border-b border-border">
            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-primary/10 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{selectedCustomer.name}</p>
                    {selectedCustomer.phone && (
                      <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => {
                  setSelectedCustomer(null);
                  setShowCustomerSelect(true);
                }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Button 
                  variant="outline" 
                  className="group w-full justify-between h-10 hover:bg-accent hover:border-primary"
                  onClick={() => {
                    if (showCustomerSelect) {
                      closeCustomerSelector();
                      return;
                    }
                    setShowCustomerSelect(true);
                  }}
                >
                  <span className="text-muted-foreground group-hover:text-accent-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {customerSearch || "Select customer (optional)"}
                  </span>
                  <Search className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
                </Button>
                
                {showCustomerSelect && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-50">
                    {/* Search Input */}
                    <div className="p-2 border-b">
                      <Input
                        placeholder="Search customer..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="h-8"
                        autoFocus
                      />
                    </div>
                    
                    {/* Customer List */}
                    <div className="max-h-48 overflow-auto">
                      {filteredCustomers.length === 0 ? (
                        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                          {customerSearch ? 'No customers found' : 'No customers available'}
                        </div>
                      ) : (
                        filteredCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            className="group px-3 py-2 hover:bg-accent cursor-pointer border-b border-border/50 last:border-0"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setShowCustomerSelect(false);
                              setCustomerSearch('');
                            }}
                          >
                            <p className="font-medium text-sm group-hover:text-accent-foreground">{customer.name}</p>
                            {customer.phone && (
                              <p className="text-xs text-muted-foreground group-hover:text-accent-foreground">{customer.phone}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    
                    {/* Clear Selection Option */}
                    <div className="border-t p-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-muted-foreground"
                        onClick={() => {
                          setSelectedCustomer(walkInCustomer);
                          setShowCustomerSelect(false);
                          setCustomerSearch('');
                        }}
                      >
                        <X className="h-3 w-3 mr-2" />
                        Use Walk-in Customer (Default)
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Click outside to close */}
                {showCustomerSelect && (
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={closeCustomerSelector}
                  />
                )}
              </div>
            )}
          </div>

          {/* Cart Items - Larger Space */}
          <ScrollArea className="flex-1 min-h-[300px]">
            <div className="p-4 space-y-2">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-base text-muted-foreground">Cart is empty</p>
                  <p className="text-xs text-muted-foreground">Click on products to add</p>
                </div>
              ) : (
                cart.map((cartItem) => (
                  <div key={cartItem.item.id} className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{cartItem.item.name}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground text-[10px]">Rs</span>
                          <Input
                            type="number"
                            value={cartItem.unitPrice}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const inputValue = e.target.value;
                              const newPrice = inputValue === '' ? 0 : parseFloat(inputValue) || 0;
                              updateUnitPrice(cartItem.item.id, newPrice);
                            }}
                            className="h-6 w-20 text-xs border-muted-foreground/30 bg-background/80 focus:bg-background"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        {cartItem.item.stock_quantity <= cartItem.item.low_stock_threshold && (
                          <span className="text-warning flex items-center gap-0.5">
                            <AlertCircle className="h-3 w-3" />
                            {t('lowStock')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(cartItem.item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-bold text-sm">{cartItem.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(cartItem.item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="w-20 text-right">
                      <CurrencyDisplay amount={cartItem.quantity * cartItem.unitPrice} className="font-bold text-sm" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeFromCart(cartItem.item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Totals & Checkout - Compact */}
          <div className="border-t border-border p-3 space-y-3 bg-secondary/30">
            {/* Discount */}
            <div className="flex items-center gap-2">
              <Label className="text-xs w-16">{t('discount')}</Label>
              <Input
                type="number"
                value={discount || ''}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  const value = inputValue === '' ? 0 : parseFloat(inputValue) || 0;
                  setDiscount(value);
                }}
                className="flex-1 h-8 text-sm"
                placeholder="0"
              />
            </div>

            {/* Paid Amount */}
            <div className="flex items-center gap-2">
              <Label className="text-xs w-16">{t('paid')}</Label>
              <div className="flex-1 flex gap-1">
                <Input
                  type="number"
                  value={paymentAmount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="flex-1 h-8 text-sm"
                  placeholder="0"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPaymentAmount(grandTotal.toString())}
                  className="h-8 px-2 text-xs"
                  title="Fill full amount"
                >
                  Full
                </Button>
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('subtotal')} ({itemCount} items)</span>
                <CurrencyDisplay amount={subtotal} />
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>{t('discount')}</span>
                  <span>-<CurrencyDisplay amount={discountAmount} /></span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xl pt-2 border-t">
                <span>{t('grandTotal')}</span>
                <CurrencyDisplay amount={grandTotal} className="text-primary" />
              </div>
              <div className="flex justify-between text-success pt-1 border-t">
                <span>{t('paid')}</span>
                <CurrencyDisplay amount={payment} />
              </div>
              <div className="flex justify-between font-semibold text-warning">
                <span>{t('due')}</span>
                <CurrencyDisplay amount={dueAmount} />
              </div>
            </div>

            {/* Payment Method */}
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
            />

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearCart} className="flex-1 h-10">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Button onClick={handleCheckout} className="flex-[2] h-12 text-base font-bold">
                <Check className="h-4 w-4 mr-1" />
                Pay <CurrencyDisplay amount={grandTotal} className="ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Products Grid - More space */}
        <div className="flex-1 flex flex-col bg-background p-3">
          {/* Search */}
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </div>

          {/* Products Grid - Larger cards */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 pb-4">
              {filteredItems.map((item) => {
                const inCart = cart.find((c) => c.item.id === item.id);
                const remainingStock = item.stock_quantity - (inCart?.quantity || 0);
                const isOutOfStock = remainingStock <= 0;
                const isLowStock = remainingStock <= item.low_stock_threshold && remainingStock > 0;
                
                return (
                  <div
                    key={item.id}
                    onClick={() => !isOutOfStock && addToCart(item)}
                    className={cn(
                      'group  bg-card border border-border rounded-lg p-3 cursor-pointer hover:bg-accent hover:border-primary hover:shadow-md transition-all duration-150 relative flex flex-col',
                      inCart && 'border-primary bg-primary/5',
                      isOutOfStock && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {inCart && (
                      <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold z-20">
                        {inCart.quantity}
                      </div>
                    )}
                    <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center mb-3 relative z-10 flex-shrink-0 group-hover:bg-accent">
                      <Package className="h-5 w-5 text-primary group-hover:text-accent-foreground" />
                    </div>
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <p className="font-medium text-xs truncate whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-accent-foreground" title={item.name}>{item.name}</p>
                      <p className="text-[10px] text-muted-foreground group-hover:text-accent-foreground truncate whitespace-nowrap overflow-hidden text-ellipsis mb-1" title={item.sku}>{item.sku}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-auto">
                      <CurrencyDisplay amount={item.sale_price} className="text-sm font-bold text-primary group-hover:text-accent-foreground whitespace-nowrap" />
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 group-hover:text-accent-foreground",
                        isOutOfStock && "bg-destructive/10 text-destructive",
                        isLowStock && "bg-warning/10 text-warning",
                        !isOutOfStock && !isLowStock && "bg-success/10 text-success"
                      )}>
                        {remainingStock}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    </MainLayout>
  );
}
