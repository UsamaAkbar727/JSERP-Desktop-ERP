import { PaymentStatus } from '@/types/erp';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface StatusBadgeProps {
  status: PaymentStatus | 'active' | 'inactive';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useLanguage();

  const getStatusStyles = () => {
    switch (status) {
      case 'paid':
      case 'active':
        return 'badge-paid';
      case 'partial':
        return 'badge-partial';
      case 'due':
        return 'badge-due';
      case 'inactive':
        return 'badge-inactive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'paid':
        return t('paid');
      case 'partial':
        return t('partial');
      case 'due':
        return t('due');
      case 'active':
        return t('active');
      case 'inactive':
        return t('inactive');
      default:
        return status;
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        getStatusStyles(),
        className
      )}
    >
      {getLabel()}
    </span>
  );
}
