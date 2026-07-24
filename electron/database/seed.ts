/**
 * Database Seed Functions
 * Initializes default data on first launch
 */

import type { Database } from 'better-sqlite3';
import type { RepositoryContainer } from './repositories';

/**
 * Seed default data into the database
 */
export async function seedDatabase(db: Database, repos: RepositoryContainer): Promise<void> {
    try {

        // Upsert default super admin user
        // This is idempotent - safe to run multiple times
        
        try {
            const superAdmin = await repos.users.upsertUser({
                name: 'Super admin',
                email: 'admin@erp-pro.com',
                password: 'Admin@123',
                role: 'admin',
            });

          
        } catch (error: any) {
            console.error('❌ Failed to create/update super admin:', error.message);
            throw error;
        }

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    }
}
