const { Router } = require('express');
const https = require('https');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.use(authenticate);

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Limite de requisicoes AI excedido (5/min). Tente novamente em breve.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

router.post('/proxy', aiLimiter, async (req, res) => {
  try {
    if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'sk-ant-placeholder') {
      return res.status(400).json({
        error: 'ANTHROPIC_API_KEY nao configurada no servidor',
        details: 'Defina ANTHROPIC_API_KEY no .env para ativar o proxy Claude'
      });
    }

    const body = JSON.stringify({
      model: req.body.model || 'claude-sonnet-4-20250514',
      max_tokens: req.body.max_tokens || 1024,
      messages: req.body.messages,
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const proxyReq = https.request(options, (proxyRes) => {
      res.status(proxyRes.statusCode);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('[AI Proxy] Erro na requisicao:', err.message);
      res.status(502).json({ error: 'Falha ao conectar com Claude API' });
    });

    proxyReq.write(body);
    proxyReq.end();
  } catch (err) {
    console.error('[AI Proxy] Erro interno:', err);
    res.status(500).json({ error: 'Erro interno no proxy AI' });
  }
});

module.exports = router;
