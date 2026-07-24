/**
 * Invoice Format IPC Handlers
 * Manages configurable invoice/bill number format settings.
 */

import { registerIPCHandler, validators } from '../index';
import type { UpdateInvoiceFormatInput, InvoiceFormatType } from '../../database/repositories/InvoiceFormatRepository';

export function registerInvoiceFormatHandlers(): void {

  // ─── Get format + preview ─────────────────────────────────────────────────

  registerIPCHandler('invoice-format:get', async (event, args, repos) => {
    const { type } = args as { type: InvoiceFormatType };
    validators.requiredString(type, 'Invoice Type');
    return repos.invoiceFormat.getFormatWithPreview(type);
  });

  // ─── Update format settings (resets counter) ──────────────────────────────

  registerIPCHandler('invoice-format:update', async (event, args, repos) => {
    const { type, data } = args as { type: InvoiceFormatType; data: UpdateInvoiceFormatInput };
    validators.requiredString(type, 'Invoice Type');

    const success = repos.invoiceFormat.updateFormat(type, data);
    if (!success) throw new Error(`Failed to update ${type} invoice format`);

    // Return updated format with new preview
    return repos.invoiceFormat.getFormatWithPreview(type);
  });

  // ─── Preview next number (NO counter change) ──────────────────────────────

  registerIPCHandler('invoice-format:preview', async (event, args, repos) => {
    const { type } = args as { type: InvoiceFormatType };
    validators.requiredString(type, 'Invoice Type');
    return repos.invoiceFormat.previewNextNumber(type);
  });

  // ─── Check if a number is unique ──────────────────────────────────────────

  registerIPCHandler('invoice-format:check-unique', async (event, args, repos) => {
    const { type, number } = args as { type: InvoiceFormatType; number: string };
    validators.requiredString(type, 'Invoice Type');
    validators.requiredString(number, 'Invoice Number');
    const unique = repos.invoiceFormat.isNumberUnique(type, number);
    return { unique };
  });
}
