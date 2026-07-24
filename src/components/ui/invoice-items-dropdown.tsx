import { useState } from 'react';
import { ChevronDown, ChevronUp, Package } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { cn } from '@/lib/utils';

interface InvoiceItem {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface InvoiceItemsDropdownProps {
  items: InvoiceItem[];
  className?: string;
}

export function InvoiceItemsDropdown({ items, className }: InvoiceItemsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("w-full", className)}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors w-full justify-start py-1">
        <Package className="h-4 w-4" />
        <span>{items.length} item{items.length > 1 ? 's' : ''}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 ml-auto" />
        ) : (
          <ChevronDown className="h-4 w-4 ml-auto" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-1">
        <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{item.quantity}x</span>
                <span className="font-medium">{item.itemName}</span>
              </div>
              <div className="text-right">
                <CurrencyDisplay amount={item.totalPrice} className="font-medium" />
                <p className="text-xs text-muted-foreground">
                  @ <CurrencyDisplay amount={item.unitPrice} />
                </p>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
