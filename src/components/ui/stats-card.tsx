import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CurrencyDisplay } from './currency-display';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  isCurrency?: boolean;
  className?: string;
  iconClassName?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  isCurrency = true,
  className,
  iconClassName,
}: StatsCardProps) {
  return (
    <div className={cn('card-stats', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-xs md:text-sm text-muted-foreground truncate">{title}</p>
          <div className="text-xl md:text-2xl font-bold text-foreground">
            {isCurrency ? (
              <CurrencyDisplay amount={value} />
            ) : (
              value.toLocaleString()
            )}
          </div>
          {trendValue && (
            <p
              className={cn(
                'text-xs',
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-destructive',
                trend === 'neutral' && 'text-muted-foreground'
              )}
            >
              {trendValue}
            </p>
          )}
        </div>
        <div
          className={cn(
            'p-2 md:p-2.5 rounded-lg flex-shrink-0',
            iconClassName || 'bg-primary/10'
          )}
        >
          <Icon className={cn('h-4 w-4 md:h-5 md:w-5', iconClassName ? 'text-current' : 'text-primary')} />
        </div>
      </div>
    </div>
  );
}
