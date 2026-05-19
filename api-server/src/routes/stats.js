const { Router } = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const results = await Promise.all([
      query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active') AS active,
          COUNT(*) FILTER (WHERE status = 'pending') AS pending,
          COUNT(*) FILTER (WHERE status = 'expired') AS expired,
          COUNT(*) FILTER (WHERE status = 'revoked') AS revoked,
          COUNT(*) AS total
        FROM licenses
      `),
      query(`
        SELECT COUNT(*) FROM licenses
        WHERE valid_until BETWEEN NOW() AND NOW() + INTERVAL '30 days'
      `),
      query(`
        SELECT COUNT(*) FROM audit_logs
        WHERE ts >= NOW() - INTERVAL '7 days'
      `),
      query(`SELECT COUNT(*) FROM images`),
    ]);

    const counts = results[0].rows[0];
    const exp30 = parseInt(results[1].rows[0].count);
    const recentLogs = parseInt(results[2].rows[0].count);
    const totalImages = parseInt(results[3].rows[0].count);

    const active = parseInt(counts.active);
    const mrr = active * 197;
    const arr = mrr * 12;

    res.json({
      total: parseInt(counts.total),
      active,
      pending: parseInt(counts.pending),
      expired: parseInt(counts.expired),
      revoked: parseInt(counts.revoked),
      expiring30d: exp30,
      recentLogs7d: recentLogs,
      totalImages,
      mrr,
      arr,
    });
  } catch (err) {
    console.error('[Stats] Error:', err);
    res.status(500).json({ error: 'Erro ao obter estatisticas' });
  }
});

module.exports = router;
