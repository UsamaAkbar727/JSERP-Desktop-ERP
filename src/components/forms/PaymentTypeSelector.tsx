import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { PaymentType } from '@/types/erp';
import { CheckCircle2, CircleDot } from 'lucide-react';

interface PaymentTypeSelectorProps {
  paymentType: PaymentType;
  onPaymentTypeChange: (type: PaymentType) => void;
  totalDue: number;
  amount: string;
  onAmountChange: (amount: string) => void;
  label?: string;
}

export function PaymentTypeSelector({
  paymentType,
  onPaymentTypeChange,
  totalDue,
  amount,
  onAmountChange,
}: PaymentTypeSelectorProps) {
  const { t } = useLanguage();

  const handleTypeChange = (type: PaymentType) => {
    onPaymentTypeChange(type);
    if (type === 'full') {
      onAmountChange(totalDue.toString());
    } else {
      onAmountChange('0');
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gradient-to-r from-warning/10 to-warning/5 rounded-xl border border-warning/20">
        <p className="text-sm text-muted-foreground">{t('totalDue')}</p>
        <CurrencyDisplay
          amount={totalDue}
          className="text-2xl font-bold text-warning"
        />
      </div>

      <div className="space-y-2">
        <Label>Payment Type</Label>
        <RadioGroup
          value={paymentType}
          onValueChange={(value) => handleTypeChange(value as PaymentType)}
          className="grid grid-cols-2 gap-3"
        >
          <div className="relative">
            <RadioGroupItem value="full" id="full" className="peer sr-only" />
            <label
              htmlFor="full"
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-border p-3 cursor-pointer transition-all peer-data-[state=checked]:border-success peer-data-[state=checked]:bg-success/5 hover:bg-secondary"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Full Payment</span>
            </label>
          </div>
          <div className="relative">
            <RadioGroupItem value="partial" id="partial" className="peer sr-only" />
            <label
              htmlFor="partial"
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-border p-3 cursor-pointer transition-all peer-data-[state=checked]:border-warning peer-data-[state=checked]:bg-warning/5 hover:bg-secondary"
            >
              <CircleDot className="h-5 w-5" />
              <span className="text-sm font-medium">Partial Payment</span>
            </label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">{t('amount')} *</Label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0"
          className="input-currency text-lg h-12"
          disabled={paymentType === 'full'}
        />
        {paymentType === 'partial' && parseFloat(amount) > 0 && parseFloat(amount) < totalDue && (
          <p className="text-sm text-muted-foreground">
            Remaining after payment:{' '}
            <CurrencyDisplay amount={totalDue - parseFloat(amount)} className="text-warning font-medium" />
          </p>
        )}
      </div>
    </div>
  );
}
