-- Migration Version 4: Settings and License Tables
-- Updates users table for ERP requirements
-- Creates license management system

-- =============================================================================
-- USERS TABLE (Enhanced for ERP)
-- =============================================================================
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'staff' CHECK(role IN ('admin', 'staff')),
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  language_preference TEXT DEFAULT 'en' CHECK(language_preference IN ('en', 'ur')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SETTINGS TABLE (Key-Value Store)
-- =============================================================================
DROP TABLE IF EXISTS settings;
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- LICENSE TABLE (Application Licensing)
-- =============================================================================
CREATE TABLE IF NOT EXISTS license (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  license_key TEXT UNIQUE,
  activated_at TEXT,
  expires_at TEXT,
  status TEXT DEFAULT 'trial' CHECK(status IN ('trial', 'active', 'expired', 'invalid')),
  hardware_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default license record (trial mode)
INSERT OR IGNORE INTO license (id, status) VALUES (1, 'trial');
