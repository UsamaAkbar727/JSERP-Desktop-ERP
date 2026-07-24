/**
 * Authentication IPC Handlers
 * Handles user login, logout, and session management
 */

import { registerIPCHandler, validators } from '../index';
import type { User } from '../../database/repositories';
import { getStoreService } from '../../store/StoreService';

const sessions = new Map<string, { userId: number; timestamp: number; user: User }>();
const store = getStoreService();

/**
 * Register all authentication-related IPC handlers
 */
export function registerAuthHandlers(): void {
  /**
   * Restore session from store on app startup
   */
  registerIPCHandler('auth:restore-session', async (event, args, repos) => {
    
    try {
      const authData = store.getAuth();
      
      if (!authData.isAuthenticated || !authData.sessionToken || !authData.user) {
        return {
          success: false,
          message: 'No session found',
        };
      }
      
      // Verify user still exists in database
      const user = await repos.users.getById(authData.user.id);
      if (!user || !user.active) {
        store.clearAuth();
        return {
          success: false,
          message: 'User not found or inactive',
        };
      }
      
      // Restore session to memory
      sessions.set(authData.sessionToken, {
        userId: user.id,
        timestamp: Date.now(),
        user: {
          ...user,
          password_hash: '',
        },
      });
      
     
      
      return {
        success: true,
        sessionToken: authData.sessionToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error: any) {
      console.error('❌ [IPC:auth:restore-session] Error:', error.message);
      return {
        success: false,
        message: error.message,
      };
    }
  });

  /**
   * Login handler
   */
  registerIPCHandler('auth:login', async (event, args, repos) => {
  
    const { email, password } = args;

    validators.requiredString(email, 'Email');
    validators.requiredString(password, 'Password');

    try {
      const user = await repos.users.verifyCredentials(email, password);
      if (!user) {
        console.error('❌ [IPC:auth:login] Invalid credentials for:', email);
        throw new Error('Invalid email or password');
      }

      // Generate session token
      const sessionToken = generateSessionToken();
      sessions.set(sessionToken, {
        userId: user.id,
        timestamp: Date.now(),
        user: {
          ...user,
          password_hash: '', // Don't send password hash to client
        },
      });

      const response = {
        success: true,
        sessionToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
      
      // Persist session to store
      store.setAuth({
        isAuthenticated: true,
        sessionToken,
        user: response.user,
      });

      return response;
    } catch (error: any) {
      console.error('❌ [IPC:auth:login] Error:', error.message);
      throw error;
    }
  });

  /**
   * Verify session handler
   */
  registerIPCHandler('auth:verify-session', async (event, args) => {
    const { sessionToken } = args;
    validators.requiredString(sessionToken, 'Session Token');
    

    const session = sessions.get(sessionToken);
    if (!session) {
      console.error('❌ [IPC:auth:verify-session] Invalid or expired session');
      throw new Error('Invalid or expired session');
    }

    const user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
    };
    
   

    return { user };
  });

  /**
   * Logout handler
   */
  registerIPCHandler('auth:logout', async (event, args) => {
    const { sessionToken } = args;
    validators.requiredString(sessionToken, 'Session Token');
    
    

    const session = sessions.get(sessionToken);
    // Clear auth from store
    store.clearAuth();
    
    if (!session) {
      console.error('❌ [IPC:auth:logout] Invalid session');
      throw new Error('Invalid session');
    }

    sessions.delete(sessionToken);
    
   

    return { success: true };
  });

  /**
   * Create user handler
   */
  registerIPCHandler('auth:create-user', async (event, args, repos) => {

    const { name, email, password, role } = args;

    validators.requiredString(name, 'Name');
    validators.requiredString(email, 'Email');
    validators.requiredString(password, 'Password');

    if (password.length < 6) {
      console.error('❌ [IPC:auth:create-user] Password too short');
      throw new Error('Password must be at least 6 characters');
    }

    try {
      const user = await repos.users.createUser({
        name,
        email,
        password,
        role: role || 'staff',
      });

      const responseUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
      
    

      return { user: responseUser };
    } catch (error: any) {
      console.error('❌ [IPC:auth:create-user] Error:', error.message);
      throw error;
    }
  });

  /**
   * Update user handler
   */
  registerIPCHandler('auth:update-user', async (event, args, repos) => {
   
    const { id, name, email, password, role, active } = args;

    validators.requiredNumber(id, 'User ID');

    try {
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (password !== undefined) {
        if (password.length < 6) {
          console.error('❌ [IPC:auth:update-user] Password too short');
          throw new Error('Password must be at least 6 characters');
        }
        updateData.password = password;
      }
      if (role !== undefined) updateData.role = role;
      if (active !== undefined) updateData.active = active;

      const user = await repos.users.updateUser(id, updateData);

      const responseUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
      
   

      return { user: responseUser };
    } catch (error: any) {
      console.error('❌ [IPC:auth:update-user] Error:', error.message);
      throw error;
    }
  });

  /**
   * Delete user handler
   */
  registerIPCHandler('auth:delete-user', async (event, args, repos) => {
   
    const { id } = args;

    validators.requiredNumber(id, 'User ID');

    try {
      const success = await repos.users.delete(id);
      if (!success) {
        console.error('❌ [IPC:auth:delete-user] Failed to delete user');
        throw new Error('Failed to delete user');
      }

     
      return { success: true };
    } catch (error: any) {
      console.error('❌ [IPC:auth:delete-user] Error:', error.message);
      throw error;
    }
  });

  /**
   * Get all users handler
   */
  registerIPCHandler('auth:get-users', async (event, args, repos) => {

    try {
      const users = await repos.users.getAllUsers();
      
      const userData = users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        created_at: u.created_at,
      }));
      
    
     
      return { users: userData };
    } catch (error: any) {
      console.error('❌ [IPC:auth:get-users] Error:', error.message);
      throw error;
    }
  });

  /**
   * Get user by ID
   */
  registerIPCHandler('auth:get-user', async (event, args, repos) => {
 
    const { id } = args;
    validators.requiredNumber(id, 'User ID');

    try {
      const user = await repos.users.getById(id);
      if (!user) {
        console.error('❌ [IPC:auth:get-user] User not found');
        throw new Error('User not found');
      }

      const response = {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
        },
      };
      
     

      return response;
    } catch (error: any) {
      console.error('❌ [IPC:auth:get-user] Error:', error.message);
      throw error;
    }
  });

  /**
   * Reset database and reseed (for troubleshooting)
   */
  registerIPCHandler('auth:reset-database', async (event, args, repos) => {

    try {
      // Drop and recreate the users table
      const db = repos.db;
      
      db.exec(`
        DROP TABLE IF EXISTS users;
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'staff' CHECK(role IN ('super_admin', 'admin', 'staff')),
          active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX idx_users_email ON users(email);
        CREATE INDEX idx_users_role ON users(role);
        CREATE INDEX idx_users_active ON users(active);
      `);
      

      // Import seeding function and reseed
      const { seedDatabase } = await import('../../database/seed.js');
      await seedDatabase(db, repos);

      return { success: true, message: 'Database reset successfully' };
    } catch (error: any) {
      console.error('❌ [IPC:auth:reset-database] Error:', error.message);
      throw error;
    }
  });
}

/**
 * Generate a random session token
 */
function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Get session info
 */
export function getSession(sessionToken: string) {
  return sessions.get(sessionToken);
}

/**
 * Clear all sessions (useful for testing or app shutdown)
 */
export function clearAllSessions(): void {
  sessions.clear();
}
