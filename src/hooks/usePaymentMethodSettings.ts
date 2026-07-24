import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import type { PaymentMethodSettings } from '@/types/erp';
import { defaultPaymentMethodSettings } from '@/data/mockData';

// Query keys
export const paymentMethodSettingsKeys = {
  all: ['paymentMethodSettings'] as const,
  detail: () => [...paymentMethodSettingsKeys.all, 'detail'] as const,
};

/**
 * Fetch payment method settings from database
 */
export function usePaymentMethodSettings() {
  return useQuery<PaymentMethodSettings>({
    queryKey: paymentMethodSettingsKeys.detail(),
    queryFn: async (): Promise<PaymentMethodSettings> => {
      try {
        const response = await window.api.settings.getValue({ key: 'payment_method_settings' });
        
        // Handle the response objects returned from the IPC API
        const settingsData = (response?.data || response) as string;
        
        if (!settingsData) {
          return defaultPaymentMethodSettings;
        }

        try {
          return JSON.parse(settingsData);
        } catch {
          return defaultPaymentMethodSettings;
        }
      } catch (error) {
        console.error('Error fetching payment method settings:', error);
        return defaultPaymentMethodSettings;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Save payment method settings to database
 */
export function useSavePaymentMethodSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: PaymentMethodSettings) => {
      try {
        const response = await window.api.settings.set({
          key: 'payment_method_settings',
          value: JSON.stringify(settings),
          description: 'Payment method visibility settings',
        });

        if (!response?.success) {
          throw new Error(response?.error || 'Failed to save payment method settings');
        }

        return { success: true };
      } catch (error) {
        console.error('Error saving payment method settings:', error);
        throw error;
      }
    },
    onMutate: async (newSettings) => {
      // Cancel any outgoing refetches to prevent overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: paymentMethodSettingsKeys.all });
      
      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData<PaymentMethodSettings>(paymentMethodSettingsKeys.detail());
      
      // Update the query cache optimistically with new settings
      queryClient.setQueryData(paymentMethodSettingsKeys.detail(), newSettings);
      
      return { previousSettings };
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Payment method settings saved successfully',
      });
    },
    onError: (error, newSettings, context) => {
      // Revert to previous value on error
      if (context?.previousSettings) {
        queryClient.setQueryData(paymentMethodSettingsKeys.detail(), context.previousSettings);
      }
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save payment method settings',
        variant: 'destructive',
      });
    },
  });
}
