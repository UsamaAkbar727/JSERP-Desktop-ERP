import { forwardRef } from 'react';
import { Sale, InvoiceSettings } from '@/types/erp';
import { CurrencyDisplay } from '@/components/ui/currency-display';

interface InvoicePrintProps {
  sale: Sale;
  settings: InvoiceSettings;
}

export const InvoicePrint = forwardRef<HTMLDivElement, InvoicePrintProps>(
  ({ sale, settings }, ref) => {
    const { columnLabels, headerBannerUrl } = settings;

    return (
      <div
        ref={ref}
        className="bg-white text-black p-0 w-[210mm] min-h-[297mm] mx-auto"
        dir="rtl"
        style={{ fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif" }}
      >
        {/* Header Banner - Replaceable */}
        {headerBannerUrl ? (
          <div className="w-full">
            <img
              src={headerBannerUrl}
              alt="Invoice Header"
              className="w-full h-auto object-contain"
            />
          </div>
        ) : (
          <div className="bg-gradient-to-r from-cyan-400 to-cyan-600 p-6 text-white text-center">
            <h1 className="text-2xl font-bold mb-2">نام کمپنی</h1>
            <p className="text-sm">پتہ یہاں درج کریں</p>
            <p className="text-sm">
              فون: <span dir="ltr" className="inline-block">0300-0000000</span>
            </p>
          </div>
        )}

        {/* Invoice Info Section */}
        <div className="px-6 py-4 flex justify-between items-start border-b-2 border-cyan-500 bg-cyan-50">
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-cyan-700 font-medium">نمبر:</span>
              <span className="font-bold text-lg">{sale.invoiceNumber}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-700 font-medium">جناب:</span>
              <span className="font-medium">{sale.customerName}</span>
            </div>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-cyan-700 font-medium">تاریخ:</span>
              <span className="font-medium">{sale.saleDate}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="px-4 py-2">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-amber-500 text-white">
                <th className="border border-cyan-600 py-2 px-3 text-center w-16">
                  {columnLabels.serialNo}
                </th>
                <th className="border border-cyan-600 py-2 px-3 text-right flex-1">
                  {columnLabels.quantity}
                </th>
                <th className="border border-cyan-600 py-2 px-3 text-center w-24">
                  {columnLabels.description}
                </th>
                <th className="border border-cyan-600 py-2 px-3 text-center w-28">
                  {columnLabels.rate}
                </th>
                <th className="border border-cyan-600 py-2 px-3 text-center w-28">
                  {columnLabels.total}
                </th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, index) => (
                <tr key={item.id} className="border-b border-cyan-300">
                  <td className="border border-cyan-300 py-2 px-3 text-center">
                    {index + 1}
                  </td>
                  <td className="border border-cyan-300 py-2 px-3 text-right font-medium">
                    {item.itemName}
                  </td>
                  <td className="border border-cyan-300 py-2 px-3 text-center">
                    {item.quantity}
                  </td>
                  <td className="border border-cyan-300 py-2 px-3 text-center">
                    {item.unitPrice.toLocaleString()}
                  </td>
                  <td className="border border-cyan-300 py-2 px-3 text-center font-bold">
                    {item.totalPrice.toLocaleString()}
                  </td>
                </tr>
              ))}
              {/* Empty rows for manual entries if needed */}
              {Array.from({ length: Math.max(0, 15 - sale.items.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-cyan-300 h-8">
                  <td className="border border-cyan-300"></td>
                  <td className="border border-cyan-300"></td>
                  <td className="border border-cyan-300"></td>
                  <td className="border border-cyan-300"></td>
                  <td className="border border-cyan-300"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer - Totals */}
        <div className="px-4 py-4 mt-auto">
          <div className="flex justify-between items-end">
            <div className="text-sm text-gray-600">
              <p>دستخط: _______________</p>
            </div>
            <div className="bg-amber-500 text-white px-6 py-3 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="font-bold text-xl">{sale.totalAmount.toLocaleString()}</span>
                <span className="font-medium">{columnLabels.total}</span>
              </div>
            </div>
          </div>
          
          {/* Powered By Footer */}
          <div className="text-center mt-4 pt-2 border-t border-gray-300">
            <p className="text-xs text-gray-500" dir="ltr">Powered by JahaSoft Ltd.</p>
          </div>
        </div>
      </div>
    );
  }
);

InvoicePrint.displayName = 'InvoicePrint';
