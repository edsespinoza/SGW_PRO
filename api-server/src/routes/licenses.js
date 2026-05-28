const { Router } = require('express');
const { query, transaction } = require('../db');
const { encrypt, decrypt } = require('../crypto');
const { authenticate } = require('../middleware/auth');

const router = Router();
router.use(authenticate);

const SENSITIVE_FIELDS = ['cpf_cnpj', 'email', 'phone', 'sgw_login', 'sgw_password'];
const LICENSE_COLS = 'id, license_key, customer_name, cpf_cnpj, email, phone, equipment, equipment_serial, region, sgw_login, sgw_password, activation_date, valid_until, technician, status, device_fingerprint, brands, observations, pdf_source, has_cert, created_at, updated_at';
const LICENSE_COLS_DETAIL = 'id, license_key, validation_hash, customer_name, cpf_cnpj, email, phone, equipment, equipment_serial, region, sgw_login, sgw_password, activation_date, valid_until, technician, status, device_fingerprint, brands, observations, pdf_source, has_cert, created_at, updated_at';
const IMAGE_COLS = 'id, license_id, screen_id, data, ts';

const CAMEL_TO_SNAKE = {
  validUntil:'valid_until', activationDate:'activation_date',
  customerName:'customer_name', equipmentSerial:'equipment_serial',
  sgwLogin:'sgw_login', sgwPassword:'sgw_password',
  cpfCnpj:'cpf_cnpj', deviceFingerprint:'device_fingerprint',
  pdfSource:'pdf_source', hasCert:'has_cert',
  createdAt:'created_at', updatedAt:'updated_at',
  licenseKey:'license_key', validationHash:'validation_hash',
  customerDocument:'cpf_cnpj', customerPhone:'phone', customerEmail:'email',
  equipment:'equipment',
  technician:'technician', status:'status', brands:'brands',
  observations:'observations', region:'region', id:'id',
};
const SNAKE_TO_CAMEL = {};
for (const [k, v] of Object.entries(CAMEL_TO_SNAKE)) SNAKE_TO_CAMEL[v] = k;
SNAKE_TO_CAMEL['id'] = 'id';

function toSnake(obj) {
  const r = {};
  for (const [k, v] of Object.entries(obj)) r[CAMEL_TO_SNAKE[k] || k] = v;
  return r;
}
function toCamel(obj) {
  if (!obj) return obj;
  const r = {};
  for (const [k, v] of Object.entries(obj)) r[SNAKE_TO_CAMEL[k] || k] = v;
  return r;
}

function encryptFields(data) {
  const result = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    if (result[field]) {
      result[field] = encrypt(result[field]);
    }
  }
  return result;
}

function decryptFields(data) {
  if (!data) return data;
  const result = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    if (result[field]) {
      try {
        result[field] = decrypt(result[field]);
      } catch {
        result[field] = result[field];
      }
    }
  }
  return result;
}

function maskSensitive(data) {
  if (!data) return data;
  const result = { ...data };
  if (result.sgw_password && result.sgw_password.length > 4) {
    result.sgw_password =
      result.sgw_password[0] +
      '*'.repeat(result.sgw_password.length - 2) +
      result.sgw_password[result.sgw_password.length - 1];
  }
  if (result.cpf_cnpj && result.cpf_cnpj.length > 4) {
    result.cpf_cnpj =
      result.cpf_cnpj.slice(0, 3) +
      '.***.***-' +
      result.cpf_cnpj.slice(-2);
  }
  return result;
}

