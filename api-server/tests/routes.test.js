const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const mockDbQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
const mockClient = {
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  release: jest.fn(),
};
const mockDbConnect = jest.fn().mockResolvedValue(mockClient);

jest.mock('../src/db', () => ({
  query: mockDbQuery,
  transaction: jest.fn(async (cb) => cb(mockClient)),
  pool: {
    query: mockDbQuery,
    connect: mockDbConnect,
    end: jest.fn(),
    on: jest.fn(),
  },
}));

function validToken() {
  return jwt.sign(
    { id: 1, username: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h', issuer: 'sgw-pro', audience: 'sgw-pro-api' }
  );
}

function makeApp() {
  mockDbQuery.mockReset();
  mockDbQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockClient.query.mockReset();
  mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });
  mockDbConnect.mockReset();
  mockDbConnect.mockResolvedValue(mockClient);
  return require('../src/index');
}

describe('API Routes', () => {
  describe('GET /api/v1/health', () => {
    test('returns status ok', async () => {
      const app = makeApp();
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.version).toBe('1.0.0');
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    test('validates required fields — empty body', async () => {
      const app = makeApp();
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});
      expect(res.status).toBe(400);
    });

    test('validates short username (< 3 chars)', async () => {
      const app = makeApp();
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'ab', password: 'longenough123' });
      expect(res.status).toBe(400);
    });

    test('validates short password (< 8 chars)', async () => {
      const app = makeApp();
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'short' });
      expect(res.status).toBe(400);
    });

    test('returns 401 for non-existent user', async () => {
      const app = makeApp();
      mockDbQuery.mockResolvedValue({ rows: [] });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'nobody', password: 'longenough123' });
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Credenciais invalidas/i);
    });

    test('handles malformed JSON body', async () => {
      const app = makeApp();
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('not-json-at-all');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/register', () => {
    test('returns 403 (disabled)', async () => {
      const app = makeApp();
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ username: 'admin', password: 'longenough123' });
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Registro desabilitado/i);
    });
  });

  describe('Licenses CRUD (authenticated)', () => {
    const token = validToken();

    test('GET /api/v1/licenses returns 401 without auth', async () => {
      const app = makeApp();
      const res = await request(app).get('/api/v1/licenses');
      expect(res.status).toBe(401);
    });

    test('GET /api/v1/licenses returns paginated list', async () => {
      const app = makeApp();
      mockDbQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'lic_001', license_key: 'SGW-2026-XXXX-XXXX-XXXX',
            validation_hash: 'ABC123', customer_name: 'Test Corp',
            cpf_cnpj: null, email: null, phone: null,
            equipment: null, equipment_serial: null, region: null,
            sgw_login: null, sgw_password: null,
            activation_date: null, valid_until: null,
            technician: 'admin', status: 'active',
            device_fingerprint: null, brands: null,
            observations: null, pdf_source: null, has_cert: false,
            created_at: new Date(), updated_at: new Date(),
          }],
        });

      const res = await request(app)
        .get('/api/v1/licenses')
        .set('Cookie', [`sgw_token=${token}`]);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.totalPages).toBe(1);
    });

    test('GET /api/v1/licenses with filters works', async () => {
      const app = makeApp();
      mockDbQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/v1/licenses?status=active&region=SP&q=test')
        .set('Cookie', [`sgw_token=${token}`]);
      expect(res.status).toBe(200);
    });

    test('GET /api/v1/licenses/:id returns 404 for missing', async () => {
      const app = makeApp();
      const res = await request(app)
        .get('/api/v1/licenses/nonexistent')
        .set('Cookie', [`sgw_token=${token}`]);
      expect(res.status).toBe(404);
    });

    test('POST /api/v1/licenses creates a license', async () => {
      const app = makeApp();
      mockDbQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({
          rows: [{
            id: 'lic_new', license_key: 'SGW-2026-TEST-TEST-TEST',
            validation_hash: 'HASH1234', customer_name: 'New Corp',
            cpf_cnpj: null, email: null, phone: null,
            equipment: null, equipment_serial: null, region: null,
            sgw_login: null, sgw_password: null,
            activation_date: null, valid_until: null,
            technician: 'admin', status: 'active',
            device_fingerprint: null, brands: null,
            observations: null, pdf_source: null, has_cert: false,
            created_at: new Date(), updated_at: new Date(),
          }],
        });

      const res = await request(app)
        .post('/api/v1/licenses')
        .set('Cookie', [`sgw_token=${token}`])
        .send({ customer_name: 'New Corp', license_key: 'SGW-2026-TEST-TEST-TEST' });
      expect(res.status).toBe(201);
    });

    test('POST /api/v1/licenses with minimal data succeeds', async () => {
      const app = makeApp();
      mockDbQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({
          rows: [{
            id: 'lic_min', license_key: 'SGW-2026-MIN',
            validation_hash: 'MIN123', customer_name: null,
            cpf_cnpj: null, email: null, phone: null,
            equipment: null, equipment_serial: null, region: null,
            sgw_login: null, sgw_password: null,
            activation_date: null, valid_until: null,
            technician: null, status: null,
            device_fingerprint: null, brands: null,
            observations: null, pdf_source: null, has_cert: false,
            created_at: new Date(), updated_at: new Date(),
          }],
        });

      const res = await request(app)
        .post('/api/v1/licenses')
        .set('Cookie', [`sgw_token=${token}`])
        .send({ license_key: 'SGW-2026-MIN' });
      expect(res.status).toBe(201);
    });

    test('PUT /api/v1/licenses/:id updates a license', async () => {
      const app = makeApp();
      mockDbQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({
          rows: [{
            id: 'lic_001', license_key: 'SGW-2026-UPD',
            validation_hash: 'UPD123', customer_name: 'Updated Corp',
            cpf_cnpj: null, email: null, phone: null,
            equipment: null, equipment_serial: null, region: null,
            sgw_login: null, sgw_password: null,
            activation_date: null, valid_until: null,
            technician: 'admin', status: 'active',
            device_fingerprint: null, brands: null,
            observations: null, pdf_source: null, has_cert: false,
            created_at: new Date(), updated_at: new Date(),
          }],
        });

      const res = await request(app)
        .put('/api/v1/licenses/lic_001')
        .set('Cookie', [`sgw_token=${token}`])
        .send({ customer_name: 'Updated Corp' });
      expect(res.status).toBe(200);
    });

    test('PUT /api/v1/licenses/:id returns 404 for missing', async () => {
      const app = makeApp();
      mockDbQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/v1/licenses/nonexistent')
        .set('Cookie', [`sgw_token=${token}`])
        .send({ customer_name: 'Ghost' });
      expect(res.status).toBe(404);
    });

    test('DELETE /api/v1/licenses/:id deletes a license', async () => {
      const app = makeApp();
      mockDbQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ id: 'lic_001' }] });

      const res = await request(app)
        .delete('/api/v1/licenses/lic_001')
        .set('Cookie', [`sgw_token=${token}`]);
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    test('DELETE /api/v1/licenses/:id returns 404 for missing', async () => {
      const app = makeApp();
      mockDbQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete('/api/v1/licenses/nonexistent')
        .set('Cookie', [`sgw_token=${token}`]);
      expect(res.status).toBe(404);
    });
  });

  describe('Backup Import', () => {
    const token = validToken();

    test('POST /api/v1/backup/import requires valid checksum', async () => {
      const app = makeApp();
      const res = await request(app)
        .post('/api/v1/backup/import')
        .set('Cookie', [`sgw_token=${token}`])
        .send({
          format: 'encrypted',
          data: 'some-base64-data',
          checksum: 'invalid',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Checksum SHA-256 obrigatorio/i);
    });

    test('POST /api/v1/backup/import requires valid format', async () => {
      const app = makeApp();
      const res = await request(app)
        .post('/api/v1/backup/import')
        .set('Cookie', [`sgw_token=${token}`])
        .send({
          format: 'plain',
          data: 'some-data',
          checksum: 'a'.repeat(64),
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Formato de backup invalido/i);
    });

    test('POST /api/v1/backup/import rejects missing data', async () => {
      const app = makeApp();
      const res = await request(app)
        .post('/api/v1/backup/import')
        .set('Cookie', [`sgw_token=${token}`])
        .send({
          format: 'encrypted',
          checksum: 'a'.repeat(64),
        });
      expect(res.status).toBe(400);
    });

    test('POST /api/v1/backup/import rejects non-string data', async () => {
      const app = makeApp();
      const res = await request(app)
        .post('/api/v1/backup/import')
        .set('Cookie', [`sgw_token=${token}`])
        .send({
          format: 'encrypted',
          data: { not: 'a string' },
          checksum: 'a'.repeat(64),
        });
      expect(res.status).toBe(400);
    });

    test('POST /api/v1/backup/import with encrypted+password requires password', async () => {
      const app = makeApp();
      const res = await request(app)
        .post('/api/v1/backup/import')
        .set('Cookie', [`sgw_token=${token}`])
        .send({
          format: 'encrypted+password',
          data: 'some-base64-data',
          checksum: 'a'.repeat(64),
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Senha do operador obrigatoria/i);
    });

    test('POST /api/v1/backup/import with checksum mismatch fails', async () => {
      const app = makeApp();
      const { encrypt, hash } = require('../src/crypto');

      const payload = JSON.stringify({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data: { licenses: [], images: [], audit_logs: [], config: [] },
      });
      const checksum = hash(payload);
      const encrypted = encrypt(payload);

      const res = await request(app)
        .post('/api/v1/backup/import')
        .set('Cookie', [`sgw_token=${token}`])
        .send({
          format: 'encrypted',
          data: encrypted,
          checksum: 'a'.repeat(64),
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Checksum invalido/i);
    });

    test('POST /api/v1/backup/import with valid data succeeds', async () => {
      const app = makeApp();
      const { encrypt, hash } = require('../src/crypto');

      const payload = JSON.stringify({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data: { licenses: [], images: [], audit_logs: [], config: [] },
      });
      const checksum = hash(payload);
      const encrypted = encrypt(payload);

      const res = await request(app)
        .post('/api/v1/backup/import')
        .set('Cookie', [`sgw_token=${token}`])
        .send({
          format: 'encrypted',
          data: encrypted,
          checksum: checksum,
        });
      expect(res.status).toBe(200);
      expect(res.body.imported).toBe(true);
    });
  });

  describe('AI Proxy', () => {
    test('POST /api/v1/ai/proxy returns 401 without auth', async () => {
      const app = makeApp();
      const res = await request(app)
        .post('/api/v1/ai/proxy')
        .send({ messages: [{ role: 'user', content: 'hi' }] });
      expect(res.status).toBe(401);
    });

    test('POST /api/v1/ai/proxy returns 400 when API key not configured', async () => {
      const app = makeApp();
      const res = await request(app)
        .post('/api/v1/ai/proxy')
        .set('Cookie', [`sgw_token=${validToken()}`])
        .send({ messages: [{ role: 'user', content: 'hi' }] });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/ANTHROPIC_API_KEY nao configurada/i);
    });
  });

  describe('Other authenticated routes', () => {
    const token = validToken();

    test('GET /api/v1/audit-logs returns 401 without auth', async () => {
      const app = makeApp();
      const res = await request(app).get('/api/v1/audit-logs');
      expect(res.status).toBe(401);
    });

    test('GET /api/v1/audit-logs returns paginated list', async () => {
      const app = makeApp();
      mockDbQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Cookie', [`sgw_token=${token}`]);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    test('GET /api/v1/config returns 401 without auth', async () => {
      const app = makeApp();
      const res = await request(app).get('/api/v1/config');
      expect(res.status).toBe(401);
    });

    test('GET /api/v1/config returns config object', async () => {
      const app = makeApp();
      const res = await request(app)
        .get('/api/v1/config')
        .set('Cookie', [`sgw_token=${token}`]);
      expect(res.status).toBe(200);
    });

    test('GET /api/v1/stats returns 401 without auth', async () => {
      const app = makeApp();
      const res = await request(app).get('/api/v1/stats');
      expect(res.status).toBe(401);
    });
  });

  describe('CSP Report collector', () => {
    test('POST /api/v1/csp-report returns 204', async () => {
      const app = makeApp();
      const res = await request(app)
        .post('/api/v1/csp-report')
        .send({ 'csp-report': { 'blocked-uri': 'http://evil.com' } });
      expect(res.status).toBe(204);
    });
  });
});
