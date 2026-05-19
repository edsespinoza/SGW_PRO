const { Router } = require('express');
const { query, transaction } = require('../db');
const { encrypt, decrypt, hash } = require('../crypto');
const { authenticate } = require('../middleware/auth');

const router = Router();
router.use(authenticate);

const LICS_COLS = 'id, license_key, validation_hash, customer_name, cpf_cnpj, email, phone, equipment, equipment_serial, region, sgw_login, sgw_password, activation_date, valid_until, technician, status, device_fingerprint, brands, observations, pdf_source, has_cert, created_at, updated_at';
const IMGS_COLS = 'id, license_id, screen_id, data, ts';
const LOGS_COLS = 'id, entity_type, entity_id, action, actor, metadata, ts';
const LIC_FIELDS = LICS_COLS.split(', ');

router.post('/export', async (req, res) => {
  try {
    const licenses = await query(`SELECT ${LICS_COLS} FROM licenses ORDER BY created_at`);
    const images = await query(`SELECT ${IMGS_COLS} FROM images ORDER BY license_id, screen_id`);
    const logs = await query(`SELECT ${LOGS_COLS} FROM audit_logs ORDER BY ts`);
    const configs = await query('SELECT key, value FROM config');

    const payload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        licenses: licenses.rows,
        images: images.rows,
        audit_logs: logs.rows,
        config: configs.rows,
      },
    };

    const checksum = hash(JSON.stringify(payload));
    const encryptedData = encrypt(JSON.stringify(payload));
    res.json({
      format: 'encrypted',
      checksum,
      data: encryptedData,
    });
  } catch (err) {
    console.error('[Backup] Export error:', err);
    res.status(500).json({ error: 'Erro ao exportar dados' });
  }
});

router.post('/import', async (req, res) => {
  try {
    const { format, data, checksum } = req.body;
    let payload;

    if (format === 'encrypted') {
      const decrypted = decrypt(data);
      if (checksum) {
        const computed = hash(decrypted);
        if (computed !== checksum) {
          return res.status(400).json({ error: 'Checksum invalido — dados corrompidos' });
        }
      }
      payload = JSON.parse(decrypted);
    } else {
      payload = data;
    }

    const { licenses, images, audit_logs, config: configs } = payload.data;

    await transaction(async (client) => {
      if (Array.isArray(licenses)) {
        for (const lic of licenses) {
          const cols = Object.keys(lic).filter(c => LIC_FIELDS.includes(c));
          if (!cols.length) continue;
          const vals = cols.map((_, i) => `$${i + 1}`);
          const params = cols.map(c => {
            if (c === 'brands' && typeof lic[c] === 'object') return JSON.stringify(lic[c]);
            return lic[c];
          });
          await client.query(
            `INSERT INTO licenses (${cols.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT (id) DO UPDATE SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')}`,
            params
          );
        }
      }
      if (Array.isArray(images)) {
        for (const img of images) {
          await client.query(
            'INSERT INTO images (id, license_id, screen_id, data) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET data = $4',
            [img.id, img.license_id, img.screen_id, img.data]
          );
        }
      }
      if (Array.isArray(audit_logs)) {
        for (const log of audit_logs) {
          await client.query(
            'INSERT INTO audit_logs (id, entity_type, entity_id, action, actor, metadata, ts) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
            [log.id, log.entity_type, log.entity_id, log.action, log.actor, log.metadata || {}, log.ts]
          );
        }
      }
      if (Array.isArray(configs)) {
        for (const cfg of configs) {
          await client.query(
            'INSERT INTO config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
            [cfg.key, cfg.value]
          );
        }
      }
    });

    res.json({ imported: true, licenses: licenses?.length || 0, images: images?.length || 0 });
  } catch (err) {
    console.error('[Backup] Import error:', err);
    res.status(500).json({ error: 'Erro ao importar dados' });
  }
});

module.exports = router;
