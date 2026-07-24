/**
 * Task Items React Hooks
 * Provides React Query hooks for managing task items (boxes/items in a delivery task)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TaskItem, CreateTaskItemInput, UpdateTaskItemInput } from '@/types/api';

/**
 * Query keys for task items
 */
const taskItemKeys = {
  all: ['taskItems'] as const,
  byTask: (taskId: string) => [...taskItemKeys.all, 'byTask', taskId] as const,
  detail: (id: string) => [...taskItemKeys.all, 'detail', id] as const,
  stats: (taskId: string) => [...taskItemKeys.all, 'stats', taskId] as const,
};

/**
 * Get all items for a task
 */
export function useTaskItems(taskId: string, enabled = true) {
  return useQuery({
    queryKey: taskItemKeys.byTask(taskId),
    queryFn: async () => {
      const response = await window.api.taskItems.byTask(taskId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch task items');
      }
      return response.data || [];
    },
    enabled: !!taskId && enabled,
  });
}

/**
 * Get single task item
 */
export function useTaskItem(id: string, enabled = true) {
  return useQuery({
    queryKey: taskItemKeys.detail(id),
    queryFn: async () => {
      const response = await window.api.taskItems.get(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch task item');
      }
      return response.data;
    },
    enabled: !!id && enabled,
  });
}

/**
 * Get delivery statistics for a task
 */
export function useTaskItemStats(taskId: string, enabled = true) {
  return useQuery({
    queryKey: taskItemKeys.stats(taskId),
    queryFn: async () => {
      const response = await window.api.taskItems.stats(taskId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch task stats');
      }
      return response.data;
    },
    enabled: !!taskId && enabled,
  });
}

/**
 * Create a new task item
 */
export function useCreateTaskItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskItemInput) => {
      const response = await window.api.taskItems.create(data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create task item');
      }
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate task items list for this task
      queryClient.invalidateQueries({ queryKey: taskItemKeys.byTask(data!.task_id) });
      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: taskItemKeys.stats(data!.task_id) });
      // Invalidate the parent task to get updated counts
      queryClient.invalidateQueries({ queryKey: ['goodsTasks'] });
    },
  });
}

/**
 * Update a task item
 */
export function useUpdateTaskItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTaskItemInput }) => {
      const response = await window.api.taskItems.update(id, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update task item');
      }
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate task items list
      queryClient.invalidateQueries({ queryKey: taskItemKeys.byTask(data!.task_id) });
      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: taskItemKeys.stats(data!.task_id) });
      // Invalidate the parent task
      queryClient.invalidateQueries({ queryKey: ['goodsTasks'] });
    },
  });
}

/**
 * Toggle delivery status of a task item
 */
export function useToggleTaskItemDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await window.api.taskItems.toggleDelivery(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to toggle delivery status');
      }
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate task items list
      queryClient.invalidateQueries({ queryKey: taskItemKeys.byTask(data!.task_id) });
      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: taskItemKeys.stats(data!.task_id) });
      // Invalidate the parent task
      queryClient.invalidateQueries({ queryKey: ['goodsTasks'] });
    },
  });
}

/**
 * Mark item as delivered
 */
export function useMarkTaskItemDelivered() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await window.api.taskItems.markDelivered(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to mark item as delivered');
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskItemKeys.byTask(data!.task_id) });
      queryClient.invalidateQueries({ queryKey: taskItemKeys.stats(data!.task_id) });
      queryClient.invalidateQueries({ queryKey: ['goodsTasks'] });
    },
  });
}

/**
 * Mark item as not delivered
 */
export function useMarkTaskItemNotDelivered() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await window.api.taskItems.markNotDelivered(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to mark item as not delivered');
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskItemKeys.byTask(data!.task_id) });
      queryClient.invalidateQueries({ queryKey: taskItemKeys.stats(data!.task_id) });
      queryClient.invalidateQueries({ queryKey: ['goodsTasks'] });
    },
  });
}

/**
 * Delete a task item
 */
export function useDeleteTaskItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      const response = await window.api.taskItems.delete(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete task item');
      }
      return { taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskItemKeys.byTask(data.taskId) });
      queryClient.invalidateQueries({ queryKey: taskItemKeys.stats(data.taskId) });
      queryClient.invalidateQueries({ queryKey: ['goodsTasks'] });
    },
  });
}
