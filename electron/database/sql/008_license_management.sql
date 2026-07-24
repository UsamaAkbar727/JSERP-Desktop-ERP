-- License Management System
-- This table stores license information for the application

CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_key TEXT NOT NULL UNIQUE,
    activation_date TEXT NOT NULL,
    expiry_date TEXT,
    hardware_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    features TEXT, -- JSON string of enabled features
    status TEXT NOT NULL CHECK(status IN ('active', 'expired', 'revoked', 'suspended')) DEFAULT 'active',
    verification_response TEXT, -- JSON string of full API response
    last_verified_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create index for faster license lookups
CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_hardware ON licenses(hardware_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_licenses_timestamp 
AFTER UPDATE ON licenses
BEGIN
    UPDATE licenses SET updated_at = datetime('now') WHERE id = NEW.id;
END;
