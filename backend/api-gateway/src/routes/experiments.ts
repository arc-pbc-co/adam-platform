import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { publishEvent } from '../messaging/nats';
import { logger } from '../utils/logger';
import Joi from 'joi';
import { authenticateToken, optionalAuth, getUserId, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Validation schemas
const createExperimentSchema = Joi.object({
  name: Joi.string().required().max(255),
  description: Joi.string().optional(),
  hypothesis: Joi.string().required(),
  materials: Joi.array().items(Joi.object({
    material_id: Joi.string().uuid().required(),
    quantity: Joi.number().positive().required(),
    unit: Joi.string().required(),
    role: Joi.string().required(),
  })).optional(),
  parameters: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    value: Joi.string().required(),
    unit: Joi.string().optional(),
  })).optional(),
});

// Get all experiments
router.get('/', async (req, res, next) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM experiments';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      experiments: result.rows,
      total: result.rowCount,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    next(error);
  }
});

// Get experiment by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM experiments WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }

    // Get related data
    const [parameters, materials, jobs, activities] = await Promise.all([
      db.query('SELECT * FROM experiment_parameters WHERE experiment_id = $1', [id]),
      db.query('SELECT * FROM experiment_materials WHERE experiment_id = $1', [id]),
      db.query('SELECT * FROM jobs WHERE experiment_id = $1 ORDER BY created_at DESC', [id]),
      db.query('SELECT * FROM agent_activities WHERE experiment_id = $1 ORDER BY started_at DESC', [id]),
    ]);

    res.json({
      experiment: result.rows[0],
      parameters: parameters.rows,
      materials: materials.rows,
      jobs: jobs.rows,
      agent_activities: activities.rows,
    });
  } catch (error) {
    next(error);
  }
});

// Create new experiment (requires authentication)
router.post('/', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    // Validate request body
    const { error, value } = createExperimentSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0].message });
      return;
    }

    const { name, description, hypothesis, materials, parameters } = value;
    const experimentId = uuidv4();

    // Get user ID from JWT or fallback to admin in development
    const userId = getUserId(req);

    // Insert experiment
    const result = await db.query(
      `INSERT INTO experiments (id, name, description, hypothesis, status, risk_level, created_by)
       VALUES ($1, $2, $3, $4, 'pending', 'R1', $5)
       RETURNING *`,
      [experimentId, name, description, hypothesis, userId]
    );

    // Insert parameters if provided
    if (parameters && parameters.length > 0) {
      for (const param of parameters) {
        await db.query(
          `INSERT INTO experiment_parameters (experiment_id, parameter_name, parameter_value, unit)
           VALUES ($1, $2, $3, $4)`,
          [experimentId, param.name, param.value, param.unit]
        );
      }
    }

    // Insert materials if provided
    if (materials && materials.length > 0) {
      for (const material of materials) {
        await db.query(
          `INSERT INTO experiment_materials (experiment_id, material_id, quantity, unit, role)
           VALUES ($1, $2, $3, $4, $5)`,
          [experimentId, material.material_id, material.quantity, material.unit, material.role]
        );
      }
    }

    // Publish event to NATS for orchestrator
    await publishEvent('EXPERIMENTS', 'experiment.created', {
      experimentId,
      name,
      hypothesis,
      createdBy: userId,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Experiment created: ${experimentId}`);

    res.status(201).json({
      experiment: result.rows[0],
      message: 'Experiment created successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Approve experiment (for R2/R3 risk levels, requires authentication)
router.post('/:id/approve', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { approved, comments } = req.body;

    // Get user ID from JWT or fallback to admin in development
    const userId = getUserId(req);

    const result = await db.query(
      `UPDATE experiments
       SET approval_status = $1, approved_by = $2, approved_at = NOW(), updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [approved ? 'approved' : 'rejected', userId, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }

    // Publish approval event
    await publishEvent('EXPERIMENTS', `experiment.${approved ? 'approved' : 'rejected'}`, {
      experimentId: id,
      approvedBy: userId,
      comments,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Experiment ${approved ? 'approved' : 'rejected'}: ${id}`);

    res.json({
      experiment: result.rows[0],
      message: `Experiment ${approved ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error) {
    next(error);
  }
});

// Cancel experiment
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await db.query(
      `UPDATE experiments
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND status NOT IN ('completed', 'cancelled')
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Experiment not found or cannot be cancelled' });
      return;
    }

    // Publish cancellation event
    await publishEvent('EXPERIMENTS', 'experiment.cancelled', {
      experimentId: id,
      reason,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Experiment cancelled: ${id}`);

    res.json({
      experiment: result.rows[0],
      message: 'Experiment cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
