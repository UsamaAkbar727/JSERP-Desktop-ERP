/**
 * Users Repository
 * Manages user accounts and authentication
 */

import type { Database } from 'better-sqlite3';
import { BaseRepository } from './BaseRepository';
import { hashPassword, verifyPassword } from '../../utils/passwordHash';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'staff';
  password_hash: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role?: 'super_admin' | 'admin' | 'staff';
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: string;
  active?: boolean;
  password?: string;
}

export class UsersRepository extends BaseRepository<User> {
  constructor(db: Database) {
    super(db, 'users');
  }

  /**
   * Get user by ID
   */
  async getById(id: number): Promise<User | null> {
    const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
    return (stmt.get(id) as User) || null;
  }

  /**
   * Get user by email
   */
  async getByEmail(email: string): Promise<User | null> {
    const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE email = ?`);
    return (stmt.get(email) as User) || null;
  }

  /**
   * Create a new user
   */
  async createUser(data: CreateUserData): Promise<User> {
    try {
      if (!data.name || !data.email || !data.password) {
        throw new Error('Name, email, and password are required');
      }

      // Check if email already exists
      const existing = await this.getByEmail(data.email);
      if (existing) {
        throw new Error('Email already exists');
      }

      const passwordHash = hashPassword(data.password);
      const role = data.role || 'staff';
      

      const stmt = this.db.prepare(`
        INSERT INTO users (name, email, password_hash, role, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      `);

      const result = stmt.run(data.name, data.email, passwordHash, role);

      // Try to fetch created user by lastInsertRowid first (preferred),
      // but fall back to fetching by email for robustness across schema variations.
      let user: User | null = null;
      try {
        if (result && result.lastInsertRowid !== undefined && result.lastInsertRowid !== null) {
          const id = typeof result.lastInsertRowid === 'bigint' ? Number(result.lastInsertRowid) : result.lastInsertRowid;
          user = await this.getById(Number(id));
         
        }
      } catch (err) {
        console.warn(`⚠️ [UsersRepository] Failed to fetch by ID:`, err);
      }

      if (!user) {
        user = await this.getByEmail(data.email);
       
      }

      if (!user) throw new Error('Failed to retrieve created user');
      

      return user;
    } catch (error) {
      throw new Error(`Error creating user: ${error}`);
    }
  }

  /**
   * Update user
   */
  async updateUser(id: number, data: UpdateUserData): Promise<User> {
    try {
      const user = await this.getById(id);
      if (!user) throw new Error('User not found');

      const updates: string[] = [];
      const params: any[] = [];

      if (data.name !== undefined) {
        updates.push('name = ?');
        params.push(data.name);
      }
      if (data.email !== undefined) {
        // Check if email is already taken by another user
        const existing = await this.getByEmail(data.email);
        if (existing && existing.id !== id) {
          throw new Error('Email already exists');
        }
        updates.push('email = ?');
        params.push(data.email);
      }
      if (data.role !== undefined) {
        updates.push('role = ?');
        params.push(data.role);
      }
      if (data.active !== undefined) {
        updates.push('active = ?');
        params.push(data.active ? 1 : 0);
      }
      if (data.password !== undefined) {
        const passwordHash = hashPassword(data.password);
        updates.push('password_hash = ?');
        params.push(passwordHash);
      }

      updates.push("updated_at = datetime('now')");
      params.push(id);

      const stmt = this.db.prepare(`
        UPDATE users SET ${updates.join(', ')} WHERE id = ?
      `);

      stmt.run(...params);

      // Prefer fetching by ID, but if schema issues exist fall back to email lookup
      let updated: User | null = null;
      try {
        updated = await this.getById(id);
      } catch (err) {
        // ignore and try by email
      }

      if (!updated && data.email) {
        updated = await this.getByEmail(data.email);
      }

      if (!updated) throw new Error('Failed to retrieve updated user');

      return updated;
    } catch (error) {
      throw new Error(`Error updating user: ${error}`);
    }
  }

  /**
   * Delete user
   */
  async delete(id: number): Promise<boolean> {
    try {
      const user = await this.getById(id);
      if (!user) throw new Error('User not found');

      const stmt = this.db.prepare(`DELETE FROM users WHERE id = ?`);
      const result = stmt.run(id);
      
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error deleting user: ${error}`);
    }
  }

  /**
   * Verify user password
   */
  async verifyCredentials(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.getByEmail(email);
      if (!user) return null;

      if (!user.active) {
        throw new Error('User account is inactive');
      }

      const isValid = verifyPassword(password, user.password_hash);
      return isValid ? user : null;
    } catch (error) {
      console.error('Error verifying credentials:', error);
      return null;
    }
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} ORDER BY created_at DESC`);
    return stmt.all() as User[];
  }

  /**
   * Check if super admin exists
   */
  async hasSuperAdmin(): Promise<boolean> {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.tableName} WHERE role = 'super_admin'`);
    const result = stmt.get() as { count: number };
    return result.count > 0;
  }

  /**
   * Upsert user - Creates or updates existing user by email
   * Ensures idempotent operation - safe to run multiple times
   */
  async upsertUser(data: CreateUserData): Promise<User> {
    try {
      if (!data.name || !data.email || !data.password) {
        throw new Error('Name, email, and password are required');
      }

      // Check if user already exists by email
      const existing = await this.getByEmail(data.email);

      if (existing && existing.id && typeof existing.id === 'number') {
        // User exists with valid ID - update it
        return await this.updateUser(existing.id, {
          name: data.name,
          role: data.role,
          password: data.password,
          active: true,
        });
      } else {
        // User doesn't exist or has invalid ID
        if (existing) {
          // Remove invalid user record using raw SQL
          this.db.prepare('DELETE FROM users WHERE email = ?').run(data.email);
        }

        // Create fresh user
        return await this.createUser(data);
      }
    } catch (error) {
      throw new Error(`Error upserting user: ${error}`);
    }
  }
}
