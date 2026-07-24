/**
 * Settings Repository
 * Manages application settings stored as key-value pairs with JSON support
 */

import type { Database } from 'better-sqlite3';
import { BaseRepository } from './BaseRepository';

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

export class SettingsRepository extends BaseRepository<Setting> {
  constructor(db: Database) {
    super(db, 'settings');
  }

  /**
   * Override getById to use 'key' column instead of 'id'
   * Settings table uses 'key' as primary key
   */
  async getById(key: string): Promise<Setting | null> {
    const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE key = ?`);
    return stmt.get(key) as Setting | null;
  }

  /**
   * Get a setting value by key
   */
  async get(key: string): Promise<string | null> {
    try {
      const sql = `SELECT value FROM settings WHERE key = ?`;
      const stmt = this.db.prepare(sql);
      const result = stmt.get(key) as { value: string } | undefined;
      return result ? result.value : null;
    } catch (error) {
      throw new Error(`Error fetching setting ${key}: ${error}`);
    }
  }

  /**
   * Get a setting value as JSON object
   */
  async getJSON<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      throw new Error(`Error parsing JSON setting ${key}: ${error}`);
    }
  }

  /**
   * Set a setting value
   */
  async set(key: string, value: string): Promise<boolean> {
    try {
      // Check if setting exists
      const existing = await this.get(key);

      if (existing !== null) {
        // Update existing setting
        const sql = `UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?`;
        const stmt = this.db.prepare(sql);
        const result = stmt.run(value, key);
        return result.changes > 0;
      } else {
        // Insert new setting
        const sql = `INSERT INTO settings (key, value) VALUES (?, ?)`;
        const stmt = this.db.prepare(sql);
        const result = stmt.run(key, value);
        return result.changes > 0;
      }
    } catch (error) {
      throw new Error(`Error setting value for ${key}: ${error}`);
    }
  }

  /**
   * Set a setting value from JSON object
   */
  async setJSON(key: string, value: any): Promise<boolean> {
    try {
      const jsonString = JSON.stringify(value);
      return await this.set(key, jsonString);
    } catch (error) {
      throw new Error(`Error setting JSON value for ${key}: ${error}`);
    }
  }

  /**
   * Get all settings
   */
  async getAll(): Promise<Setting[]> {
    return super.getAll({
      sort: { field: 'key', order: 'ASC' },
    });
  }

  /**
   * Get all settings as a key-value map
   */
  async getAllAsMap(): Promise<Map<string, string>> {
    const settings = await this.getAll();
    const map = new Map<string, string>();
    settings.forEach(setting => {
      map.set(setting.key, setting.value);
    });
    return map;
  }

  /**
   * Get multiple settings by keys
   */
  async getMany(keys: string[]): Promise<Map<string, string>> {
    try {
      const placeholders = keys.map(() => '?').join(', ');
      const sql = `SELECT key, value FROM settings WHERE key IN (${placeholders})`;
      const stmt = this.db.prepare(sql);
      const results = stmt.all(...keys) as Setting[];

      const map = new Map<string, string>();
      results.forEach(setting => {
        map.set(setting.key, setting.value);
      });

      return map;
    } catch (error) {
      throw new Error(`Error fetching multiple settings: ${error}`);
    }
  }

  /**
   * Set multiple settings at once
   */
  async setMany(settings: Record<string, string>): Promise<number> {
    const setMultiple = this.db.transaction((data: Record<string, string>) => {
      let count = 0;
      for (const [key, value] of Object.entries(data)) {
        this.set(key, value);
        count++;
      }
      return count;
    });

    return setMultiple(settings);
  }

  /**
   * Delete a setting by key
   */
  async delete(key: string): Promise<boolean> {
    try {
      const sql = `DELETE FROM settings WHERE key = ?`;
      const stmt = this.db.prepare(sql);
      const result = stmt.run(key);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error deleting setting ${key}: ${error}`);
    }
  }

  /**
   * Check if a setting exists
   */
  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Update a setting (alias for set for consistency with other repositories)
   */
  async updateSetting(key: string, value: string): Promise<boolean> {
    return this.set(key, value);
  }

  /**
   * Get settings by key prefix
   */
  async getByPrefix(prefix: string): Promise<Setting[]> {
    try {
      const sql = `SELECT * FROM settings WHERE key LIKE ? ORDER BY key ASC`;
      const stmt = this.db.prepare(sql);
      return stmt.all(`${prefix}%`) as Setting[];
    } catch (error) {
      throw new Error(`Error fetching settings by prefix ${prefix}: ${error}`);
    }
  }

  /**
   * Clear all settings (use with caution!)
   */
  async clearAll(): Promise<boolean> {
    try {
      const sql = `DELETE FROM settings`;
      const stmt = this.db.prepare(sql);
      const result = stmt.run();
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error clearing all settings: ${error}`);
    }
  }

  /**
   * Get default settings structure for application initialization
   */
  static getDefaultSettings(): Record<string, any> {
    return {
      'app.language': 'en',
      'app.theme': 'light',
      'app.currency': 'PKR',
      'app.currency_symbol': 'Rs.',
      'app.date_format': 'YYYY-MM-DD',
      'app.time_format': '24h',
      
      'company.name': '',
      'company.address': '',
      'company.phone': '',
      'company.email': '',
      'company.logo': '',
      
      'invoice.prefix': 'INV',
      'invoice.starting_number': '1',
      'invoice.show_header': 'true',
      'invoice.show_footer': 'true',
      'invoice.terms': '',
      
      'purchase.prefix': 'BILL',
      'purchase.starting_number': '1',
      
      'pos.default_customer': '',
      'pos.print_after_sale': 'true',
      'pos.thermal_printer': 'false',
      
      'inventory.low_stock_alert': 'true',
      'inventory.low_stock_threshold': '10',
      
      'menu.dashboard': 'true',
      'menu.pos': 'true',
      'menu.customers': 'true',
      'menu.suppliers': 'true',
      'menu.items': 'true',
      'menu.sales': 'true',
      'menu.purchases': 'true',
      'menu.expenses': 'true',
      'menu.accounts': 'true',
      'menu.reports': 'true',
      'menu.goods': 'true',
      
      'customer_form.show_email': 'true',
      'customer_form.show_phone': 'true',
      'customer_form.show_address': 'true',
      'customer_form.show_city': 'true',
      'customer_form.show_status': 'true',
      'customer_form.show_notes': 'true',
    };
  }

  /**
   * Initialize settings with defaults if they don't exist
   */
  async initializeDefaults(): Promise<number> {
    const defaults = SettingsRepository.getDefaultSettings();
    let count = 0;

    for (const [key, value] of Object.entries(defaults)) {
      const exists = await this.exists(key);
      if (!exists) {
        const valueString = typeof value === 'string' ? value : JSON.stringify(value);
        await this.set(key, valueString);
        count++;
      }
    }

    return count;
  }

  /**
   * Get typed setting helpers for common settings
   */
  async getAppLanguage(): Promise<'en' | 'ur'> {
    const value = await this.get('app.language');
    return (value as 'en' | 'ur') || 'en';
  }

  async setAppLanguage(language: 'en' | 'ur'): Promise<boolean> {
    return this.set('app.language', language);
  }

  async getCompanyName(): Promise<string> {
    return (await this.get('company.name')) || '';
  }

  async setCompanyName(name: string): Promise<boolean> {
    return this.set('company.name', name);
  }

  async getLowStockThreshold(): Promise<number> {
    const value = await this.get('inventory.low_stock_threshold');
    return value ? parseInt(value) : 10;
  }

  async setLowStockThreshold(threshold: number): Promise<boolean> {
    return this.set('inventory.low_stock_threshold', threshold.toString());
  }
}
