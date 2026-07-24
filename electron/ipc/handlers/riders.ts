/**
 * Riders IPC Handlers
 * Handles IPC communication for rider/delivery personnel operations
 */

import { registerIPCHandler, validators } from '../index';
import type { CreateRiderInput, UpdateRiderInput } from '../../database/repositories';

/**
 * Register all riders-related IPC handlers
 */
export function registerRidersHandlers(): void {
  // List all riders
  registerIPCHandler('riders:list', async (event, args, repos) => {
    const { sort, pagination } = args || {};
    
    const riders = await repos.riders.getAll({
      sort: sort || { field: 'name', order: 'ASC' },
      pagination,
    });
    return riders;
  });

  // Get active riders
  registerIPCHandler('riders:active', async (event, args, repos) => {
    return repos.riders.getActiveRiders();
  });

  // Get rider by ID
  registerIPCHandler('riders:get', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Rider ID');
    
    const rider = await repos.riders.getById(id);
    if (!rider) {
      throw new Error(`Rider not found: ${id}`);
    }
    
    return rider;
  });

  // Get rider with statistics
  registerIPCHandler('riders:get-with-stats', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Rider ID');
    
    const rider = await repos.riders.getById(id);
    if (!rider) {
      throw new Error(`Rider not found: ${id}`);
    }
    
    // Get related tasks for statistics
    const tasks = await repos.goodsTasks.getByRider(id);
    
    return {
      ...rider,
      statistics: {
        total_tasks: tasks.length,
        completed_tasks: tasks.filter((t: any) => t.status === 'completed').length,
      },
    };
  });

  // Create new rider
  registerIPCHandler('riders:create', async (event, args: CreateRiderInput, repos) => {
    // Validate required fields
    validators.requiredString(args.id, 'Rider ID');
    validators.requiredString(args.name, 'Rider Name');

    if (args.email) {
      validators.email(args.email, 'Email');
    }

    return repos.riders.create(args);
  });

  // Update rider
  registerIPCHandler('riders:update', async (event, args, repos) => {
    const { id, data } = args;
    validators.requiredString(id, 'Rider ID');
    
    if (data.email !== undefined && data.email !== null) {
      validators.email(data.email, 'Email');
    }

    const success = await repos.riders.update(id, data as UpdateRiderInput);
    if (!success) {
      throw new Error('Failed to update rider');
    }
    
    return { success: true };
  });

  // Delete rider - also deletes all associated tasks
  registerIPCHandler('riders:delete', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Rider ID');

    console.log('🗑️ Attempting to delete rider and associated tasks:', id);
    
    // Get all tasks for this rider
    const tasks = await repos.goodsTasks.getByRider(id);
    console.log(`📋 Found ${tasks.length} tasks for rider ${id}`);
    
    // Delete all tasks first
    if (tasks.length > 0) {
      for (const task of tasks) {
        console.log(`🗑️ Deleting task: ${task.id}`);
        await repos.goodsTasks.delete(task.id);
      }
      console.log(`✅ Deleted ${tasks.length} tasks`);
    }
    
    // Now delete the rider
    const success = await repos.riders.delete(id, false);
    console.log('✅ Rider permanently deleted:', success);
    
    if (!success) {
      throw new Error('Failed to delete rider');
    }
    
    return { success: true, deletedTasks: tasks.length };
  });

  // Search riders
  registerIPCHandler('riders:search', async (event, args, repos) => {
    const { term } = args;
    validators.requiredString(term, 'Search term');
    
    return repos.riders.search(term);
  });

  // Get rider by phone
  registerIPCHandler('riders:by-phone', async (event, args, repos) => {
    const { phone } = args;
    validators.requiredString(phone, 'Phone Number');
    
    return repos.riders.getByPhone(phone);
  });

  // Get rider tasks
  registerIPCHandler('riders:tasks', async (event, args, repos) => {
    const { riderId, status } = args;
    validators.requiredString(riderId, 'Rider ID');
    
    const allTasks = await repos.goodsTasks.getByRider(riderId);
    
    if (status) {
      return allTasks.filter((t: any) => t.status === status);
    }
    
    return allTasks;
  });
}
