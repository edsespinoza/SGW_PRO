require('dotenv').config();
const bcrypt = require('bcrypt');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');

const { query } = require('./db');
const authRoutes = require('./routes/auth');
const { cleanExpiredTokens } = require('./middleware/auth');
const licensesRoutes = require('./routes/licenses');
const auditRoutes = require('./routes/audit');
const configRoutes = require('./routes/config');
const backupRoutes = require('./routes/backup');
const statsRoutes = require('./routes/stats');
const aiRoutes = require('./routes/ai');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(',')
    : ['http://localhost:8081', 'http://localhost:8080'],
  credentials: true,
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: req => req.method === 'GET',
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/v1/auth', authLimiter);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/v1/', apiLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  req.id = uuidv4().replace(/-/g, '').slice(0, 12);
  res.setHeader('X-Request-Id', req.id);
  next();
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'JSON mal formatado' });
  }
  next();
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/licenses', licensesRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/config', configRoutes);
app.use('/api/v1/backup', backupRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/ai', aiRoutes);

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// CSP report collector (SEC-009)
app.post('/api/v1/csp-report', (req, res) => {
  const report = req.body?.['csp-report'] || req.body;
  if (report) {
    console.warn('[CSP] Violation:', JSON.stringify({
      'blocked-uri': report['blocked-uri'] || '?',
      'violated-directive': report['violated-directive'] || '?',
      'script-sample': (report['script-sample'] || '').slice(0, 100),
      'line-number': report['line-number'],
    }));
  }
  res.status(204).end();
});

app.use((err, req, res, next) => {
  console.error('[API] Unhandled error:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    requestId: req.id,
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SGW Pro API rodando em http://0.0.0.0:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/v1/health`);
    seedAdmin();
  });
  setInterval(() => cleanExpiredTokens(), 3600000);
}

module.exports = app;

async function seedAdmin() {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 8) {
    console.warn('[Seed] ADMIN_PASSWORD nao definido ou muito curto — admin seed ignorado');
    return;
  }
  try {
    const result = await query('SELECT id FROM users WHERE username = $1', ['admin']);
    if (result.rows.length > 0) {
      console.log('[Seed] Admin ja existe, pulando seed');
      return;
    }
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(adminPassword, salt);
    await query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
      ['admin', hash]
    );
    console.log('[Seed] Admin criado com sucesso');
  } catch (err) {
    console.error('[Seed] Erro ao criar admin:', err.message);
  }
}
