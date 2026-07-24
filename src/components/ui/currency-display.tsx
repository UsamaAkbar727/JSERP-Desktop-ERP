import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface CurrencyDisplayProps {
  amount: number;
  className?: string;
  showSign?: boolean;
}

export function CurrencyDisplay({ amount, className, showSign = false }: CurrencyDisplayProps) {
  const { isRTL } = useLanguage();
  
  const formattedAmount = new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

  const isNegative = amount < 0;
  const displaySign = showSign && !isNegative ? '+' : '';

  return (
    <span
      className={cn(
        'currency',
        isNegative ? 'amount-negative' : showSign ? 'amount-positive' : '',
        className
      )}
    >
      {displaySign}{isNegative ? '-' : ''}{formattedAmount}
    </span>
  );
}
