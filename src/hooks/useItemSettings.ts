import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import type { ItemFormSettings } from '@/types/erp';
import { defaultItemFormSettings } from '@/data/mockData';

// Query keys
export const itemSettingsKeys = {
  all: ['itemSettings'] as const,
  detail: () => [...itemSettingsKeys.all, 'detail'] as const,
};

/**
 * Fetch item settings from database
 */
export function useItemSettings() {
  return useQuery<ItemFormSettings>({
    queryKey: itemSettingsKeys.detail(),
    queryFn: async (): Promise<ItemFormSettings> => {
      try {
        const response = await window.api.settings.getValue({ key: 'item_settings' });
        
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
        console.error('Error fetching item settings:', error);
        return defaultItemFormSettings;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Save item settings to database
 */
export function useSaveItemSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: ItemFormSettings) => {
      try {
        const response = await window.api.settings.set({
          key: 'item_settings',
          value: JSON.stringify(settings),
          description: 'Item management settings',
        });

        if (!response?.success) {
          throw new Error(response?.error || 'Failed to save item settings');
        }

        return { success: true };
      } catch (error) {
        console.error('Error saving item settings:', error);
        throw error;
      }
    },
    onMutate: async (newSettings) => {
      // Cancel any outgoing refetches to prevent overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: itemSettingsKeys.all });
      
      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData<ItemFormSettings>(itemSettingsKeys.detail());
      
      // Update the query cache optimistically with new settings
      queryClient.setQueryData(itemSettingsKeys.detail(), newSettings);
      
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
        queryClient.setQueryData(itemSettingsKeys.detail(), context.previousSettings);
      }
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save item settings',
        variant: 'destructive',
      });
    },
  });
}
