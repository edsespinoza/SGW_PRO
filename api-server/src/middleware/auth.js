const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('[FATAL] JWT_SECRET nao configurado ou muito curto (min 32 chars)');
  process.exit(1);
}

function authenticate(req, res, next) {
  const token = req.cookies?.sgw_token || (() => {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) return header.split(' ')[1];
    return null;
  })();
  if (!token) {
    return res.status(401).json({ error: 'Token nao fornecido' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
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

module.exports = { authenticate, generateToken, setTokenCookie, clearTokenCookie };
