import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { Banknote, Building2, FileText, CreditCard, Smartphone, Wallet } from 'lucide-react';
import { PaymentMethod, AccountType, PaymentMethodSettings, AccountVisibilitySettings } from '@/types/erp';
import { useAccounts } from '@/hooks';
import { usePaymentMethodSettings } from '@/hooks/usePaymentMethodSettings';
import { useAccountVisibilitySettings } from '@/hooks/useAccountVisibilitySettings';
import { useMemo } from 'react';

interface PaymentMethodSelectorProps {
  paymentMethod: string; // Now stores account ID instead of payment type
  onPaymentMethodChange: (accountId: string) => void;
  selectedAccount: string; // Deprecated but kept for backward compatibility
  onAccountChange: (accountId: string) => void; // Deprecated but kept for backward compatibility
  chequeAccountId?: string;
  onChequeAccountChange?: (accountId: string) => void;
  chequeNumber?: string;
  onChequeNumberChange?: (number: string) => void;
  showChequeFields?: boolean; // Deprecated - now controlled by settings
  showCreditOption?: boolean; // Deprecated - now controlled by settings
  label?: string;
}

export function PaymentMethodSelector({
  paymentMethod,
  onPaymentMethodChange,
  selectedAccount, // Deprecated
  onAccountChange, // Deprecated
  chequeAccountId,
  onChequeAccountChange,
  chequeNumber,
  onChequeNumberChange,
  showChequeFields = true, // Deprecated - kept for backward compatibility
  showCreditOption = true, // Deprecated - kept for backward compatibility
  label,
}: PaymentMethodSelectorProps) {
  const { t } = useLanguage();

  // Fetch accounts from database
  const { data: accounts = [] } = useAccounts({ status: 'active' });

  // Fetch payment method settings from database
  const { data: paymentMethodSettings } = usePaymentMethodSettings();

  // Fetch account visibility settings from database
  const { data: accountVisibilitySettings } = useAccountVisibilitySettings();

  // Determine if cheque and credit should be shown - prefer settings over props
  const shouldShowCheque = paymentMethodSettings?.showCheque ?? showChequeFields;
  const shouldShowCredit = paymentMethodSettings?.showCredit ?? showCreditOption;

  // Filter accounts (exclude cheque type accounts if showChequeFields is false)
  // Also filter based on account visibility settings
  const availableAccounts = useMemo(() => {
    let filtered = accounts;
    if (!shouldShowCheque) {
      filtered = accounts.filter(account => account.account_type !== 'cheque');
    }
    // Filter by account visibility settings
    if (accountVisibilitySettings) {
      filtered = filtered.filter(account => accountVisibilitySettings[account.id] !== false);
    }
    return filtered;
  }, [accounts, shouldShowCheque, accountVisibilitySettings]);

  // Get account icon based on account type
  const getAccountIcon = (accountType: string) => {
    switch (accountType) {
      case 'cash': return Banknote;
      case 'bank': return Building2;
      case 'mobile_wallet': return Smartphone;
      case 'cheque': return FileText;
      case 'custom': return Wallet;
      default: return Banknote;
    }
  };

  // Find selected account details
  const selectedAccountDetails = accounts.find(acc => acc.id === paymentMethod);
  const requiresChequeFields = selectedAccountDetails?.account_type === 'cheque' || paymentMethod === 'cheque';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{label || t('paymentMethod')}</Label>
        <RadioGroup
          value={paymentMethod}
          onValueChange={onPaymentMethodChange}
          className="flex flex-col gap-2"
        >
          {/* Show actual accounts as payment options */}
          {availableAccounts.map((account) => {
            const IconComponent = getAccountIcon(account.account_type);
            
            return (
              <div key={account.id} className="relative">
                <RadioGroupItem value={account.id} id={account.id} className="peer sr-only" />
                <label
                  htmlFor={account.id}
                  className="flex items-center justify-between rounded-lg border-2 border-border p-3 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <IconComponent className="h-5 w-5" />
                    <div>
                      <span className="text-sm font-medium">
                        {account.account_type === 'bank' && account.bank_name 
                          ? account.bank_name 
                          : account.account_name}
                      </span>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {account.account_type.replace('_', ' ').charAt(0).toUpperCase() + account.account_type.replace('_', ' ').slice(1)}
                        {account.account_number && ` • ${account.account_number}`}
                      </div>
                    </div>
                  </div>
                  <CurrencyDisplay amount={account.current_balance} className="text-sm" />
                </label>
              </div>
            );
          })}

          {/* Cheque option - Manual hardcoded */}
          {shouldShowCheque && (
            <div className="relative">
              <RadioGroupItem value="cheque" id="cheque" className="peer sr-only" />
              <label
                htmlFor="cheque"
                className="flex items-center justify-between rounded-lg border-2 border-border p-3 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-secondary"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5" />
                  <div>
                    <span className="text-sm font-medium">Cheque</span>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Pay by cheque
                    </div>
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Credit option if enabled */}
          {shouldShowCredit && (
            <div className="relative">
              <RadioGroupItem value="credit" id="credit" className="peer sr-only" />
              <label
                htmlFor="credit"
                className="flex items-center justify-between rounded-lg border-2 border-border p-3 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-secondary"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5" />
                  <div>
                    <span className="text-sm font-medium">Credit</span>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Customer credit payment
                    </div>
                  </div>
                </div>
              </label>
            </div>
          )}
        </RadioGroup>
      </div>

      {/* Cheque specific fields - show when cheque is selected */}
      {requiresChequeFields && shouldShowCheque && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cheque Number</Label>
            <Input
              value={chequeNumber || ''}
              onChange={(e) => onChequeNumberChange?.(e.target.value)}
              placeholder="Enter cheque number"
            />
          </div>
          <div className="space-y-2">
            <Label>Deposit Into Account</Label>
            <Select value={chequeAccountId || ''} onValueChange={onChequeAccountChange}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select deposit account" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                {accounts.filter((a) => a.account_type !== 'cheque').map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{account.account_name}</span>
                      <CurrencyDisplay amount={account.current_balance} className="text-xs text-muted-foreground" />
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Credit payment note */}
      {paymentMethod === 'credit' && (
        <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
          <p className="text-sm text-warning-foreground">
            💳 Amount will be added to customer's due balance.
          </p>
        </div>
      )}
    </div>
  );
}
