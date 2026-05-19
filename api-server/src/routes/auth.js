const { Router } = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../db');
const { authenticate, generateToken, setTokenCookie, clearTokenCookie } = require('../middleware/auth');

const router = Router();

const validate = [
  body('username').trim().isLength({ min: 3 }).withMessage('Usuario deve ter no minimo 3 caracteres'),
  body('password').isLength({ min: 8 }).withMessage('Senha deve ter no minimo 8 caracteres'),
];

router.post('/login', validate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { username, password } = req.body;
    const result = await query('SELECT id, username, password_hash, created_at FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }
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

router.post('/register', validate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { username, password } = req.body;
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    const result = await query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, passwordHash]
    );
    const user = result.rows[0];
    const token = generateToken(user);
    setTokenCookie(res, token);
    res.status(201).json({
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username ja existe' });
    }
    console.error('[Auth] Register error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/logout', (req, res) => {
  clearTokenCookie(res);
  res.json({ ok: true });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username } });
});

module.exports = router;
