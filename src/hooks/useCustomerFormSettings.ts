import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import type { CustomerFormSettings } from '@/types/erp';
import { defaultCustomerFormSettings } from '@/data/mockData';

// Query keys
export const customerFormSettingsKeys = {
  all: ['customerFormSettings'] as const,
  detail: () => [...customerFormSettingsKeys.all, 'detail'] as const,
};

/**
 * Fetch customer form settings from database
 */
export function useCustomerFormSettings() {
  return useQuery<CustomerFormSettings>({
    queryKey: customerFormSettingsKeys.detail(),
    queryFn: async (): Promise<CustomerFormSettings> => {
      try {
        const response = await window.api.settings.getValue({ key: 'customer_form_settings' });
        
        // Handle the response objects returned from the IPC API
        const settingsData = (response?.data || response) as string;
        
        if (!settingsData) {
          return defaultCustomerFormSettings;
        }

        try {
          return JSON.parse(settingsData);
        } catch {
          return defaultCustomerFormSettings;
        }
      } catch (error) {
        console.error('Error fetching customer form settings:', error);
        return defaultCustomerFormSettings;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Save customer form settings to database
 */
export function useSaveCustomerFormSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: CustomerFormSettings) => {
      try {
        const response = await window.api.settings.set({
          key: 'customer_form_settings',
          value: JSON.stringify(settings),
          description: 'Customer form field visibility settings',
        });

        if (!response?.success) {
          throw new Error(response?.error || 'Failed to save customer form settings');
        }

        return { success: true };
      } catch (error) {
        console.error('Error saving customer form settings:', error);
        throw error;
      }
    },
    onMutate: async (newSettings) => {
      // Cancel any outgoing refetches to prevent overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: customerFormSettingsKeys.all });
      
      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData<CustomerFormSettings>(customerFormSettingsKeys.detail());
      
      // Update the query cache optimistically with new settings
      queryClient.setQueryData(customerFormSettingsKeys.detail(), newSettings);
      
      return { previousSettings };
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Customer form settings saved successfully',
      });
    },
    onError: (error, newSettings, context) => {
      // Revert to previous value on error
      if (context?.previousSettings) {
        queryClient.setQueryData(customerFormSettingsKeys.detail(), context.previousSettings);
      }
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save customer form settings',
        variant: 'destructive',
      });
    },
  });
}
