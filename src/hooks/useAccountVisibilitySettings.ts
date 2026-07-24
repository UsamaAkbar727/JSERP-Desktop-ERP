import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import type { AccountVisibilitySettings } from '@/types/erp';

// Query keys
export const accountVisibilitySettingsKeys = {
  all: ['accountVisibilitySettings'] as const,
  detail: () => [...accountVisibilitySettingsKeys.all, 'detail'] as const,
};

/**
 * Fetch account visibility settings from database
 */
export function useAccountVisibilitySettings() {
  return useQuery<AccountVisibilitySettings>({
    queryKey: accountVisibilitySettingsKeys.detail(),
    queryFn: async (): Promise<AccountVisibilitySettings> => {
      try {
        const response = await window.api.settings.getValue({ key: 'account_visibility_settings' });
        
        // Handle the response objects returned from the IPC API
        const settingsData = (response?.data || response) as string;
        
        if (!settingsData) {
          return {};
        }

        try {
          return JSON.parse(settingsData);
        } catch {
          return {};
        }
      } catch (error) {
        console.error('Error fetching account visibility settings:', error);
        return {};
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Save account visibility settings to database
 */
export function useSaveAccountVisibilitySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: AccountVisibilitySettings) => {
      try {
        const response = await window.api.settings.set({
          key: 'account_visibility_settings',
          value: JSON.stringify(settings),
          description: 'Account visibility settings for payment selector',
        });

        if (!response?.success) {
          throw new Error(response?.error || 'Failed to save account visibility settings');
        }

        return { success: true };
      } catch (error) {
        console.error('Error saving account visibility settings:', error);
        throw error;
      }
    },
    onMutate: async (newSettings) => {
      // Cancel any outgoing refetches to prevent overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: accountVisibilitySettingsKeys.all });
      
      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData<AccountVisibilitySettings>(accountVisibilitySettingsKeys.detail());
      
      // Update the query cache optimistically with new settings
      queryClient.setQueryData(accountVisibilitySettingsKeys.detail(), newSettings);
      
      return { previousSettings };
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Account visibility settings saved successfully',
      });
    },
    onError: (error, newSettings, context) => {
      // Revert to previous value on error
      if (context?.previousSettings) {
        queryClient.setQueryData(accountVisibilitySettingsKeys.detail(), context.previousSettings);
      }
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save account visibility settings',
        variant: 'destructive',
      });
    },
  });
}
