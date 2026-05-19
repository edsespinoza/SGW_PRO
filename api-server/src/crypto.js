const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_DERIVATION = 'pbkdf2';
const SALT_SIZE = 32;
const IV_SIZE = 16;
const TAG_SIZE = 16;
const ITERATIONS = 600000;
const KEY_LENGTH = 32;
const DIGEST = 'sha512';

const keyCache = new Map();

function deriveKey(salt) {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters');
  }
  const cacheKey = salt.toString('hex');
  const cached = keyCache.get(cacheKey);
  if (cached) return cached;
  const derived = crypto.pbkdf2Sync(key, salt, ITERATIONS, KEY_LENGTH, DIGEST);
  keyCache.set(cacheKey, derived);
  return derived;
}

function encrypt(plaintext) {
  const salt = crypto.randomBytes(SALT_SIZE);
  const iv = crypto.randomBytes(IV_SIZE);
  const key = deriveKey(salt);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([salt, iv, tag, encrypted]);
  return combined.toString('base64');
}

function decrypt(ciphertext) {
  const combined = Buffer.from(ciphertext, 'base64');
  const salt = combined.subarray(0, SALT_SIZE);
  const iv = combined.subarray(SALT_SIZE, SALT_SIZE + IV_SIZE);
  const tag = combined.subarray(SALT_SIZE + IV_SIZE, SALT_SIZE + IV_SIZE + TAG_SIZE);
  const encrypted = combined.subarray(SALT_SIZE + IV_SIZE + TAG_SIZE);
  const key = deriveKey(salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = { encrypt, decrypt, hash };
