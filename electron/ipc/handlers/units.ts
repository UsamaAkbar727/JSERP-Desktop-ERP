/**
 * Units IPC Handlers
 * Handles IPC communication for unit/measurement operations
 */

import { registerIPCHandler, validators } from '../index';
import type { CreateUnitInput, UpdateUnitInput } from '../../database/repositories';

/**
 * Register all units-related IPC handlers
 */
export function registerUnitsHandlers(): void {
  // List all units
  registerIPCHandler('units:list', async (event, args, repos) => {
    const { sort, pagination } = args || {};
    
    const units = await repos.units.getAll({
      sort: sort || { field: 'name', order: 'ASC' },
      pagination,
    });
    return units;
  });

  // Get unit by ID
  registerIPCHandler('units:get', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Unit ID');
    
    const unit = await repos.units.getById(id);
    if (!unit) {
      throw new Error(`Unit not found: ${id}`);
    }
    
    return unit;
  });

  // Create new unit
  registerIPCHandler('units:create', async (event, args: CreateUnitInput, repos) => {
    
    // Validate required fields
    try {
      validators.requiredString(args.id, 'Unit ID');
      validators.requiredString(args.name, 'Unit Name');
      validators.requiredString(args.symbol, 'Unit Symbol');
    } catch (error) {
      throw error;
    }

    const unitId = await repos.units.create(args);
    return unitId;
  });

  // Update unit
  registerIPCHandler('units:update', async (event, args, repos) => {
    
    const { id, data } = args;
    validators.requiredString(id, 'Unit ID');

    const success = await repos.units.update(id, data as UpdateUnitInput);
    if (!success) {
      throw new Error('Failed to update unit');
    }
    
    return { success: true };
  });

  // Delete unit (soft delete)
  registerIPCHandler('units:delete', async (event, args, repos) => {
    const { id } = args;
    
    validators.requiredString(id, 'Unit ID');

    const success = await repos.units.delete(id, true);
    if (!success) {
      throw new Error('Failed to delete unit');
    }
    
    return { success: true };
  });

  // Search units
  registerIPCHandler('units:search', async (event, args, repos) => {
    const { term } = args;
    validators.requiredString(term, 'Search term');
    
    return repos.units.search(term);
  });

  // Get unit usage count
  registerIPCHandler('units:usage-count', async (event, args, repos) => {
    const { unitId } = args;
    validators.requiredString(unitId, 'Unit ID');
    
    return repos.units.getUsageCount(unitId);
  });
}
