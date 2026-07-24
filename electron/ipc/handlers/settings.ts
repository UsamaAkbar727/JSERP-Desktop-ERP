/**
 * Settings IPC Handlers
 * Handles IPC communication for application settings operations
 */

import { registerIPCHandler, validators } from '../index';

/**
 * Register all settings-related IPC handlers
 */
export function registerSettingsHandlers(): void {
  // List all settings
  registerIPCHandler('settings:list', async (event, args, repos) => {
    const settings = await repos.settings.getAll();
    return settings;
  });

  // Get setting by key
  registerIPCHandler('settings:get', async (event, args, repos) => {
    const { key } = args;
    validators.requiredString(key, 'Setting Key');
    
    const setting = await repos.settings.getById(key);
    if (!setting) {
      throw new Error(`Setting not found: ${key}`);
    }
    return setting;
  });

  // Get setting value
  registerIPCHandler('settings:get-value', async (event, args, repos) => {
    const { key } = args;
    validators.requiredString(key, 'Setting Key');
    
    const setting = await repos.settings.getById(key);
    return setting?.value;
  });

  // Set setting value
  registerIPCHandler('settings:set', async (event, args, repos) => {
    const { key, value } = args;
    validators.requiredString(key, 'Setting Key');
    
    // Value can be empty string (e.g., for removing banner) but not undefined/null
    if (value === undefined || value === null) {
      throw new Error('Setting Value is required (use empty string "" for blank values)');
    }
    
    // Convert to string if needed
    const stringValue = typeof value === 'string' ? value : String(value);
    
    // Try to update first
    const existing = await repos.settings.getById(key);
    let success: boolean;
    
    if (existing) {
      success = await repos.settings.updateSetting(key, stringValue);
    } else {
      success = !!(await repos.settings.create({ key, value: stringValue }));
    }
    
    if (!success) {
      throw new Error('Failed to set setting value');
    }
    return { success: true };
  });

  // Update setting
  registerIPCHandler('settings:update', async (event, args, repos) => {
    const { key, data } = args;
    validators.requiredString(key, 'Setting Key');
    
    const success = await repos.settings.updateSetting(key, data);
    if (!success) {
      throw new Error('Failed to update setting');
    }
    
    return { success: true };
  });

  // Delete setting
  registerIPCHandler('settings:delete', async (event, args, repos) => {
    const { key } = args;
    validators.requiredString(key, 'Setting Key');

    const success = await repos.settings.delete(key);
    if (!success) {
      throw new Error('Failed to delete setting');
    }
    
    return { success: true };
  });

  // Search settings
  registerIPCHandler('settings:search', async (event, args, repos) => {
    const { term, fields } = args;
    validators.requiredString(term, 'Search term');
    
    return repos.settings.search(term, fields || ['key', 'value']);
  });
}
