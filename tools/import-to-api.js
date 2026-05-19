/**
 * Import IndexedDB JSON export → SGW Pro API
 *
 * Usage:
 *   node import-to-api.js <json-file> [api-url] [username] [password]
 *
 * Defaults:
 *   api-url:  http://localhost:8081
 *   username: admin
 *   password: admin123
 *
 * Example:
 *   node import-to-api.js sgwpro_idb_export_123.json
 *   node import-to-api.js export.json http://localhost:8081 admin mypass
 */

const API_URL = (process.env.API_URL || (process.argv[3] || 'http://localhost:8081')).replace(/\/+$/, '') + '/api/v1';
const USERNAME = process.env.API_USER || process.argv[4] || 'admin';
const PASSWORD = process.env.API_PASS || process.argv[5] || 'admin123';
const JSON_PATH = process.argv[2];

if (!JSON_PATH) {
  console.error('Usage: node import-to-api.js <json-file> [api-url] [username] [password]');
  process.exit(1);
}

const fs = require('fs');

async function login() {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Login failed: ${err.error || res.status}`);
  }
  const data = await res.json();
  return data.token;
}

async function importData(token, payload) {
  const res = await fetch(`${API_URL}/backup/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      format: 'json',
      data: payload,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Import failed: ${err.error || res.status}`);
  }
  return res.json();
}

async function validateCounts(token) {
  const res = await fetch(`${API_URL}/stats`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const stats = await res.json();
  return stats;
}

(async () => {
  try {
    console.log('SGW Pro — Import Tool');
    console.log('━'.repeat(50));

    const raw = fs.readFileSync(JSON_PATH, 'utf8');
    const payload = JSON.parse(raw);

    if (!payload.data || !payload.version) {
      throw new Error('Invalid export format: missing "data" or "version" field');
    }

    const stats = {
      licenses: payload.data.licenses?.length || 0,
      images: payload.data.images?.length || 0,
      auditLogs: payload.data.auditLogs?.length || 0,
      config: payload.data.config?.length || 0,
    };

    console.log(`File:     ${JSON_PATH}`);
    console.log(`Version:  ${payload.version}`);
    console.log(`Exported: ${payload.exportedAt || 'N/A'}`);
    console.log('Records:');
    console.log(`  Licenses:  ${stats.licenses}`);
    console.log(`  Images:    ${stats.images}`);
    console.log(`  Audit Logs: ${stats.auditLogs}`);
    console.log(`  Config:    ${stats.config}`);
    console.log(`API:      ${API_URL}`);
    console.log(`User:     ${USERNAME}`);
    console.log('━'.repeat(50));

    console.log('Logging in...');
    const token = await login();
    console.log('✓ Authenticated');

    console.log('Importing data...');
    const result = await importData(token, payload);
    console.log(`✓ Imported: ${result.imported}`);
    console.log(`  Licenses: ${result.licenses}`);
    console.log(`  Images:   ${result.images}`);

    console.log('Validating...');
    const counts = await validateCounts(token);
    if (counts) {
      console.log(`  DB Stats: ${counts.total} licenses, ${counts.active} active`);
      const match = counts.total === stats.licenses;
      console.log(match ? '✓ Counts match' : '⚠ Counts differ (DB: ' + counts.total + ', export: ' + stats.licenses + ')');
    }

    console.log('━'.repeat(50));
    console.log('Import complete!');
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
})();
