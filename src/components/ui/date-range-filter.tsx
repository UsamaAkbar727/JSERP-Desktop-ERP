import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DateRangeType = 'today' | 'last7days' | 'last30days' | 'last3months' | 'last6months' | 'alltime' | 'custom';

export interface DateRange {
  type: DateRangeType;
  fromDate: string | null;
  toDate: string | null;
}

interface DateRangeFilterProps {
  onDateChange: (range: DateRange) => void;
  defaultRange?: DateRangeType;
  className?: string;
}

export function DateRangeFilter({ 
  onDateChange, 
  defaultRange = 'last7days',
  className 
}: DateRangeFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<DateRangeType>(defaultRange);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Calculate date range based on filter type
  const calculateDateRange = (filterType: DateRangeType): { from: string | null; to: string | null } => {
    const today = new Date();
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    switch (filterType) {
      case 'today':
        return { from: formatDate(today), to: formatDate(today) };
      
      case 'last7days': {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        return { from: formatDate(sevenDaysAgo), to: formatDate(today) };
      }
      
      case 'last30days': {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        return { from: formatDate(thirtyDaysAgo), to: formatDate(today) };
      }
      
      case 'last3months': {
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        return { from: formatDate(threeMonthsAgo), to: formatDate(today) };
      }
      
      case 'last6months': {
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        return { from: formatDate(sixMonthsAgo), to: formatDate(today) };
      }
      
      case 'alltime':
        return { from: null, to: null };
      
      case 'custom':
        return { from: fromDate || null, to: toDate || null };
      
      default:
        return { from: null, to: null };
    }
  };

  // Apply quick filter immediately
  const handleQuickFilter = (filterType: DateRangeType) => {
    setActiveFilter(filterType);
    const range = calculateDateRange(filterType);
    onDateChange({
      type: filterType,
      fromDate: range.from,
      toDate: range.to,
    });
  };

  // Apply custom date range
  const handleApplyFilter = () => {
    if (!fromDate || !toDate) {
      return;
    }
    setActiveFilter('custom');
    onDateChange({
      type: 'custom',
      fromDate: fromDate,
      toDate: toDate,
    });
  };

  // Clear all filters
  const handleClearFilter = () => {
    setActiveFilter('last7days');
    setFromDate('');
    setToDate('');
    const range = calculateDateRange('last7days');
    onDateChange({
      type: 'last7days',
      fromDate: range.from,
      toDate: range.to,
    });
  };

  // Initialize with default range
  useEffect(() => {
    const range = calculateDateRange(defaultRange);
    onDateChange({
      type: defaultRange,
      fromDate: range.from,
      toDate: range.to,
    });
  }, []);

  return (
    <Card className={cn("p-4", className)}>
      <div className="space-y-4">
        {/* Header */}
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <h3 className="font-semibold text-sm">Date Range</h3>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>

        {/* Filter Content */}
        {isExpanded && (
          <div className="space-y-4 pt-2">
            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={activeFilter === 'today' ? 'default' : 'outline'}
                onClick={() => handleQuickFilter('today')}
                className={cn(
                  "transition-colors",
                  activeFilter === 'today' && "bg-primary text-primary-foreground"
                )}
              >
                Today
              </Button>
              
              <Button
                type="button"
                size="sm"
                variant={activeFilter === 'last7days' ? 'default' : 'outline'}
                onClick={() => handleQuickFilter('last7days')}
                className={cn(
                  "transition-colors",
                  activeFilter === 'last7days' && "bg-primary text-primary-foreground"
                )}
              >
                Last 7 Days
              </Button>
              
              <Button
                type="button"
                size="sm"
                variant={activeFilter === 'last30days' ? 'default' : 'outline'}
                onClick={() => handleQuickFilter('last30days')}
                className={cn(
                  "transition-colors",
                  activeFilter === 'last30days' && "bg-primary text-primary-foreground"
                )}
              >
                Last 30 Days
              </Button>
              
              <Button
                type="button"
                size="sm"
                variant={activeFilter === 'last3months' ? 'default' : 'outline'}
                onClick={() => handleQuickFilter('last3months')}
                className={cn(
                  "transition-colors",
                  activeFilter === 'last3months' && "bg-primary text-primary-foreground"
                )}
              >
                Last 3 Months
              </Button>
              
              <Button
                type="button"
                size="sm"
                variant={activeFilter === 'last6months' ? 'default' : 'outline'}
                onClick={() => handleQuickFilter('last6months')}
                className={cn(
                  "transition-colors",
                  activeFilter === 'last6months' && "bg-primary text-primary-foreground"
                )}
              >
                Last 6 Months
              </Button>
              
              <Button
                type="button"
                size="sm"
                variant={activeFilter === 'alltime' ? 'default' : 'outline'}
                onClick={() => handleQuickFilter('alltime')}
                className={cn(
                  "transition-colors",
                  activeFilter === 'alltime' && "bg-primary text-primary-foreground"
                )}
              >
                All Time
              </Button>
            </div>

            {/* Custom Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromDate" className="text-sm">From Date</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  placeholder="dd-----yyyy"
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="toDate" className="text-sm">To Date</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  placeholder="dd-----yyyy"
                  className="text-sm"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleApplyFilter}
                disabled={!fromDate || !toDate}
                className="flex-1"
              >
                Apply Filter
              </Button>
              
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleClearFilter}
                className="flex-1"
              >
                Clear Filter
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
