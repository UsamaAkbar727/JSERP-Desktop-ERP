import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Setting,
  CreateSettingInput,
  UpdateSettingInput,
  ListFilters,
} from '@/types/api';

// Query keys
export const settingKeys = {
  all: ['settings'] as const,
  lists: () => [...settingKeys.all, 'list'] as const,
  list: (filters?: ListFilters) => [...settingKeys.lists(), filters] as const,
  details: () => [...settingKeys.all, 'detail'] as const,
  detail: (id: number) => [...settingKeys.details(), id] as const,
  value: (key: string) => [...settingKeys.all, 'value', key] as const,
};

// Queries
export function useSettings(filters?: ListFilters) {
  return useQuery({
    queryKey: settingKeys.list(filters),
    queryFn: async () => {
      const response = await window.api.settings.list(filters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch settings');
      }
      return response.data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - settings don't change often
  });
}

export function useSetting(id: number, enabled = true) {
  return useQuery({
    queryKey: settingKeys.detail(id),
    queryFn: async () => {
      const response = await window.api.settings.get({ key: String(id) });
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch setting');
      }
      return response.data;
    },
    enabled: enabled && id > 0,
  });
}

export function useSettingValue(key: string, enabled = true) {
  return useQuery({
    queryKey: settingKeys.value(key),
    queryFn: async () => {
      const response = await window.api.settings.getValue({ key });
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch setting value');
      }
      return response.data || '';
    },
    enabled: enabled && !!key,
    staleTime: 15 * 60 * 1000, // 15 minutes - long cache for settings
  });
}

// Mutations
export function useSetSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      key,
      value,
      description,
    }: {
      key: string;
      value: string;
      description?: string;
    }) => {
      const response = await window.api.settings.set({ key, value, description });
      if (!response.success) {
        throw new Error(response.error || 'Failed to set setting');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: settingKeys.all });
      queryClient.invalidateQueries({
        queryKey: settingKeys.value(variables.key),
      });
    },
  });
}

export function useCreateSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSettingInput) => {
      const response = await window.api.settings.set({
        key: data.setting_key,
        value: data.setting_value,
        description: data.description,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to create setting');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingKeys.all });
    },
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateSettingInput;
    }) => {
      const response = await window.api.settings.update({ id, data });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update setting');
      }
      return response.data;
    },
    onSuccess: (setting, variables) => {
      queryClient.invalidateQueries({ queryKey: settingKeys.all });
      queryClient.invalidateQueries({
        queryKey: settingKeys.detail(variables.id),
      });
      
      // Invalidate value cache if we have the key
      if (setting?.setting_key) {
        queryClient.invalidateQueries({
          queryKey: settingKeys.value(setting.setting_key),
        });
      }
    },
  });
}

export function useDeleteSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await window.api.settings.delete({ id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete setting');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingKeys.all });
    },
  });
}

export function useSettingSearch() {
  return useMutation({
    mutationFn: async (query: string) => {
      const response = await window.api.settings.search({ term: query });
      if (!response.success) {
        throw new Error(response.error || 'Failed to search settings');
      }
      return response.data || [];
    },
  });
}

// Helper hooks for common settings
export function useCompanyName() {
  return useSettingValue('company_name');
}

export function useCurrency() {
  return useSettingValue('currency');
}

export function useTaxRate() {
  return useSettingValue('tax_rate');
}

export function useDefaultPaymentMethod() {
  return useSettingValue('default_payment_method');
}
