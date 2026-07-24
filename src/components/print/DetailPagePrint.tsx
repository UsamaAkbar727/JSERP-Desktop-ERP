import { forwardRef } from 'react';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import type { Sale, InvoiceSettings } from '@/types/erp';

interface PaymentRow {
  id: string;
  payment_date: string;
  payment_method: string;
  account_name?: string;
  amount: number;
  notes?: string;
}

interface DetailPagePrintProps {
  sale: Sale;
  settings: InvoiceSettings;
  detailTitle: string;
  statusLabel: string;
  partyLabel: string;
  paymentTitle: string;
  outstandingLabel: string;
  payments: PaymentRow[];
}

export const DetailPagePrint = forwardRef<HTMLDivElement, DetailPagePrintProps>(
  (
    {
      sale,
      settings,
      detailTitle,
      statusLabel,
      partyLabel,
      paymentTitle,
      outstandingLabel,
      payments,
    },
    ref
  ) => {
    const { headerBannerUrl } = settings;

    return (
      <div
        ref={ref}
        className="bg-white text-black p-0 w-[210mm] min-h-[297mm] mx-auto"
        dir="rtl"
        style={{ fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif" }}
      >
        {headerBannerUrl ? (
          <div className="w-full">
            <img src={headerBannerUrl} alt="Invoice Header" className="w-full h-auto object-contain" />
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

        <div className="px-6 py-4 flex justify-between items-start border-b-2 border-cyan-500 bg-cyan-50">
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-cyan-700 font-medium">نمبر:</span>
              <span className="font-bold text-lg">{sale.invoiceNumber}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-700 font-medium">{partyLabel}:</span>
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

        <div className="px-4 py-4 space-y-4">
          <div className="border rounded-lg border-cyan-300 p-3">
            <h3 className="font-bold text-lg mb-3">{detailTitle}</h3>

            <div className="grid grid-cols-4 gap-3 mb-3 text-sm">
              <div>
                <p className="text-gray-600">نمبر</p>
                <p className="font-bold">{sale.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-gray-600">تاریخ</p>
                <p className="font-bold">{sale.saleDate}</p>
              </div>
              <div>
                <p className="text-gray-600">{partyLabel}</p>
                <p className="font-bold">{sale.customerName}</p>
              </div>
              <div>
                <p className="text-gray-600">{statusLabel}</p>
                <p className="font-bold">
                  {sale.paymentStatus === 'paid' ? 'ادا شدہ'
                    : sale.paymentStatus === 'partial' ? 'جزوی ادائیگی'
                    : sale.paymentStatus === 'due' ? 'باقی'
                    : sale.paymentStatus}
                </p>
              </div>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-amber-500 text-white">
                  <th className="border border-cyan-600 py-2 px-3 text-center w-16">تعداد</th>
                  <th className="border border-cyan-600 py-2 px-3 text-right">تفصیل</th>
                  <th className="border border-cyan-600 py-2 px-3 text-center w-24">یونٹ</th>
                  <th className="border border-cyan-600 py-2 px-3 text-center w-28">نرخ</th>
                  <th className="border border-cyan-600 py-2 px-3 text-center w-28">میزان</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, index) => (
                  <tr key={item.id} className="border-b border-cyan-300">
                    <td className="border border-cyan-300 py-2 px-3 text-center">{index + 1}</td>
                    <td className="border border-cyan-300 py-2 px-3 text-right font-medium">{item.itemName}</td>
                    <td className="border border-cyan-300 py-2 px-3 text-center">{item.quantity} {item.unit || ''}</td>
                    <td className="border border-cyan-300 py-2 px-3 text-center">
                      <CurrencyDisplay amount={item.unitPrice} />
                    </td>
                    <td className="border border-cyan-300 py-2 px-3 text-center font-bold">
                      <CurrencyDisplay amount={item.totalPrice} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border rounded-lg border-cyan-300 p-3">
            <h3 className="font-bold text-lg mb-3">{paymentTitle}</h3>
            {payments.length > 0 ? (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-cyan-50">
                    <th className="border border-cyan-300 py-2 px-3 text-right">تاریخ</th>
                    <th className="border border-cyan-300 py-2 px-3 text-right">طریقہ</th>
                    <th className="border border-cyan-300 py-2 px-3 text-right">اکاؤنٹ</th>
                    <th className="border border-cyan-300 py-2 px-3 text-left">رقم</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="border border-cyan-300 py-2 px-3">{new Date(payment.payment_date).toLocaleDateString()}</td>
                      <td className="border border-cyan-300 py-2 px-3">{payment.payment_method}</td>
                      <td className="border border-cyan-300 py-2 px-3">{payment.account_name || '-'}</td>
                      <td className="border border-cyan-300 py-2 px-3 text-left font-bold">
                        <CurrencyDisplay amount={payment.amount} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-600">No payments recorded</p>
            )}

            {sale.dueAmount > 0 && (
              <div className="mt-3 flex justify-between items-center bg-cyan-50 border border-cyan-300 rounded px-3 py-2">
                <span className="font-medium">{outstandingLabel}</span>
                <span className="font-bold text-red-600">
                  <CurrencyDisplay amount={sale.dueAmount} />
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-4 mt-auto">
          <div className="flex justify-between items-end">
            <div className="text-sm text-gray-600">
              <p>دستخط: _______________</p>
            </div>
            <div className="bg-amber-500 text-white px-6 py-3 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="font-bold text-xl">{sale.totalAmount.toLocaleString()}</span>
                <span className="font-medium">کل رقم</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-4 pt-2 border-t border-gray-300">
            <p className="text-xs text-gray-500" dir="ltr">Powered by JuttSoft Ltd.</p>
          </div>
        </div>
      </div>
    );
  }
);

DetailPagePrint.displayName = 'DetailPagePrint';
