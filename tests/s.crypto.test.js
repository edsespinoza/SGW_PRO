const { describe, test } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PFX = 'SGW';

function seg(n = 4) {
  const bytes = crypto.randomBytes(n);
  return Array.from(bytes, b => CHARS[b % CHARS.length]).join('');
}

function genLicense() {
  return `${PFX}-${new Date().getFullYear()}-${seg()}-${seg()}-${seg()}`;
}

function hashLicense(k) {
  const m = crypto.createHash('sha256').update(`${k}:${Date.now()}`).digest('hex');
  return m.slice(0, 16).toUpperCase();
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function encryptAES(plaintext, key) {
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    crypto.createHash('sha256').update(key).digest(),
    Buffer.alloc(16, 0)
  );
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

function decryptAES(ciphertext, key) {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    crypto.createHash('sha256').update(key).digest(),
    Buffer.alloc(16, 0)
  );
  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

describe('S (Client Crypto Utilities)', () => {
  describe('sha()', () => {
    test('produces consistent 64-char hex hash for same input', () => {
      const a = sha256('test-data');
      const b = sha256('test-data');
      assert.strictEqual(a, b);
      assert.match(a, /^[a-f0-9]{64}$/);
    });

    test('different inputs produce different hashes', () => {
      const a = sha256('input-a');
      const b = sha256('input-b');
      assert.notStrictEqual(a, b);
    });

    test('empty string produces valid hash', () => {
      const result = sha256('');
      assert.match(result, /^[a-f0-9]{64}$/);
    });

    test('unicode characters produce consistent hash', () => {
      const result = sha256('São Paulo — João');
      assert.match(result, /^[a-f0-9]{64}$/);
    });
  });

  describe('enc() / dec() roundtrip', () => {
    const MASTER_KEY = 'test-master-password-123';

    test('encrypt then decrypt returns original data', () => {
      const original = 'SGW Pro sensitive PII data';
      const encrypted = encryptAES(original, MASTER_KEY);
      assert.ok(typeof encrypted === 'string');
      assert.notStrictEqual(encrypted, original);

      const decrypted = decryptAES(encrypted, MASTER_KEY);
      assert.strictEqual(decrypted, original);
    });

    test('works with numbers and special chars', () => {
      const original = 'CPF: 123.456.789-00 | Phone: +55 (11) 99999-8888';
      const encrypted = encryptAES(original, MASTER_KEY);
      const decrypted = decryptAES(encrypted, MASTER_KEY);
      assert.strictEqual(decrypted, original);
    });

    test('different keys produce different ciphertext', () => {
      const data = 'same data';
      const e1 = encryptAES(data, 'key-one-12345678');
      const e2 = encryptAES(data, 'key-two-12345678');
      assert.notStrictEqual(e1, e2);
    });

    test('decrypt with wrong key throws error', () => {
      const original = 'confidential';
      const encrypted = encryptAES(original, 'correct-key-12345');
      assert.throws(() => decryptAES(encrypted, 'wrong-key-1234567'));
    });
  });
});

describe('L (License Utilities)', () => {
  describe('gen()', () => {
    test('generates license key in SGW-YYYY-XXXX-XXXX-XXXX format', () => {
      const key = genLicense();
      assert.match(key, /^SGW-\d{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    });

    test('generates unique keys on each call', () => {
      const keys = new Set();
      for (let i = 0; i < 100; i++) {
        keys.add(genLicense());
      }
      assert.strictEqual(keys.size, 100);
    });

    test('uses current year', () => {
      const key = genLicense();
      const year = new Date().getFullYear().toString();
      assert.ok(key.includes(year));
    });

    test('uses only unambiguous chars (no 0/O/1/I)', () => {
      const key = genLicense();
      const segments = key.split('-').slice(2);
      for (const seg of segments) {
        for (const ch of seg) {
          assert.ok(CHARS.includes(ch));
        }
      }
    });
  });

  describe('hash()', () => {
    test('produces 16-char uppercase hex', () => {
      const key = genLicense();
      const h = hashLicense(key);
      assert.match(h, /^[A-F0-9]{16}$/);
    });
  });
});
