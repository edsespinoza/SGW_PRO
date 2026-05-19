const { Router } = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = Router();
router.use(authenticate);

const LOG_COLS = 'id, entity_type, entity_id, action, actor, metadata, ts';

router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      entity_type,
      action,
      start_date,
      end_date,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (entity_type) {
      params.push(entity_type);
      conditions.push(`entity_type = $${params.length}`);
    }
    if (action) {
      params.push(action);
      conditions.push(`action = $${params.length}`);
    }
    if (start_date) {
      params.push(start_date);
      conditions.push(`ts >= $${params.length}::timestamptz`);
    }
    if (end_date) {
      params.push(end_date);
      conditions.push(`ts <= $${params.length}::timestamptz`);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await query(`SELECT COUNT(*) FROM audit_logs ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataResult = await query(
      `SELECT ${LOG_COLS} FROM audit_logs ${where} ORDER BY ts DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('[Audit] List error:', err);
    res.status(500).json({ error: 'Erro ao listar auditoria' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { entity_type, entity_id, action, metadata } = req.body;
    if (!entity_type || !action) {
      return res.status(400).json({ error: 'entity_type e action obrigatorios' });
    }
    const id = 'al_' + require('uuid').v4().replace(/-/g, '').slice(0, 16);
    const result = await query(
      'INSERT INTO audit_logs (id, entity_type, entity_id, action, actor, metadata) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id, entity_type, entity_id || null, action, req.user?.username || 'admin', metadata || {}]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[Audit] Create error:', err);
    res.status(500).json({ error: 'Erro ao registrar auditoria' });
  }
});

module.exports = router;
