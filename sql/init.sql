-- SGW Pro — PostgreSQL Schema v1
-- Migration from IndexedDB to SQL

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- LICENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  license_key TEXT UNIQUE NOT NULL,
  validation_hash TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  cpf_cnpj TEXT,
  email TEXT,
  phone TEXT,
  equipment TEXT,
  equipment_serial TEXT,
  region TEXT DEFAULT 'PE',
  sgw_login TEXT,
  sgw_password TEXT,
  activation_date DATE,
  valid_until DATE,
  technician TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','expired','revoked')),
  device_fingerprint TEXT,
  brands JSONB DEFAULT '[]'::jsonb,
  observations TEXT,
  pdf_source TEXT,
  has_cert BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_valid_until ON licenses(valid_until);
CREATE INDEX IF NOT EXISTS idx_licenses_region ON licenses(region);
CREATE INDEX IF NOT EXISTS idx_licenses_license_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_customer_name ON licenses(customer_name);

-- ============================================================
-- IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  screen_id INTEGER NOT NULL CHECK (screen_id BETWEEN 1 AND 8),
  data TEXT NOT NULL,
  ts TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_images_license_id ON images(license_id);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'admin',
  metadata JSONB DEFAULT '{}'::jsonb,
  ts TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ts ON audit_logs(ts);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ============================================================
-- CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SEED: default config
-- ============================================================
INSERT INTO config (key, value) VALUES
  ('app_version', '"11.0.0"'),
  ('app_build', '"2026.04"'),
  ('db_version', '1'),
  ('setup_complete', 'false')
ON CONFLICT (key) DO NOTHING;

COMMIT;
