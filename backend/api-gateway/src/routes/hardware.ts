import { Router } from 'express';
import { db } from '../database';
import { publishEvent } from '../messaging/nats';
import { logger } from '../utils/logger';

const router = Router();

// Get all hardware
router.get('/', async (req, res, next) => {
  try {
    const { type, status } = req.query;

    let query = 'SELECT * FROM hardware';
    const params: any[] = [];
    const conditions: string[] = [];

    if (type) {
      conditions.push(`type = $${params.length + 1}`);
      params.push(type);
    }

    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY name ASC';

    const result = await db.query(query, params);

    res.json({
      hardware: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    next(error);
  }
});

// Get hardware by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM hardware WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Hardware not found' });
      return;
    }

    // Get recent jobs
    const jobs = await db.query(
      'SELECT * FROM jobs WHERE hardware_id = $1 ORDER BY created_at DESC LIMIT 10',
      [id]
    );

    res.json({
      hardware: result.rows[0],
      recent_jobs: jobs.rows,
    });
  } catch (error) {
    next(error);
  }
});

// Submit job to hardware
router.post('/:id/jobs', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { experiment_id, job_type, parameters } = req.body;

    // Validate hardware exists and is available
    const hardware = await db.query(
      'SELECT * FROM hardware WHERE id = $1',
      [id]
    );

    if (hardware.rows.length === 0) {
      res.status(404).json({ error: 'Hardware not found' });
      return;
    }

    if (hardware.rows[0].status !== 'idle') {
      res.status(409).json({
        error: 'Hardware is not available',
        current_status: hardware.rows[0].status,
      });
      return;
    }

    // Create job
    const result = await db.query(
      `INSERT INTO jobs (experiment_id, hardware_id, job_type, status, parameters)
       VALUES ($1, $2, $3, 'queued', $4)
       RETURNING *`,
      [experiment_id, id, job_type, JSON.stringify(parameters)]
    );

    // Update hardware status
    await db.query(
      'UPDATE hardware SET status = $1, updated_at = NOW() WHERE id = $2',
      ['busy', id]
    );

    // Publish job event
    await publishEvent('HARDWARE', 'job.submitted', {
      jobId: result.rows[0].id,
      hardwareId: id,
      experimentId: experiment_id,
      jobType: job_type,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Job submitted to hardware ${id}: ${result.rows[0].id}`);

    res.status(201).json({
      job: result.rows[0],
      message: 'Job submitted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
