import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import type { GoodsSettings } from '@/data/mockData';
import { defaultGoodsSettings } from '@/data/mockData';

// Query keys
export const goodsSettingsKeys = {
  all: ['goodsSettings'] as const,
  detail: () => [...goodsSettingsKeys.all, 'detail'] as const,
};

/**
 * Fetch goods page settings from database
 */
export function useGoodsSettings() {
  return useQuery<GoodsSettings>({
    queryKey: goodsSettingsKeys.detail(),
    queryFn: async (): Promise<GoodsSettings> => {
      try {
        const response = await window.api.settings.getValue({ key: 'goods_settings' });
        
        // Handle the response objects returned from the IPC API
        const settingsData = (response?.data || response) as string;
        
        if (!settingsData) {
          return defaultGoodsSettings;
        }

        try {
          return JSON.parse(settingsData);
        } catch {
          return defaultGoodsSettings;
        }
      } catch (error) {
        console.error('Error fetching goods settings:', error);
        return defaultGoodsSettings;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Save goods page settings to database
 */
export function useSaveGoodsSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: GoodsSettings) => {
      try {
        const response = await window.api.settings.set({
          key: 'goods_settings',
          value: JSON.stringify(settings),
          description: 'Goods tracking page visibility settings',
        });

        if (!response?.success) {
          throw new Error(response?.error || 'Failed to save goods settings');
        }

        return { success: true };
      } catch (error) {
        console.error('Error saving goods settings:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate the query to refetch updated settings
      queryClient.invalidateQueries({ queryKey: goodsSettingsKeys.all });
      // Dispatch event for sidebar to listen
      window.dispatchEvent(new Event('goodsSettingChanged'));
      toast({
        title: 'Success',
        description: 'Goods settings saved successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save goods settings',
        variant: 'destructive',
      });
    },
  });
}
