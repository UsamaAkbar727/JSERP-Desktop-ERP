/**
 * Goods Tasks IPC Handlers
 * Handles IPC communication for goods delivery task operations
 */

import { registerIPCHandler, validators } from '../index';
import type { CreateGoodsTaskInput, UpdateGoodsTaskInput } from '../../database/repositories';

/**
 * Register all goods tasks-related IPC handlers
 */
export function registerGoodsTasksHandlers(): void {
  // List all goods tasks
  registerIPCHandler('goods-tasks:list', async (event, args, repos) => {
    const { riderId, status, type, startDate, endDate, sort, pagination } = args || {};
    
    const tasks = await repos.goodsTasks.getAll({
      filters: {
        ...(riderId && { rider_id: riderId }),
        ...(status && { status }),
        ...(type && { type }),
      },
      sort: sort || { field: 'created_at', order: 'DESC' },
      pagination,
    });
    return tasks;
  });

  // Get goods task by ID
  registerIPCHandler('goods-tasks:get', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Task ID');
    
    const task = await repos.goodsTasks.getById(id);
    if (!task) {
      throw new Error(`Goods task not found: ${id}`);
    }
    
    return task;
  });

  // Get task with details
  registerIPCHandler('goods-tasks:get-with-details', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Task ID');
    
    const task = await repos.goodsTasks.getById(id);
    if (!task) {
      throw new Error(`Goods task not found: ${id}`);
    }
    
    // Fetch related data
    const rider = task.rider_id ? await repos.riders.getById(task.rider_id) : null;
    const sale = task.sale_id ? await repos.sales.getById(task.sale_id) : null;
    
    return {
      ...task,
      rider,
      sale,
    };
  });

  // Create new goods task
  registerIPCHandler('goods-tasks:create', async (event, args: CreateGoodsTaskInput, repos) => {
    // Validate required fields
    validators.requiredString(args.rider_id, 'Rider ID');

    return repos.goodsTasks.create(args);
  });

  // Update goods task
  registerIPCHandler('goods-tasks:update', async (event, args, repos) => {
    const { id, data } = args;
    validators.requiredString(id, 'Task ID');
    
    if (data.status !== undefined) {
      validators.oneOf(data.status, ['pending', 'in_transit', 'delivered', 'cancelled'], 'Task Status');
    }

    const success = await repos.goodsTasks.update(id, data);
    if (!success) {
      throw new Error('Failed to update goods task');
    }
    
    return { success: true };
  });

  // Update task status
  registerIPCHandler('goods-tasks:update-status', async (event, args, repos) => {
    const { id, status } = args;
    validators.requiredString(id, 'Task ID');
    validators.oneOf(status, ['pending', 'in_transit', 'delivered', 'cancelled'], 'Task Status');

    const success = await repos.goodsTasks.updateStatus(id, status);
    if (!success) {
      throw new Error('Failed to update task status');
    }
    
    return { success: true };
  });

  // Assign task to rider
  registerIPCHandler('goods-tasks:assign', async (event, args, repos) => {
    const { id, riderId } = args;
    validators.requiredString(id, 'Task ID');
    validators.requiredString(riderId, 'Rider ID');

    const success = await repos.goodsTasks.update(id, { 
      rider_id: riderId, 
      status: 'in_transit' 
    });
    if (!success) {
      throw new Error('Failed to assign task to rider');
    }
    
    return { success: true };
  });

  // Delete goods task (soft delete)
  registerIPCHandler('goods-tasks:delete', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Task ID');

    const success = await repos.goodsTasks.delete(id, true);
    if (!success) {
      throw new Error('Failed to delete goods task');
    }
    
    return { success: true };
  });

  // Search goods tasks
  registerIPCHandler('goods-tasks:search', async (event, args, repos) => {
    const { term } = args;
    validators.requiredString(term, 'Search term');
    
    return repos.goodsTasks.search(term);
  });

  // Get tasks by rider
  registerIPCHandler('goods-tasks:by-rider', async (event, args, repos) => {
    const { riderId } = args;
    validators.requiredString(riderId, 'Rider ID');
    
    return repos.goodsTasks.getByRider(riderId);
  });

  // Get tasks by status
  registerIPCHandler('goods-tasks:by-status', async (event, args, repos) => {
    const { status } = args;
    validators.oneOf(status, ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'], 'Task Status');
    
    return repos.goodsTasks.getByStatus(status);
  });

  // Get tasks by sale
  registerIPCHandler('goods-tasks:by-sale', async (event, args, repos) => {
    const { saleId } = args;
    validators.requiredNumber(saleId, 'Sale ID');
    
    return repos.goodsTasks.getBySale(saleId);
  });

  // Get pending tasks
  registerIPCHandler('goods-tasks:pending', async (event, args, repos) => {
    return repos.goodsTasks.getByStatus('pending');
  });

  // Get tasks by date range
  registerIPCHandler('goods-tasks:by-date-range', async (event, args, repos) => {
    const { startDate, endDate } = args;
    validators.requiredString(startDate, 'Start Date');
    validators.requiredString(endDate, 'End Date');
    
    return repos.goodsTasks.getTasksByDateRange(startDate, endDate);
  });
}
