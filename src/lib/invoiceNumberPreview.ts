import type { DateFormat } from '@/hooks/useInvoiceNumberFormat';

/**
 * Build a live preview of an invoice number on the client side.
 * Uses the current browser date – mirrors the logic in InvoiceFormatRepository.
 */
export function buildLivePreview(
  prefix: string,
  dateFormat: DateFormat,
  digits: number,
  counter = 1,
  now: Date = new Date()
): string {
  const safePrefix = (prefix || 'INV').toUpperCase().replace(/\s+/g, '');
  const year = now.getFullYear().toString();
  const shortYear = year.slice(2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const paddedCounter = counter.toString().padStart(digits, '0');

  let datePart = '';
  switch (dateFormat) {
    case 'YYYY':       datePart = year; break;
    case 'YY':         datePart = shortYear; break;
    case 'YYYY-MM':    datePart = `${year}-${month}`; break;
    case 'YY-MM':      datePart = `${shortYear}-${month}`; break;
    case 'YYYY-MM-DD': datePart = `${year}-${month}-${day}`; break;
    case 'none':       datePart = ''; break;
    default:           datePart = '';
  }

  if (datePart) {
    return `${safePrefix}-${datePart}-${paddedCounter}`;
  }
  return `${safePrefix}-${paddedCounter}`;
}
