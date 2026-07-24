import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import type { ItemFormSettings } from '@/types/erp';
import { defaultItemFormSettings } from '@/data/mockData';

// Query keys
export const itemFormSettingsKeys = {
  all: ['itemFormSettings'] as const,
  detail: () => [...itemFormSettingsKeys.all, 'detail'] as const,
};

/**
 * Fetch item form settings from database
 */
export function useItemFormSettings() {
  return useQuery<ItemFormSettings>({
    queryKey: itemFormSettingsKeys.detail(),
    queryFn: async (): Promise<ItemFormSettings> => {
      try {
        const response = await window.api.settings.getValue({ key: 'item_form_settings' });
        
        // Handle the response objects returned from the IPC API
        const settingsData = (response?.data || response) as string;
        
        if (!settingsData) {
          return defaultItemFormSettings;
        }

        try {
          return JSON.parse(settingsData);
        } catch {
          return defaultItemFormSettings;
        }
      } catch (error) {
        console.error('Error fetching item form settings:', error);
        return defaultItemFormSettings;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Save item form settings to database
 */
export function useSaveItemFormSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: ItemFormSettings) => {
      try {
        const response = await window.api.settings.set({
          key: 'item_form_settings',
          value: JSON.stringify(settings),
          description: 'Item form settings and options',
        });

        if (!response?.success) {
          throw new Error(response?.error || 'Failed to save item form settings');
        }

        return { success: true };
      } catch (error) {
        console.error('Error saving item form settings:', error);
        throw error;
      }
    },
    onMutate: async (newSettings) => {
      // Cancel any outgoing refetches to prevent overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: itemFormSettingsKeys.all });
      
      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData<ItemFormSettings>(itemFormSettingsKeys.detail());
      
      // Update the query cache optimistically with new settings
      queryClient.setQueryData(itemFormSettingsKeys.detail(), newSettings);
      
      return { previousSettings };
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Item settings saved successfully',
      });
    },
    onError: (error, newSettings, context) => {
      // Revert to previous value on error
      if (context?.previousSettings) {
        queryClient.setQueryData(itemFormSettingsKeys.detail(), context.previousSettings);
      }
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save item settings',
        variant: 'destructive',
      });
    },
  });
}
