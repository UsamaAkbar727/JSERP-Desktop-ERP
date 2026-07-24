import { Sale, InvoiceSettings } from '@/types/erp';
import { SaleWithItems, PurchaseWithItems } from '@/types/api';

/**
 * Transforms API sale data to ERP Sale format for printing
 */
export function transformSaleForPrint(saleData: SaleWithItems): Sale {
  return {
    id: saleData.id,
    invoiceNumber: saleData.invoice_number,
    customerId: saleData.customer_id,
    customerName: saleData.customer_name || 'Walk-in Customer',
    saleDate: new Date(saleData.sale_date).toLocaleDateString(),
    subtotal: saleData.subtotal,
    discountAmount: saleData.discount_amount,
    discountPercent: saleData.discount_percent,
    totalAmount: saleData.total_amount,
    paidAmount: saleData.paid_amount,
    dueAmount: saleData.due_amount,
    paymentStatus: saleData.payment_status,
    paymentMethod: saleData.payment_method,
    accountId: saleData.account_id,
    chequeAccountId: saleData.cheque_account_id,
    notes: saleData.notes,
    items:
      saleData.items?.map((item) => ({
        id: item.id,
        saleId: saleData.id,
        itemId: item.item_id,
        itemName: item.item_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
        unit: item.unit || 'pcs',
      })) || [],
  };
}

/**
 * Transforms API purchase data to ERP Sale format for printing
 * (We reuse the Sale interface for purchases with appropriate labels)
 */
export function transformPurchaseForPrint(purchaseData: PurchaseWithItems): Sale {
  return {
    id: purchaseData.id,
    invoiceNumber: purchaseData.bill_number || '',
    customerId: purchaseData.supplier_id || '',
    customerName: purchaseData.supplier_name || 'Unknown Supplier',
    saleDate: new Date(purchaseData.purchase_date).toLocaleDateString(),
    subtotal: purchaseData.subtotal,
    discountAmount: purchaseData.discount_amount,
    discountPercent: purchaseData.discount_percent,
    totalAmount: purchaseData.total_amount,
    paidAmount: purchaseData.paid_amount,
    dueAmount: purchaseData.due_amount,
    paymentStatus: purchaseData.payment_status,
    paymentMethod: purchaseData.payment_method as any,
    accountId: purchaseData.account_id,
    notes: purchaseData.notes,
    items:
      purchaseData.items?.map((item) => ({
        id: item.id,
        saleId: purchaseData.id,
        itemId: item.item_id,
        itemName: item.item_name || 'Unknown Item',
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
        unit: item.unit_name || 'pcs',
      })) || [],
  };
}

/**
 * Opens a print window with the provided content
 */
export function openPrintWindow(
  printContent: string,
  title: string,
  format: 'classic' | 'thermal' = 'classic',
  options?: {
    headContent?: string;
    closeDelayMs?: number;
  }
) {
  const isRTL = format === 'classic';
  const width = format === 'thermal' ? '80mm' : '210mm';
  const closeDelayMs = options?.closeDelayMs ?? 500;

  const printableHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">
      ${options?.headContent || ''}
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: ${format === 'thermal' ? "'Courier New', monospace" : "'Noto Nastaliq Urdu', serif"};
          ${isRTL ? 'direction: rtl;' : ''}
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: ${width} auto; margin: 0; }
        }
        .bg-white { background: white; }
        .text-black { color: black; }
        .text-white { color: white; }
        .font-bold { font-weight: bold; }
        .font-medium { font-weight: 500; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .text-sm { font-size: 0.875rem; }
        .text-xs { font-size: 0.75rem; }
        .text-lg { font-size: 1.125rem; }
        .text-xl { font-size: 1.25rem; }
        .text-2xl { font-size: 1.5rem; }
        .p-0 { padding: 0; }
        .p-2 { padding: 0.5rem; }
        .p-3 { padding: 0.75rem; }
        .p-4 { padding: 1rem; }
        .p-6 { padding: 1.5rem; }
        .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
        .px-4 { padding-left: 1rem; padding-right: 1rem; }
        .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
        .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
        .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
        .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
        .mb-1 { margin-bottom: 0.25rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mt-auto { margin-top: auto; }
        .gap-2 { gap: 0.5rem; }
        .gap-4 { gap: 1rem; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .items-start { align-items: start; }
        .items-end { align-items: end; }
        .justify-between { justify-content: space-between; }
        .w-full { width: 100%; }
        .w-16 { width: 4rem; }
        .w-24 { width: 6rem; }
        .w-28 { width: 7rem; }
        .h-8 { height: 2rem; }
        .h-auto { height: auto; }
        .min-h-\\[297mm\\] { min-height: 297mm; }
        .mx-auto { margin-left: auto; margin-right: auto; }
        .border { border-width: 1px; border-style: solid; }
        .border-b { border-bottom-width: 1px; border-bottom-style: solid; }
        .border-b-2 { border-bottom-width: 2px; border-bottom-style: solid; }
        .border-collapse { border-collapse: collapse; }
        .border-cyan-300 { border-color: #67e8f9; }
        .border-cyan-500 { border-color: #06b6d4; }
        .border-cyan-600 { border-color: #0891b2; }
        .bg-cyan-50 { background-color: #ecfeff; }
        .bg-amber-500 { background-color: #f59e0b; }
        .bg-gradient-to-r { background-image: linear-gradient(to right, var(--tw-gradient-stops)); }
        .from-cyan-400 { --tw-gradient-from: #22d3ee; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(34, 211, 238, 0)); }
        .to-cyan-600 { --tw-gradient-to: #0891b2; }
        .rounded-lg { border-radius: 0.5rem; }
        .object-contain { object-fit: contain; }
        .text-cyan-700 { color: #0e7490; }
        .text-gray-600 { color: #4b5563; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #67e8f9; padding: 0.5rem 0.75rem; }
        th { background-color: #f59e0b; color: white; }
      </style>
    </head>
    <body>
      ${printContent}
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(
      printableHtml.replace(
        '<body>',
        `<body onload="setTimeout(function(){ window.print(); window.close(); }, ${closeDelayMs});">`
      )
    );
    printWindow.document.close();
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    throw new Error('Failed to initialize print frame.');
  }

  iframeDoc.open();
  iframeDoc.write(printableHtml);
  iframeDoc.close();

  const cleanup = () => {
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  };

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    cleanup();
  };
}

/**
 * Generic print handler for rendering invoice preview
 */
export function renderInvoiceToHTML(
  _sale: Sale,
  _settings: InvoiceSettings
): string {
  return '';
}
