const { Router } = require('express');
const { query, transaction } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT key, value FROM config');
    const config = {};
    for (const row of result.rows) {
      config[row.key] = row.value;
    }
    res.json(config);
  } catch (err) {
    console.error('[Config] Get error:', err);
    res.status(500).json({ error: 'Erro ao ler configuracoes' });
  }
});

const ALLOWED_KEYS = ['autoBackup', 'backupDirHandle', 'setup_complete', 'app_version', 'app_build'];

router.put('/', async (req, res) => {
  try {
    const entries = req.body;
    if (typeof entries !== 'object' || Array.isArray(entries)) {
      return res.status(400).json({ error: 'Body deve ser um objeto { key: value }' });
    }
    const invalid = Object.keys(entries).find(k => !ALLOWED_KEYS.includes(k));
    if (invalid) {
      return res.status(400).json({ error: 'Chave nao permitida: ' + invalid });
    }
    await transaction(async (client) => {
      for (const [key, value] of Object.entries(entries)) {
        await client.query(
          'INSERT INTO config (key, value, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()',
          [key, JSON.stringify(value)]
        );
      }
    });
    res.json({ updated: Object.keys(entries) });
  } catch (err) {
    console.error('[Config] Update error:', err);
    res.status(500).json({ error: 'Erro ao atualizar configuracoes' });
  }
});

module.exports = router;
