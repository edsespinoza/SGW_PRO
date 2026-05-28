const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const mockDbQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
jest.mock('../src/db', () => ({
  query: mockDbQuery,
  transaction: jest.fn(async (cb) => {
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn(),
    };
    return cb(client);
  }),
  pool: {
    query: mockDbQuery,
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn(),
    }),
    end: jest.fn(),
    on: jest.fn(),
  },
}));

describe('auth middleware', () => {
  let mod;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();

    mockDbQuery.mockReset();
    mockDbQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    mod = require('../src/middleware/auth');

    mockReq = { cookies: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('authenticate()', () => {
    test('rejects request without token (401)', async () => {
      mockReq.cookies = {};
      await mod.authenticate(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Token nao fornecido' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('rejects invalid token (401)', async () => {
      mockReq.cookies = { sgw_token: 'invalid-token-string' };
      await mod.authenticate(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Token invalido ou expirado' });
    });

    test('rejects expired token (401)', async () => {
      const token = jwt.sign(
        { id: 1, username: 'admin' },
        JWT_SECRET,
        { expiresIn: '0s' }
      );
      mockReq.cookies = { sgw_token: token };
      jest.advanceTimersByTime(1000);
      await mod.authenticate(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    test('rejects revoked token (401)', async () => {
      mockDbQuery.mockResolvedValue({ rows: [{ exists: true }] });

      const token = jwt.sign(
        { id: 1, username: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      mockReq.cookies = { sgw_token: token };
      await mod.authenticate(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Token revogado' });
    });

    test('passes valid token to next()', async () => {
      const token = jwt.sign(
        { id: 1, username: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      mockReq.cookies = { sgw_token: token };
      await mod.authenticate(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.username).toBe('admin');
    });

    test('token tampered with different secret fails', async () => {
      const token = jwt.sign(
        { id: 1, username: 'admin' },
        'different-secret-key-that-is-at-least-32-chars!!',
        { expiresIn: '1h' }
      );
      mockReq.cookies = { sgw_token: token };
      await mod.authenticate(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('generateToken()', () => {
    test('produces valid JWT with correct claims', () => {
      const user = { id: 1, username: 'admin' };
      const token = mod.generateToken(user);
      expect(token).toEqual(expect.any(String));

      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.id).toBe(1);
      expect(decoded.username).toBe('admin');
      expect(decoded.iss).toBe('sgw-pro');
      expect(decoded.aud).toBe('sgw-pro-api');
    });

    test('token expires in 24h', () => {
      const user = { id: 1, username: 'admin' };
      const token = mod.generateToken(user);
      const decoded = jwt.decode(token);
      const ttl = decoded.exp - decoded.iat;
      expect(ttl).toBe(86400);
    });

    test('different users produce different tokens', () => {
      const t1 = mod.generateToken({ id: 1, username: 'admin' });
      const t2 = mod.generateToken({ id: 2, username: 'user2' });
      expect(t1).not.toBe(t2);
    });
  });

  describe('revokeToken()', () => {
    test('adds token hash to blacklist', async () => {
      const user = { id: 1, username: 'admin' };
      const token = mod.generateToken(user);

      await mod.revokeToken(token);

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO revoked_tokens'),
        expect.arrayContaining([expect.any(String), expect.any(Date)])
      );
    });

    test('handles null/undefined gracefully', async () => {
      await expect(mod.revokeToken(null)).resolves.toBeUndefined();
      await expect(mod.revokeToken(undefined)).resolves.toBeUndefined();
    });
  });

  describe('cleanExpiredTokens()', () => {
    test('deletes expired tokens from database', async () => {
      mockDbQuery.mockResolvedValue({ rowCount: 5 });

      await mod.cleanExpiredTokens();

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM revoked_tokens')
      );
    });

    test('handles database errors gracefully', async () => {
      mockDbQuery.mockRejectedValue(new Error('connection lost'));

      await expect(mod.cleanExpiredTokens()).resolves.toBeUndefined();
    });
  });
});
