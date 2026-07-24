import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

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

export interface InvoiceFormatWithPreview {
  format: InvoiceFormat;
  preview: string;
}

export interface UpdateInvoiceFormatInput {
  prefix?: string;
  date_format?: DateFormat;
  digits?: number;
  reset_type?: ResetType;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const invoiceFormatKeys = {
  all: ['invoiceFormat'] as const,
  byType: (type: InvoiceFormatType) => ['invoiceFormat', type] as const,
  preview: (type: InvoiceFormatType) => ['invoiceFormat', type, 'preview'] as const,
};

// ─── Helper to extract data from IPC response ─────────────────────────────────

function extractData<T>(response: any): T {
  if (response?.success && response.data !== undefined) return response.data as T;
  if (response?.success === false) throw new Error(response.error || 'IPC error');
  return response as T;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetch format settings + preview for a given type.
 */
export function useInvoiceFormat(type: InvoiceFormatType) {
  return useQuery<InvoiceFormatWithPreview>({
    queryKey: invoiceFormatKeys.byType(type),
    queryFn: async () => {
      const res = await window.api.invoiceFormat.get(type);
      return extractData<InvoiceFormatWithPreview>(res);
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Preview the next number (read-only, no counter change).
 */
export function useInvoiceNumberPreview(type: InvoiceFormatType) {
  return useQuery<string>({
    queryKey: invoiceFormatKeys.preview(type),
    queryFn: async () => {
      const res = await window.api.invoiceFormat.preview(type);
      return extractData<string>(res);
    },
    staleTime: 0, // always fresh – counter changes elsewhere
    refetchOnWindowFocus: true,
  });
}

/**
 * Update the format settings for a type. Resets the counter.
 */
export function useUpdateInvoiceFormat(type: InvoiceFormatType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateInvoiceFormatInput) => {
      const res = await window.api.invoiceFormat.update(type, data);
      return extractData<InvoiceFormatWithPreview>(res);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(invoiceFormatKeys.byType(type), updated);
      queryClient.invalidateQueries({ queryKey: invoiceFormatKeys.preview(type) });
      toast({ title: 'Format saved', description: `${type === 'sale' ? 'Sale' : 'Purchase'} invoice format updated.` });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to save format', variant: 'destructive' });
    },
  });
}

/**
 * Check uniqueness of a number (IPC call).
 * Returns a function that resolves to { unique: boolean }.
 */
export async function checkInvoiceNumberUnique(
  type: InvoiceFormatType,
  number: string
): Promise<boolean> {
  try {
    const res = await window.api.invoiceFormat.checkUnique(type, number);
    const data = extractData<{ unique: boolean }>(res);
    return data.unique;
  } catch {
    return false;
  }
}
