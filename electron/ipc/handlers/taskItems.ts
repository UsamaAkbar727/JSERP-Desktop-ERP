/**
 * Task Items IPC Handlers
 * Handles all IPC communication for task items (individual boxes/items tracking)
 */

import { registerIPCHandler, validators } from '../index';
import type { CreateTaskItemInput, UpdateTaskItemInput } from '../../database/repositories';

/**
 * Register all task items-related IPC handlers
 */
export function registerTaskItemsHandlers(): void {
  // Get all items for a task
  registerIPCHandler('task-items:by-task', async (event, args, repos) => {
    const { taskId } = args;
    validators.requiredString(taskId, 'Task ID');
    
    return repos.taskItems.getByTaskId(taskId);
  });

  // Get item by ID
  registerIPCHandler('task-items:get', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Item ID');
    
    const item = await repos.taskItems.getById(id);
    if (!item) {
      throw new Error(`Task item not found: ${id}`);
    }
    
    return item;
  });

  // Create new task item
  registerIPCHandler('task-items:create', async (event, args: CreateTaskItemInput, repos) => {
    // Validate required fields
    validators.requiredString(args.id, 'Item ID');
    validators.requiredString(args.task_id, 'Task ID');
    validators.requiredString(args.item_name, 'Item Name');
    
    // Verify task exists
    const task = await repos.goodsTasks.getById(args.task_id);
    if (!task) {
      throw new Error(`Task not found: ${args.task_id}`);
    }
    
    // Create item (returns ID)
    const itemId = await repos.taskItems.create(args);
    
    // Update task total_boxes count
    const totalCount = await repos.taskItems.getTotalCount(args.task_id);
    const deliveredCount = await repos.taskItems.getDeliveredCount(args.task_id);
    await repos.goodsTasks.updateDeliveryProgress(args.task_id, totalCount, deliveredCount);
    
    // Fetch and return the created item
    const item = await repos.taskItems.getById(itemId);
    return item;
  });

  // Update task item
  registerIPCHandler('task-items:update', async (event, args, repos) => {
    const { id, data } = args;
    validators.requiredString(id, 'Item ID');
    
    const item = await repos.taskItems.getById(id);
    if (!item) {
      throw new Error(`Task item not found: ${id}`);
    }
    
    const success = await repos.taskItems.update(id, data as UpdateTaskItemInput);
    if (!success) {
      throw new Error('Failed to update task item');
    }
    
    // Update task delivery progress
    const totalCount = await repos.taskItems.getTotalCount(item.task_id);
    const deliveredCount = await repos.taskItems.getDeliveredCount(item.task_id);
    await repos.goodsTasks.updateDeliveryProgress(item.task_id, totalCount, deliveredCount);
    
    return repos.taskItems.getById(id);
  });

  // Toggle item delivery status
  registerIPCHandler('task-items:toggle-delivery', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Item ID');
    
    const item = await repos.taskItems.getById(id);
    if (!item) {
      throw new Error(`Task item not found: ${id}`);
    }
    
    const success = await repos.taskItems.toggleDeliveryStatus(id);
    if (!success) {
      throw new Error('Failed to toggle delivery status');
    }
    
    // Update task delivery progress
    const totalCount = await repos.taskItems.getTotalCount(item.task_id);
    const deliveredCount = await repos.taskItems.getDeliveredCount(item.task_id);
    await repos.goodsTasks.updateDeliveryProgress(item.task_id, totalCount, deliveredCount);
    
    return repos.taskItems.getById(id);
  });

  // Mark item as delivered
  registerIPCHandler('task-items:mark-delivered', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Item ID');
    
    const item = await repos.taskItems.getById(id);
    if (!item) {
      throw new Error(`Task item not found: ${id}`);
    }
    
    const success = await repos.taskItems.markAsDelivered(id);
    if (!success) {
      throw new Error('Failed to mark item as delivered');
    }
    
    // Update task delivery progress
    const totalCount = await repos.taskItems.getTotalCount(item.task_id);
    const deliveredCount = await repos.taskItems.getDeliveredCount(item.task_id);
    await repos.goodsTasks.updateDeliveryProgress(item.task_id, totalCount, deliveredCount);
    
    return repos.taskItems.getById(id);
  });

  // Mark item as not delivered
  registerIPCHandler('task-items:mark-not-delivered', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Item ID');
    
    const item = await repos.taskItems.getById(id);
    if (!item) {
      throw new Error(`Task item not found: ${id}`);
    }
    
    const success = await repos.taskItems.markAsNotDelivered(id);
    if (!success) {
      throw new Error('Failed to mark item as not delivered');
    }
    
    // Update task delivery progress
    const totalCount = await repos.taskItems.getTotalCount(item.task_id);
    const deliveredCount = await repos.taskItems.getDeliveredCount(item.task_id);
    await repos.goodsTasks.updateDeliveryProgress(item.task_id, totalCount, deliveredCount);
    
    return repos.taskItems.getById(id);
  });

  // Delete task item
  registerIPCHandler('task-items:delete', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Item ID');
    
    const item = await repos.taskItems.getById(id);
    if (!item) {
      throw new Error(`Task item not found: ${id}`);
    }
    
    const taskId = item.task_id;
    const success = await repos.taskItems.delete(id);
    
    if (!success) {
      throw new Error('Failed to delete task item');
    }
    
    // Update task delivery progress
    const totalCount = await repos.taskItems.getTotalCount(taskId);
    const deliveredCount = await repos.taskItems.getDeliveredCount(taskId);
    await repos.goodsTasks.updateDeliveryProgress(taskId, totalCount, deliveredCount);
    
    return { success: true };
  });

  // Get delivery statistics for a task
  registerIPCHandler('task-items:stats', async (event, args, repos) => {
    const { taskId } = args;
    validators.requiredString(taskId, 'Task ID');
    
    const totalCount = await repos.taskItems.getTotalCount(taskId);
    const deliveredCount = await repos.taskItems.getDeliveredCount(taskId);
    const remainingCount = totalCount - deliveredCount;
    
    return {
      total: totalCount,
      delivered: deliveredCount,
      remaining: remainingCount,
    };
  });
}
