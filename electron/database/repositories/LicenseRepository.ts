import { BaseRepository } from './BaseRepository';
import type { Database } from 'better-sqlite3';

export interface License {
  id?: number;
  license_key: string;
  activation_date: string;
  expiry_date?: string;
  hardware_id: string;
  customer_name: string;
  customer_email: string;
  features?: string; // JSON string
  status: 'active' | 'expired' | 'revoked' | 'suspended';
  verification_response?: string; // JSON string
  last_verified_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LicenseFeatures {
  [key: string]: boolean | number | string;
}

export class LicenseRepository extends BaseRepository<License> {
  constructor(db: Database) {
    super(db, 'licenses');
  }

  /**
   * Get the active license for the system
   */
  getActiveLicense(): License | null {
    const sql = `
      SELECT * FROM licenses 
      WHERE status = 'active' 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const row = this.db.prepare(sql).get() as License | undefined;
    return row || null;
  }

  /**
   * Get license by license key
   */
  getByLicenseKey(licenseKey: string): License | null {
    const sql = `SELECT * FROM licenses WHERE license_key = ? LIMIT 1`;
    const row = this.db.prepare(sql).get(licenseKey) as License | undefined;
    return row || null;
  }

  /**
   * Get license by hardware ID
   */
  getByHardwareId(hardwareId: string): License | null {
    const sql = `SELECT * FROM licenses WHERE hardware_id = ? ORDER BY created_at DESC LIMIT 1`;
    const row = this.db.prepare(sql).get(hardwareId) as License | undefined;
    return row || null;
  }

  /**
   * Create or update license
   */
  upsertLicense(license: Omit<License, 'id' | 'created_at' | 'updated_at'>): License {
    const existing = this.getByLicenseKey(license.license_key);

    if (existing) {
      // Update existing license
      const sql = `
        UPDATE licenses 
        SET activation_date = ?,
            expiry_date = ?,
            hardware_id = ?,
            customer_name = ?,
            customer_email = ?,
            features = ?,
            status = ?,
            verification_response = ?,
            last_verified_at = ?
        WHERE license_key = ?
      `;

      this.db.prepare(sql).run(
        license.activation_date,
        license.expiry_date || null,
        license.hardware_id,
        license.customer_name,
        license.customer_email,
        license.features || null,
        license.status,
        license.verification_response || null,
        license.last_verified_at || null,
        license.license_key
      );

      return this.getByLicenseKey(license.license_key)!;
    } else {
      // Insert new license
      const sql = `
        INSERT INTO licenses (
          license_key,
          activation_date,
          expiry_date,
          hardware_id,
          customer_name,
          customer_email,
          features,
          status,
          verification_response,
          last_verified_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = this.db.prepare(sql).run(
        license.license_key,
        license.activation_date,
        license.expiry_date || null,
        license.hardware_id,
        license.customer_name,
        license.customer_email,
        license.features || null,
        license.status,
        license.verification_response || null,
        license.last_verified_at || null
      );

      // Get the inserted record by ID using direct SQL query
      const selectSql = `SELECT * FROM licenses WHERE id = ? LIMIT 1`;
      const inserted = this.db.prepare(selectSql).get(result.lastInsertRowid as number) as License;
      return inserted;
    }
  }

  /**
   * Update license status
   */
  updateStatus(licenseKey: string, status: License['status']): boolean {
    const sql = `UPDATE licenses SET status = ? WHERE license_key = ?`;
    const result = this.db.prepare(sql).run(status, licenseKey);
    return result.changes > 0;
  }

  /**
   * Update last verified timestamp
   */
  updateLastVerified(licenseKey: string): boolean {
    const sql = `UPDATE licenses SET last_verified_at = datetime('now') WHERE license_key = ?`;
    const result = this.db.prepare(sql).run(licenseKey);
    return result.changes > 0;
  }

  /**
   * Check if license has expired
   */
  isExpired(license: License): boolean {
    if (!license.expiry_date) {
      return false; // No expiry date means perpetual license
    }

    const expiryDate = new Date(license.expiry_date);
    const now = new Date();
    return now > expiryDate;
  }

  /**
   * Get parsed features from JSON string
   */
  getFeatures(license: License): LicenseFeatures {
    if (!license.features) {
      return {};
    }

    try {
      return JSON.parse(license.features);
    } catch (error) {
      console.error('Error parsing license features:', error);
      return {};
    }
  }

  /**
   * Check if a specific feature is enabled
   */
  hasFeature(license: License, featureName: string): boolean {
    const features = this.getFeatures(license);
    return features[featureName] === true;
  }

  /**
   * Get all licenses (for admin purposes)
   */
  getAllLicenses(): License[] {
    const sql = `SELECT * FROM licenses ORDER BY created_at DESC`;
    return this.db.prepare(sql).all() as License[];
  }

  /**
   * Delete license by license key
   */
  deleteByLicenseKey(licenseKey: string): boolean {
    const sql = `DELETE FROM licenses WHERE license_key = ?`;
    const result = this.db.prepare(sql).run(licenseKey);
    return result.changes > 0;
  }

  /**
   * Get license expiry information
   */
  getExpiryInfo(license: License): {
    hasExpiry: boolean;
    isExpired: boolean;
    daysRemaining: number | null;
    expiryDate: Date | null;
  } {
    if (!license.expiry_date) {
      return {
        hasExpiry: false,
        isExpired: false,
        daysRemaining: null,
        expiryDate: null,
      };
    }

    const expiryDate = new Date(license.expiry_date);
    const now = new Date();
    const isExpired = now > expiryDate;
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      hasExpiry: true,
      isExpired,
      daysRemaining: isExpired ? 0 : daysRemaining,
      expiryDate,
    };
  }
}
