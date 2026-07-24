import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { InvoiceSettings } from '@/types/erp';
import { defaultInvoiceSettings } from '@/data/mockData';

// Query keys
export const invoiceSettingsKeys = {
  all: ['invoiceSettings'] as const,
  detail: () => [...invoiceSettingsKeys.all, 'detail'] as const,
};

/**
 * Fetch invoice settings from database
 */
export function useInvoiceSettings() {
  return useQuery<InvoiceSettings>({
    queryKey: invoiceSettingsKeys.detail(),
    queryFn: async (): Promise<InvoiceSettings> => {
      try {
        // Helper to extract string value from API response
        const extractValue = (response: any, defaultValue: string): string => {
          if (!response) return defaultValue;
          // Handle IPC response format: {success: true, data: "value"}
          if (response.success && response.data !== undefined) {
            return typeof response.data === 'string' ? response.data : defaultValue;
          }
          // Handle direct value
          if (typeof response === 'string') {
            return response;
          }
          return defaultValue;
        };

        // Fetch header banner URL
        const bannerResponse = await window.api.settings.getValue({ key: 'invoice_header_banner' });
        
        // Fetch column labels
        const serialNoResponse = await window.api.settings.getValue({ key: 'invoice_column_serial_no' });
        const descriptionResponse = await window.api.settings.getValue({ key: 'invoice_column_description' });
        const rateResponse = await window.api.settings.getValue({ key: 'invoice_column_rate' });
        const quantityResponse = await window.api.settings.getValue({ key: 'invoice_column_quantity' });
        const totalResponse = await window.api.settings.getValue({ key: 'invoice_column_total' });

        const result: InvoiceSettings = {
          headerBannerUrl: extractValue(bannerResponse, defaultInvoiceSettings.headerBannerUrl),
          columnLabels: {
            serialNo: extractValue(serialNoResponse, defaultInvoiceSettings.columnLabels.serialNo),
            description: extractValue(descriptionResponse, defaultInvoiceSettings.columnLabels.description),
            rate: extractValue(rateResponse, defaultInvoiceSettings.columnLabels.rate),
            quantity: extractValue(quantityResponse, defaultInvoiceSettings.columnLabels.quantity),
            total: extractValue(totalResponse, defaultInvoiceSettings.columnLabels.total),
          },
        };

        return result;
      } catch (error) {
        console.error('❌ [useInvoiceSettings] Error fetching invoice settings:', error);
        return defaultInvoiceSettings;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Save invoice settings to database
 */
export function useSaveInvoiceSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: InvoiceSettings) => {
      try {
        
        // Ensure all values are valid strings
        const headerBanner = settings.headerBannerUrl ?? '';
        const serialNo = settings.columnLabels?.serialNo ?? 'تعداد';
        const description = settings.columnLabels?.description ?? 'تفصیل';
        const rate = settings.columnLabels?.rate ?? 'نرخ';
        const quantity = settings.columnLabels?.quantity ?? 'رقم';
        const total = settings.columnLabels?.total ?? 'میزان';

        // Save header banner URL (allow empty string for deletion)
        const bannerResponse = await window.api.settings.set({
          key: 'invoice_header_banner',
          value: headerBanner,
          description: 'Invoice header banner image URL (base64)',
        });

        if (!bannerResponse?.success) {
          throw new Error(bannerResponse?.error || 'Failed to save header banner');
        }

        // Save column labels (must be non-empty)
        const serialNoResponse = await window.api.settings.set({
          key: 'invoice_column_serial_no',
          value: serialNo || 'تعداد',
          description: 'Invoice column label for Serial No',
        });

        if (!serialNoResponse?.success) {
          throw new Error(serialNoResponse?.error || 'Failed to save serial no label');
        }

        const descriptionResponse = await window.api.settings.set({
          key: 'invoice_column_description',
          value: description || 'تفصیل',
          description: 'Invoice column label for Description',
        });

        if (!descriptionResponse?.success) {
          throw new Error(descriptionResponse?.error || 'Failed to save description label');
        }

        const rateResponse = await window.api.settings.set({
          key: 'invoice_column_rate',
          value: rate || 'نرخ',
          description: 'Invoice column label for Rate',
        });

        if (!rateResponse?.success) {
          throw new Error(rateResponse?.error || 'Failed to save rate label');
        }

        const quantityResponse = await window.api.settings.set({
          key: 'invoice_column_quantity',
          value: quantity || 'رقم',
          description: 'Invoice column label for Quantity',
        });

        if (!quantityResponse?.success) {
          throw new Error(quantityResponse?.error || 'Failed to save quantity label');
        }

        const totalResponse = await window.api.settings.set({
          key: 'invoice_column_total',
          value: total || 'میزان',
          description: 'Invoice column label for Total',
        });

        if (!totalResponse?.success) {
          throw new Error(totalResponse?.error || 'Failed to save total label');
        }

        return { success: true };
      } catch (error) {
        console.error('❌ [useSaveInvoiceSettings] Error saving invoice settings:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: invoiceSettingsKeys.all });
      
      toast({
        title: 'Success',
        description: 'Invoice settings saved successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save invoice settings',
        variant: 'destructive',
      });
    },
  });
}
