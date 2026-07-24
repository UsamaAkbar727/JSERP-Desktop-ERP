/**
 * Electron API type definitions
 * Import WindowAPI from api.ts for complete type safety
 */

import type { WindowAPI } from './api';

declare global {
  interface Window {
    api: WindowAPI;
  }
}

export { };

  settings: {
    get: (key: string) => Promise<DatabaseResult<string>>;
    set: (key: string, value: string, description?: string) => Promise<DatabaseResult<{ changes: number }>>;
    getAll: () => Promise<DatabaseResult<any[]>>;
  };

  // Audit log operations
  audit: {
    log: (entry: {
      user_id?: number;
      action: string;
      table_name?: string;
      record_id?: number;
      changes?: any;
    }) => Promise<DatabaseResult<{ id: number }>>;
    getRecent: (limit?: number) => Promise<DatabaseResult<any[]>>;
  };
}

export interface ElectronAPI {
  platform: string;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (...args: any[]) => void) => () => void;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  getTheme: () => Promise<string>;
  setTheme: (theme: string) => Promise<void>;

  // Database API
  db: DatabaseAPI;
}

declare global {
  interface Window {
/**
 * Electron API type definitions
 * Import WindowAPI from api.ts for complete type safety
 */

import type { WindowAPI } from './api';

declare global {
  interface Window {
    api: WindowAPI;
  }
}

export { };