const { Router } = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../db');
const { authenticate, generateToken, setTokenCookie, clearTokenCookie, revokeToken } = require('../middleware/auth');

const router = Router();

const validate = [
  body('username').trim().isLength({ min: 3 }).withMessage('Usuario deve ter no minimo 3 caracteres'),
  body('password').isLength({ min: 8 }).withMessage('Senha deve ter no minimo 8 caracteres'),
];

const loginAttempts = new Map();

router.post('/login', validate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { username, password } = req.body;
    const lowUsername = (username || '').toLowerCase();

    // B-05: rate limit por username (5 tentativas, decai 1 a cada 60s)
    const attempts = loginAttempts.get(lowUsername) || 0;
    if (attempts >= 5) {
      return res.status(429).json({ error: 'Conta temporariamente bloqueada. Tente novamente em alguns minutos.' });
    }

    const result = await query('SELECT id, username, password_hash, created_at FROM users WHERE LOWER(username) = $1', [lowUsername]);
    if (result.rows.length === 0) {
      loginAttempts.set(lowUsername, (loginAttempts.get(lowUsername) || 0) + 1);
      setTimeout(() => { const a = loginAttempts.get(lowUsername); if (a && a > 0) loginAttempts.set(lowUsername, a - 1); }, 60000);
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      loginAttempts.set(lowUsername, (loginAttempts.get(lowUsername) || 0) + 1);
      setTimeout(() => { const a = loginAttempts.get(lowUsername); if (a && a > 0) loginAttempts.set(lowUsername, a - 1); }, 60000);
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    // Login bem-sucedido: resetar contagem
    loginAttempts.delete(lowUsername);

    const token = generateToken(user);
    setTokenCookie(res, token);
    res.json({
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Registro desabilitado — admin é criado via ADMIN_PASSWORD no seed
// Manter apenas o stub para não quebrar compatibilidade de rota
router.post('/register', (req, res) => {
  res.status(403).json({ error: 'Registro desabilitado. Use ADMIN_PASSWORD no .env para criar o admin.' });
});

router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.sgw_token;
    if (token) await revokeToken(token);
  } catch (e) {
    console.warn('[Auth] Erro ao revogar token:', e.message);
  }
  clearTokenCookie(res);
  res.json({ ok: true });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username } });
});

module.exports = router;
