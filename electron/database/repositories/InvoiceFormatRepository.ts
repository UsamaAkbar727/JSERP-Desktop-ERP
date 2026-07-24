/**
 * Invoice Format Repository
 * Manages configurable invoice/bill number formats with atomic counter management.
 */

import type { Database } from 'better-sqlite3';

export type InvoiceFormatType = 'sale' | 'purchase';
export type ResetType = 'monthly' | 'yearly' | 'never';
export type DateFormat = 'YYYY-MM-DD' | 'YYYY-MM' | 'YYYY' | 'YY-MM' | 'YY' | 'none';

export interface InvoiceFormat {
  id: string;
  type: InvoiceFormatType;
  prefix: string;
  date_format: DateFormat;
  digits: number;
  reset_type: ResetType;
  last_counter: number;
  last_reset_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateInvoiceFormatInput {
  prefix?: string;
  date_format?: DateFormat;
  digits?: number;
  reset_type?: ResetType;
}

/**
 * Build the date part of the invoice number based on the chosen format.
 */
function buildDatePart(dateFormat: DateFormat, now: Date): string {
  const year = now.getFullYear().toString();
  const shortYear = year.slice(2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');

  switch (dateFormat) {
    case 'YYYY':      return year;
    case 'YY':        return shortYear;
    case 'YYYY-MM':   return `${year}-${month}`;
    case 'YY-MM':     return `${shortYear}-${month}`;
    case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
    case 'none':      return '';
    default:          return '';
  }
}

/**
 * Returns a formatted invoice number string.
 */
export function buildInvoiceNumber(
  prefix: string,
  dateFormat: DateFormat,
  digits: number,
  counter: number,
  now?: Date
): string {
  const date = now || new Date();
  const datePart = buildDatePart(dateFormat, date);
  const paddedCounter = counter.toString().padStart(digits, '0');

  if (datePart) {
    return `${prefix}-${datePart}-${paddedCounter}`;
  }
  return `${prefix}-${paddedCounter}`;
}

/**
 * Calculate the "current period" string for reset tracking.
 *  - monthly → 'YYYY-MM'
 *  - yearly  → 'YYYY'
 *  - never   → null
 */
function getCurrentPeriod(resetType: ResetType, now: Date): string | null {
  if (resetType === 'monthly') {
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  }
  if (resetType === 'yearly') {
    return now.getFullYear().toString();
  }
  return null;
}

export class InvoiceFormatRepository {
  constructor(private readonly db: Database) {}

  /**
   * Get the format configuration for a given type.
   */
  getFormat(type: InvoiceFormatType): InvoiceFormat | null {
    const stmt = this.db.prepare(
      `SELECT * FROM invoice_number_formats WHERE type = ?`
    );
    return (stmt.get(type) as InvoiceFormat | undefined) ?? null;
  }

  /**
   * Update (non-counter) format settings for a given type.
   * Resets counter to 0 and clears last_reset_date when format changes.
   */
  updateFormat(type: InvoiceFormatType, data: UpdateInvoiceFormatInput): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.prefix !== undefined)      { fields.push('prefix = ?');      values.push(data.prefix); }
    if (data.date_format !== undefined) { fields.push('date_format = ?'); values.push(data.date_format); }
    if (data.digits !== undefined)      { fields.push('digits = ?');      values.push(data.digits); }
    if (data.reset_type !== undefined)  { fields.push('reset_type = ?');  values.push(data.reset_type); }

    if (fields.length === 0) return false;

    // When format changes, reset the counter so new numbers start cleanly
    fields.push('last_counter = ?');    values.push(0);
    fields.push('last_reset_date = ?'); values.push(null);
    fields.push('updated_at = CURRENT_TIMESTAMP');

    values.push(type);
    const stmt = this.db.prepare(
      `UPDATE invoice_number_formats SET ${fields.join(', ')} WHERE type = ?`
    );
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  /**
   * Preview the NEXT invoice number WITHOUT incrementing the counter.
   * Safe to call as many times as needed (idempotent).
   */
  previewNextNumber(type: InvoiceFormatType): string {
    const format = this.getFormat(type);
    if (!format) throw new Error(`Invoice format not found for type: ${type}`);

    const now = new Date();
    const period = getCurrentPeriod(format.reset_type, now);
    const needsReset = period !== null && format.last_reset_date !== period;
    const nextCounter = needsReset ? 1 : format.last_counter + 1;

    return buildInvoiceNumber(format.prefix, format.date_format, format.digits, nextCounter, now);
  }

  /**
   * ATOMICALLY increment the counter and return the new invoice number.
   * The entire operation runs in a single SQLite transaction to prevent
   * duplicate numbers even if called concurrently.
   * Counter only advances when this function is called (i.e. on successful save).
   */
  generateNextNumber(type: InvoiceFormatType): string {
    const generateFn = this.db.transaction((): string => {
      const format = this.getFormat(type);
      if (!format) throw new Error(`Invoice format not found for type: ${type}`);

      const now = new Date();
      const period = getCurrentPeriod(format.reset_type, now);
      const needsReset = period !== null && format.last_reset_date !== period;

      const newCounter = needsReset ? 1 : format.last_counter + 1;
      const newResetDate = period ?? format.last_reset_date;

      this.db.prepare(`
        UPDATE invoice_number_formats
        SET last_counter = ?,
            last_reset_date = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE type = ?
      `).run(newCounter, newResetDate, type);

      return buildInvoiceNumber(format.prefix, format.date_format, format.digits, newCounter, now);
    });

    return generateFn();
  }

  /**
   * Check if a given number already exists in the relevant table.
   */
  isNumberUnique(type: InvoiceFormatType, number: string): boolean {
    if (type === 'sale') {
      const row = this.db.prepare(
        `SELECT 1 FROM sales WHERE invoice_number = ? LIMIT 1`
      ).get(number);
      return row === undefined;
    } else {
      const row = this.db.prepare(
        `SELECT 1 FROM purchases WHERE bill_number = ? LIMIT 1`
      ).get(number);
      return row === undefined;
    }
  }

  /**
   * Both get the format and the current preview in one call (for UI purposes).
   */
  getFormatWithPreview(type: InvoiceFormatType): { format: InvoiceFormat; preview: string } {
    const format = this.getFormat(type);
    if (!format) throw new Error(`Invoice format not found for type: ${type}`);
    const preview = this.previewNextNumber(type);
    return { format, preview };
  }
}
