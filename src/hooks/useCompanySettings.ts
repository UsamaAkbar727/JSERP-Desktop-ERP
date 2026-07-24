import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

export interface CompanySettings {
  companyName: string;
  invoicePrefix: string;
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'My Company',
  invoicePrefix: 'INV',
};

// Query keys
export const companySettingsKeys = {
  all: ['companySettings'] as const,
  detail: () => [...companySettingsKeys.all, 'detail'] as const,
};

/**
 * Fetch company settings from database
 */
export function useCompanySettings() {
  return useQuery<CompanySettings>({
    queryKey: companySettingsKeys.detail(),
    queryFn: async (): Promise<CompanySettings> => {
      try {
                
        const nameResponse = await window.api.settings.getValue({ key: 'company_name' });
                
        const prefixResponse = await window.api.settings.getValue({ key: 'invoice_prefix' });
        
        // Handle the response objects returned from the IPC API - the value is plain string now
        let companyName = (nameResponse?.data || nameResponse) as string;
        let invoicePrefix = (prefixResponse?.data || prefixResponse) as string;
        
        // Clean up any accidental JSON stringification (in case of old data)
        if (companyName && (companyName.startsWith('"') && companyName.endsWith('"'))) {
          companyName = companyName.slice(1, -1);
        }
        if (invoicePrefix && (invoicePrefix.startsWith('"') && invoicePrefix.endsWith('"'))) {
          invoicePrefix = invoicePrefix.slice(1, -1);
        }

        const result = {
          companyName: companyName || DEFAULT_COMPANY_SETTINGS.companyName,
          invoicePrefix: invoicePrefix || DEFAULT_COMPANY_SETTINGS.invoicePrefix,
        };
        
                return result;
      } catch (error) {
        console.error('❌ [useCompanySettings] Error fetching company settings:', error);
        return DEFAULT_COMPANY_SETTINGS;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Save company settings to database
 */
export function useSaveCompanySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: CompanySettings) => {
      try {
                
        // Save company name
                const nameResponse = await window.api.settings.set({
          key: 'company_name',
          value: settings.companyName,
          description: 'Company name for invoices and documents',
        });

        
        if (!nameResponse?.success) {
          throw new Error(nameResponse?.error || 'Failed to save company name');
        }

        // Save invoice prefix
                const prefixResponse = await window.api.settings.set({
          key: 'invoice_prefix',
          value: settings.invoicePrefix,
          description: 'Prefix for invoice numbers',
        });

        
        if (!prefixResponse?.success) {
          throw new Error(prefixResponse?.error || 'Failed to save invoice prefix');
        }

                return { success: true };
      } catch (error) {
        console.error('❌ [useSaveCompanySettings] Error saving company settings:', error);
        throw error;
      }
    },
    onSuccess: () => {
            // Invalidate the query to refetch updated settings
      queryClient.invalidateQueries({ queryKey: companySettingsKeys.all });
      toast({
        title: 'Success',
        description: 'Company settings saved successfully',
      });
    },
    onError: (error) => {
      console.error('⚠️ [useSaveCompanySettings] onError:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save company settings',
        variant: 'destructive',
      });
    },
  });
}
