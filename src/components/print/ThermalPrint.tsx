import { forwardRef } from 'react';
import { Sale, InvoiceSettings } from '@/types/erp';

interface ThermalPrintProps {
  sale: Sale;
  settings: InvoiceSettings;
}

export const ThermalPrint = forwardRef<HTMLDivElement, ThermalPrintProps>(
  ({ sale, settings }, ref) => {
    const { columnLabels } = settings;

    return (
      <div
        ref={ref}
        className="bg-white text-black p-4 w-[80mm] mx-auto font-mono text-xs"
        style={{ fontFamily: "'Courier New', monospace" }}
      >
        {/* Header */}
        <div className="text-center border-b border-dashed border-black pb-2 mb-2">
          <h1 className="text-sm font-bold">RECEIPT</h1>
          <p className="text-[10px]">{sale.invoiceNumber}</p>
          <p className="text-[10px]">{sale.saleDate}</p>
        </div>

        {/* Customer */}
        <div className="border-b border-dashed border-black pb-2 mb-2">
          <p className="text-[10px]">Customer: {sale.customerName}</p>
        </div>

        {/* Items */}
        <div className="border-b border-dashed border-black pb-2 mb-2">
          <div className="flex justify-between text-[10px] font-bold mb-1">
            <span>Item</span>
            <span>Total</span>
          </div>
          {sale.items.map((item, index) => (
            <div key={item.id} className="mb-1">
              <div className="flex justify-between text-[10px]">
                <span className="flex-1 truncate">{item.itemName}</span>
                <span className="ml-2">{item.totalPrice.toLocaleString()}</span>
              </div>
              <div className="text-[9px] text-gray-600">
                {item.quantity} x {item.unitPrice.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span>Subtotal:</span>
            <span>{sale.subtotal.toLocaleString()}</span>
          </div>
          {sale.discountAmount > 0 && (
            <div className="flex justify-between text-[10px]">
              <span>Discount:</span>
              <span>-{sale.discountAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold border-t border-dashed border-black pt-1">
            <span>TOTAL:</span>
            <span>PKR {sale.totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 pt-2 border-t border-dashed border-black">
          <p className="text-[10px]">Thank you for your purchase!</p>
          <p className="text-[9px] text-gray-600">شکریہ</p>
          <p className="text-[9px] text-gray-500 mt-2">Powered by JuttSoft Ltd.</p>
        </div>
      </div>
    );
  }
);

ThermalPrint.displayName = 'ThermalPrint';
