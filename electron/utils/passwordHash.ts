/**
 * Password Hashing Utility
 * Uses a simple hashing approach (in production, use bcrypt or argon2)
 */

import * as crypto from 'crypto';

const SALT_LENGTH = 16;
const ITERATIONS = 10000;
const HASH_LENGTH = 64;
const ALGORITHM = 'sha256';

/**
 * Hash a password with a random salt
 * Format: algorithm$iterations$salt$hash
 */
export function hashPassword(password: string): string {
    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    const hash = crypto
        .pbkdf2Sync(password, salt, ITERATIONS, HASH_LENGTH, ALGORITHM)
        .toString('hex');
    return `${ALGORITHM}$${ITERATIONS}$${salt}$${hash}`;
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, passwordHash: string): boolean {
    try {
        const [algorithm, iterations, salt, originalHash] = passwordHash.split('$');
        
        if (!algorithm || !iterations || !salt || !originalHash) {
            console.error('Invalid password hash format');
            return false;
        }

        const hash = crypto
            .pbkdf2Sync(password, salt, parseInt(iterations), HASH_LENGTH, algorithm)
            .toString('hex');
        
        return hash === originalHash;
    } catch (error) {
        console.error('Error verifying password:', error);
        return false;
    }
}

/**
 * Generate a simple session token
 */
export function generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
}
