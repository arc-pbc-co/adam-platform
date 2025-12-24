import { Router } from 'express';
import { db } from '../database';

const router = Router();

// Get agent activities
router.get('/activities', async (req, res, next) => {
  try {
    const { experiment_id, agent_type, limit = 50 } = req.query;

    let query = 'SELECT * FROM agent_activities';
    const params: any[] = [];
    const conditions: string[] = [];

    if (experiment_id) {
      conditions.push(`experiment_id = $${params.length + 1}`);
      params.push(experiment_id);
    }

    if (agent_type) {
      conditions.push(`agent_type = $${params.length + 1}`);
      params.push(agent_type);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY started_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await db.query(query, params);

    res.json({
      activities: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    next(error);
  }
});

// Get agent metrics
router.get('/metrics', async (req, res, next) => {
  try {
    const { agent_type } = req.query;

    let query = `
      SELECT
        agent_type,
        COUNT(*) as total_activities,
        AVG(duration_ms) as avg_duration_ms,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM agent_activities
    `;

    const params: any[] = [];

    if (agent_type) {
      query += ' WHERE agent_type = $1';
      params.push(agent_type);
    }

    query += ' GROUP BY agent_type ORDER BY total_activities DESC';

    const result = await db.query(query, params);

    res.json({
      metrics: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
