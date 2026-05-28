const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('[FATAL] JWT_SECRET nao configurado ou muito curto (min 32 chars)');
  process.exit(1);
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function isTokenRevoked(token) {
  const hash = tokenHash(token);
  const result = await query('SELECT 1 FROM revoked_tokens WHERE token_hash = $1 AND expires_at > now()', [hash]);
  return result.rows.length > 0;
}

async function authenticate(req, res, next) {
  const token = req.cookies?.sgw_token;
  if (!token) {
    return res.status(401).json({ error: 'Token nao fornecido' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const revoked = await isTokenRevoked(token);
    if (revoked) {
      return res.status(401).json({ error: 'Token revogado' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalido ou expirado' });
  }
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '24h', issuer: 'sgw-pro', audience: 'sgw-pro-api' }
  );
}

async function revokeToken(token) {
  if (!token) return;
  const hash = tokenHash(token);
  const decoded = jwt.decode(token);
  const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 86400000);
  await query(
    'INSERT INTO revoked_tokens (token_hash, expires_at) VALUES ($1, $2) ON CONFLICT (token_hash) DO NOTHING',
    [hash, expiresAt]
  );
}

function setTokenCookie(res, token) {
  res.cookie('sgw_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearTokenCookie(res) {
  res.clearCookie('sgw_token', { path: '/' });
}

async function cleanExpiredTokens() {
  try {
    const result = await query('DELETE FROM revoked_tokens WHERE expires_at < now()');
    if (result.rowCount > 0) {
      console.log(`[Auth] Limpeza: ${result.rowCount} token(s) expirado(s) removido(s)`);
    }
  } catch (err) {
    console.error('[Auth] Erro na limpeza de tokens:', err.message);
  }
}

module.exports = { authenticate, generateToken, setTokenCookie, clearTokenCookie, revokeToken, cleanExpiredTokens };
