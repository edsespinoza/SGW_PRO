const { Router } = require('express');
const crypto = require('crypto');
const { query, transaction } = require('../db');
const { encrypt, decrypt, hash } = require('../crypto');
const { authenticate } = require('../middleware/auth');

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch { return false; }
}

const router = Router();
router.use(authenticate);

const LICS_COLS = 'id, license_key, validation_hash, customer_name, cpf_cnpj, email, phone, equipment, equipment_serial, region, sgw_login, sgw_password, activation_date, valid_until, technician, status, device_fingerprint, brands, observations, pdf_source, has_cert, created_at, updated_at';
const IMGS_COLS = 'id, license_id, screen_id, data, ts';
const LOGS_COLS = 'id, entity_type, entity_id, action, actor, metadata, ts';
const LIC_FIELDS = LICS_COLS.split(', ');

function derivePasswordKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

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
    let encryptedData = encrypt(JSON.stringify(payload));
    let format = 'encrypted';

    // SEC-007: envelope opcional com senha do operador
    const { password } = req.body;
    if (password && password.length >= 4) {
      const pwSalt = crypto.randomBytes(16);
      const pwKey = derivePasswordKey(password, pwSalt);
      const pwIv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', pwKey, pwIv);
      const pwEncrypted = Buffer.concat([
        cipher.update(encryptedData, 'utf8'),
        cipher.final(),
      ]);
      const pwTag = cipher.getAuthTag();
      encryptedData = Buffer.concat([pwSalt, pwIv, pwTag, pwEncrypted]).toString('base64');
      format = 'encrypted+password';
    }

    res.json({
      format,
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
    const { format, data, checksum, password } = req.body;

    if (format !== 'encrypted' && format !== 'encrypted+password') {
      return res.status(400).json({ error: 'Formato de backup invalido. Use "encrypted" ou "encrypted+password".' });
    }
    if (!checksum || typeof checksum !== 'string' || checksum.length !== 64) {
      return res.status(400).json({ error: 'Checksum SHA-256 obrigatorio (64 caracteres hex).' });
    }
    if (!data || typeof data !== 'string' || data.length > 50 * 1024 * 1024) {
      return res.status(400).json({ error: 'Dados de backup invalidos ou muito grandes (max 50MB).' });
    }

    let decryptionInput = data;

    // SEC-007: descriptografar envelope de senha primeiro
    if (format === 'encrypted+password') {
      if (!password || password.length < 4) {
        return res.status(400).json({ error: 'Senha do operador obrigatoria para formato encrypted+password.' });
      }
      const combined = Buffer.from(data, 'base64');
      const SALT_SIZE = 16, IV_SIZE = 16, TAG_SIZE = 16;
      const pwSalt = combined.subarray(0, SALT_SIZE);
      const pwIv = combined.subarray(SALT_SIZE, SALT_SIZE + IV_SIZE);
      const pwTag = combined.subarray(SALT_SIZE + IV_SIZE, SALT_SIZE + IV_SIZE + TAG_SIZE);
      const pwEncrypted = combined.subarray(SALT_SIZE + IV_SIZE + TAG_SIZE);
      const pwKey = derivePasswordKey(password, pwSalt);
      const decipher = crypto.createDecipheriv('aes-256-gcm', pwKey, pwIv);
      decipher.setAuthTag(pwTag);
      decryptionInput = Buffer.concat([decipher.update(pwEncrypted), decipher.final()]).toString('utf8');
    }

    const decrypted = decrypt(decryptionInput);
    const computed = hash(decrypted);
    if (!timingSafeEqual(computed, checksum)) {
      return res.status(400).json({ error: 'Checksum invalido — dados corrompidos ou adulterados.' });
    }

    let payload;
    try {
      payload = JSON.parse(decrypted);
    } catch {
      return res.status(400).json({ error: 'Payload JSON invalido apos descriptografia.' });
    }

    if (!payload.version || !payload.data) {
      return res.status(400).json({ error: 'Estrutura do backup invalida: campos version e data obrigatorios.' });
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
