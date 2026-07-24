import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import type { SupplierFormSettings } from '@/types/erp';
import { defaultSupplierFormSettings } from '@/data/mockData';

// Query keys
export const supplierFormSettingsKeys = {
  all: ['supplierFormSettings'] as const,
  detail: () => [...supplierFormSettingsKeys.all, 'detail'] as const,
};

/**
 * Fetch supplier form settings from database
 */
export function useSupplierFormSettings() {
  return useQuery<SupplierFormSettings>({
    queryKey: supplierFormSettingsKeys.detail(),
    queryFn: async (): Promise<SupplierFormSettings> => {
      try {
        const response = await window.api.settings.getValue({ key: 'supplier_form_settings' });
        
        // Handle the response objects returned from the IPC API
        const settingsData = (response?.data || response) as string;
        
        if (!settingsData) {
          return defaultSupplierFormSettings;
        }

        try {
          return JSON.parse(settingsData);
        } catch {
          return defaultSupplierFormSettings;
        }
      } catch (error) {
        console.error('Error fetching supplier form settings:', error);
        return defaultSupplierFormSettings;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Save supplier form settings to database
 */
export function useSaveSupplierFormSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: SupplierFormSettings) => {
      try {
        const response = await window.api.settings.set({
          key: 'supplier_form_settings',
          value: JSON.stringify(settings),
          description: 'Supplier form field visibility settings',
        });

        if (!response?.success) {
          throw new Error(response?.error || 'Failed to save supplier form settings');
        }

        return { success: true };
      } catch (error) {
        console.error('Error saving supplier form settings:', error);
        throw error;
      }
    },
    onMutate: async (newSettings) => {
      // Cancel any outgoing refetches to prevent overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: supplierFormSettingsKeys.all });
      
      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData<SupplierFormSettings>(supplierFormSettingsKeys.detail());
      
      // Update the query cache optimistically with new settings
      queryClient.setQueryData(supplierFormSettingsKeys.detail(), newSettings);
      
      return { previousSettings };
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Supplier form settings saved successfully',
      });
    },
    onError: (error, newSettings, context) => {
      // Revert to previous value on error
      if (context?.previousSettings) {
        queryClient.setQueryData(supplierFormSettingsKeys.detail(), context.previousSettings);
      }
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save supplier form settings',
        variant: 'destructive',
      });
    },
  });
}
