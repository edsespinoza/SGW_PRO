const nodeCrypto = require('crypto');

describe('crypto.js', () => {
  let mod;

  beforeAll(() => {
    mod = require('../src/crypto');
  });

  describe('encrypt / decrypt roundtrip', () => {
    test('encrypt followed by decrypt returns original string', () => {
      const original = 'SGW Pro license data with PII';
      const encrypted = mod.encrypt(original);
      expect(encrypted).toEqual(expect.any(String));
      expect(encrypted).not.toBe(original);
      const decrypted = mod.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    test('works with empty string', () => {
      const original = '';
      const encrypted = mod.encrypt(original);
      const decrypted = mod.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    test('works with special characters and unicode', () => {
      const original = 'São Paulo — João & Maria: 123! @#$% 😀';
      const encrypted = mod.encrypt(original);
      const decrypted = mod.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    test('works with large payload (100KB)', () => {
      const original = 'x'.repeat(100 * 1024);
      const encrypted = mod.encrypt(original);
      const decrypted = mod.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    test('produces different ciphertext each time (salt + iv)', () => {
      const original = 'same data';
      const e1 = mod.encrypt(original);
      const e2 = mod.encrypt(original);
      expect(e1).not.toBe(e2);
    });
  });

  describe('decrypt error handling', () => {
    test('throws on invalid base64', () => {
      expect(() => mod.decrypt('not-base64-!!!')).toThrow();
    });

    test('throws on truncated ciphertext', () => {
      const original = 'valid data';
      const encrypted = mod.encrypt(original);
      const truncated = encrypted.slice(0, 20);
      expect(() => mod.decrypt(truncated)).toThrow();
    });

    test('throws on tampered ciphertext', () => {
      const original = 'valid data';
      const encrypted = mod.encrypt(original);
      const buf = Buffer.from(encrypted, 'base64');
      buf[10] = buf[10] ^ 0xff;
      const tampered = buf.toString('base64');
      expect(() => mod.decrypt(tampered)).toThrow();
    });
  });

  describe('hash', () => {
    test('produces consistent SHA-256 hex output', () => {
      const result = mod.hash('hello');
      expect(result).toBe(nodeCrypto.createHash('sha256').update('hello').digest('hex'));
    });

    test('hash is deterministic', () => {
      const a = mod.hash('SGW Pro');
      const b = mod.hash('SGW Pro');
      expect(a).toBe(b);
    });

    test('different inputs produce different hashes', () => {
      const a = mod.hash('license-001');
      const b = mod.hash('license-002');
      expect(a).not.toBe(b);
    });

    test('output is 64 hex characters', () => {
      const result = mod.hash('anything');
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('key derivation cache', () => {
    test('multiple encrypts reuse derived key', () => {
      const spy = jest.spyOn(nodeCrypto, 'pbkdf2Sync');
      mod.encrypt('data-a');
      mod.encrypt('data-b');
      mod.encrypt('data-c');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