router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      region,
      q,
      sort = 'updated_at',
      order = 'DESC',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (region) {
      params.push(region);
      conditions.push(`region = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      conditions.push(
        `(customer_name ILIKE $${params.length} OR license_key ILIKE $${params.length} OR equipment_serial ILIKE $${params.length})`
      );
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const allowedSort = ['updated_at', 'created_at', 'customer_name', 'valid_until', 'status'];
    const sortCol = allowedSort.includes(sort) ? sort : 'updated_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await query(`SELECT COUNT(*) FROM licenses ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataResult = await query(
      `SELECT ${LICENSE_COLS} FROM licenses ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    );

    let rows = dataResult.rows.map(maskSensitive).map(toCamel);

    res.json({
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('[Licenses] List error:', err);
    res.status(500).json({ error: 'Erro ao listar licencas' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'active') AS active,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'expired') AS expired,
        COUNT(*) FILTER (WHERE status = 'revoked') AS revoked,
        COUNT(*) FILTER (WHERE valid_until < NOW() AND status = 'active') AS overdue,
        COUNT(*) FILTER (WHERE valid_until BETWEEN NOW() AND NOW() + INTERVAL '30 days') AS expiring_30d
      FROM licenses
    `);
    const row = result.rows[0];
    res.json({
      total: parseInt(row.total),
      active: parseInt(row.active),
      pending: parseInt(row.pending),
      expired: parseInt(row.expired),
      revoked: parseInt(row.revoked),
      overdue: parseInt(row.overdue),
      expiring30d: parseInt(row.expiring_30d),
    });
  } catch (err) {
    console.error('[Licenses] Stats error:', err);
    res.status(500).json({ error: 'Erro ao obter estatisticas' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await query(`SELECT ${LICENSE_COLS_DETAIL} FROM licenses WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Licenca nao encontrada' });
    }
    res.json(toCamel(decryptFields(result.rows[0])));
  } catch (err) {
    console.error('[Licenses] Get error:', err);
    res.status(500).json({ error: 'Erro ao buscar licenca' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = encryptFields(toSnake(req.body));
    if (!data.id) {
      data.id = `lic_${require('crypto').randomUUID().replace(/-/g, '').slice(0, 16)}`;
    }
    if (!data.validation_hash) {
      data.validation_hash = require('crypto').createHash('sha256').update(`${data.license_key||''}:${Date.now()}`).digest('hex').slice(0,16).toUpperCase();
    }
    const fields = [
      'id', 'license_key', 'validation_hash', 'customer_name',
      'cpf_cnpj', 'email', 'phone', 'equipment', 'equipment_serial',
      'region', 'sgw_login', 'sgw_password', 'activation_date',
      'valid_until', 'technician', 'status', 'device_fingerprint',
      'brands', 'observations', 'pdf_source', 'has_cert',
    ];
    const cols = fields.filter(f => data[f] !== undefined);
    const vals = cols.map((_, i) => `$${i + 1}`);
    const params = cols.map(f => {
      if (f === 'brands') { if (typeof data[f] === 'string') return data[f]; return JSON.stringify(data[f]); }
      if (f === 'has_cert') return data[f] ? true : false;
      return data[f];
    });
    const result = await query(
      `INSERT INTO licenses (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING ${LICENSE_COLS_DETAIL}`,
      params
    );
    res.status(201).json(toCamel(decryptFields(result.rows[0])));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Chave de licenca ja existe' });
    }
    console.error('[Licenses] Create error:', err);
    res.status(500).json({ error: 'Erro ao criar licenca' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = encryptFields(toSnake(req.body));
    if (!data.validation_hash) {
      data.validation_hash = require('crypto').createHash('sha256').update(`${data.license_key||''}:${Date.now()}`).digest('hex').slice(0,16).toUpperCase();
    }
    const fields = [
      'license_key', 'validation_hash', 'customer_name',
      'cpf_cnpj', 'email', 'phone', 'equipment', 'equipment_serial',
      'region', 'sgw_login', 'sgw_password', 'activation_date',
      'valid_until', 'technician', 'status', 'device_fingerprint',
      'brands', 'observations', 'pdf_source', 'has_cert',
    ].filter(f => data[f] !== undefined);
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    const sets = fields.map((f, i) => {
      if (f === 'brands') return `${f} = $${i + 2}::jsonb`;
      if (f === 'has_cert') return `${f} = $${i + 2}::boolean`;
      return `${f} = $${i + 2}`;
    });
    const params = fields.map(f => {
      if (f === 'brands') { if (typeof data[f] === 'string') return data[f]; return JSON.stringify(data[f]); }
      if (f === 'has_cert') return data[f] ? true : false;
      if ((f === 'activation_date' || f === 'valid_until') && !data[f]) return null;
      return data[f];
    });
    params.unshift(req.params.id);
    const result = await query(
      `UPDATE licenses SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING ${LICENSE_COLS_DETAIL}`,
      params
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Licenca nao encontrada' });
    }
    res.json(toCamel(decryptFields(result.rows[0])));
  } catch (err) {
    console.error('[Licenses] Update error:', err);
    res.status(500).json({ error: 'Erro ao atualizar licenca' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM licenses WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Licenca nao encontrada' });
    }
    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    console.error('[Licenses] Delete error:', err);
    res.status(500).json({ error: 'Erro ao excluir licenca' });
  }
});

router.get('/:id/images', async (req, res) => {
  try {
    const result = await query(
      `SELECT ${IMAGE_COLS} FROM images WHERE license_id = $1 ORDER BY screen_id`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[Images] List error:', err);
    res.status(500).json({ error: 'Erro ao listar imagens' });
  }
});

router.post('/:id/images', async (req, res) => {
  try {
    const { screens } = req.body;
    if (!Array.isArray(screens)) {
      return res.status(400).json({ error: 'screens deve ser um array' });
    }
    const result = await transaction(async (client) => {
      await client.query('DELETE FROM images WHERE license_id = $1', [req.params.id]);
      for (const screen of screens) {
        await client.query(
          'INSERT INTO images (id, license_id, screen_id, data) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET data = $4',
          [`${req.params.id}_s_${screen.screenId}`, req.params.id, screen.screenId, screen.data]
        );
      }
      return { success: true, count: screens.length };
    });
    res.json(result);
  } catch (err) {
    console.error('[Images] Save error:', err);
    res.status(500).json({ error: 'Erro ao salvar imagens' });
  }
});

module.exports = router;
