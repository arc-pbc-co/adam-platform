/**
 * INTERSECT Integration API Routes
 *
 * Provides REST endpoints for:
 * - Controller discovery and health
 * - Activity management
 * - Action execution
 * - Event reception from controllers
 */

import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../database';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// Event Receiver Endpoint (for controllers to push events)
// ============================================================================

/**
 * POST /intersect/events
 * Receive events from INTERSECT controllers
 */
router.post('/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = req.body;

    logger.info('[INTERSECT] Received event:', {
      eventType: event.eventType,
      controllerId: event.controllerId,
      activityId: event.payload?.activityId,
    });

    // Store event in log
    await db.query(
      `INSERT INTO intersect_event_log
       (event_type, controller_id, activity_id, experiment_run_id, campaign_id, payload, processing_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'received')
       RETURNING id`,
      [
        event.eventType,
        event.controllerId,
        event.payload?.activityId,
        event.payload?.correlation?.experimentRunId,
        event.payload?.correlation?.campaignId,
        JSON.stringify(event.payload),
      ]
    );

    // Update activity correlation if status change
    if (event.eventType === 'activity.status_change' && event.payload?.activityId) {
      await db.query(
        `UPDATE intersect_activity_correlations
         SET status = $1, updated_at = NOW()
         WHERE activity_id = $2`,
        [event.payload.activityStatus, event.payload.activityId]
      );
    }

    // TODO: Forward to EventBridge for processing
    // This would be handled by the Nova orchestrator in production

    res.status(202).json({ received: true, eventId: event.eventType });
  } catch (error) {
    logger.error('[INTERSECT] Error processing event:', error);
    next(error);
  }
});

// ============================================================================
// Controller Management
// ============================================================================

/**
 * GET /intersect/controllers
 * List registered instrument controllers
 */
router.get('/controllers', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query(
      `SELECT
        controller_id,
        controller_name,
        controller_type,
        endpoint,
        status,
        last_health_check,
        capabilities,
        created_at,
        updated_at
       FROM intersect_controller_registry
       ORDER BY controller_name`
    );

    res.json({
      controllers: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /intersect/controllers
 * Register a new instrument controller
 */
router.post('/controllers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      controllerId,
      controllerName,
      controllerType,
      endpoint,
      healthEndpoint,
      capabilities,
    } = req.body;

    if (!controllerId || !controllerName || !endpoint) {
      res.status(400).json({
        error: 'Missing required fields: controllerId, controllerName, endpoint',
      });
      return;
    }

    const result = await db.query(
      `INSERT INTO intersect_controller_registry
       (controller_id, controller_name, controller_type, endpoint, health_endpoint, capabilities, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'unknown')
       ON CONFLICT (controller_id)
       DO UPDATE SET
         controller_name = EXCLUDED.controller_name,
         controller_type = EXCLUDED.controller_type,
         endpoint = EXCLUDED.endpoint,
         health_endpoint = EXCLUDED.health_endpoint,
         capabilities = EXCLUDED.capabilities,
         updated_at = NOW()
       RETURNING *`,
      [
        controllerId,
        controllerName,
        controllerType || 'instrument',
        endpoint,
        healthEndpoint,
        JSON.stringify(capabilities || { actions: [], activities: [] }),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /intersect/controllers/:controllerId/health
 * Check controller health
 */
router.get('/controllers/:controllerId/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { controllerId } = req.params;

    // Get controller endpoint
    const controllerResult = await db.query(
      `SELECT endpoint, health_endpoint FROM intersect_controller_registry WHERE controller_id = $1`,
      [controllerId]
    );

    if (controllerResult.rowCount === 0) {
      res.status(404).json({ error: 'Controller not found' });
      return;
    }

    const controller = controllerResult.rows[0];
    const healthEndpoint = controller.health_endpoint || '/health';

    // Check health
    try {
      const response = await fetch(`${controller.endpoint}${healthEndpoint}`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      const healthy = response.ok;
      const healthData = await response.json().catch(() => ({}));

      // Update controller status
      await db.query(
        `UPDATE intersect_controller_registry
         SET status = $1, last_health_check = NOW()
         WHERE controller_id = $2`,
        [healthy ? 'online' : 'degraded', controllerId]
      );

      res.json({
        controllerId,
        healthy,
        status: healthy ? 'online' : 'degraded',
        details: healthData,
        checkedAt: new Date().toISOString(),
      });
    } catch (fetchError) {
      // Update controller status to offline
      await db.query(
        `UPDATE intersect_controller_registry
         SET status = 'offline', last_health_check = NOW()
         WHERE controller_id = $1`,
        [controllerId]
      );

      res.json({
        controllerId,
        healthy: false,
        status: 'offline',
        error: (fetchError as Error).message,
        checkedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Activity Management
// ============================================================================

/**
 * GET /intersect/activities
 * List activities with optional filters
 */
router.get('/activities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { experimentRunId, status, controllerId, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT
        ac.*,
        (SELECT COUNT(*) FROM intersect_data_products dp WHERE dp.activity_id = ac.activity_id) as data_product_count
      FROM intersect_activity_correlations ac
      WHERE 1=1
    `;
    const params: any[] = [];

    if (experimentRunId) {
      params.push(experimentRunId);
      query += ` AND ac.experiment_run_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND ac.status = $${params.length}`;
    }

    if (controllerId) {
      params.push(controllerId);
      query += ` AND ac.controller_id = $${params.length}`;
    }

    params.push(limit, offset);
    query += ` ORDER BY ac.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await db.query(query, params);

    res.json({
      activities: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /intersect/activities/:activityId
 * Get activity details
 */
router.get('/activities/:activityId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activityId } = req.params;

    const activityResult = await db.query(
      `SELECT * FROM intersect_activity_correlations WHERE activity_id = $1`,
      [activityId]
    );

    if (activityResult.rowCount === 0) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    const activity = activityResult.rows[0];

    // Get data products
    const productsResult = await db.query(
      `SELECT * FROM intersect_data_products WHERE activity_id = $1`,
      [activityId]
    );

    // Get recent events
    const eventsResult = await db.query(
      `SELECT * FROM intersect_event_log
       WHERE activity_id = $1
       ORDER BY received_at DESC
       LIMIT 20`,
      [activityId]
    );

    res.json({
      activity,
      dataProducts: productsResult.rows,
      events: eventsResult.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /intersect/activities/:activityId/cancel
 * Request activity cancellation
 */
router.post('/activities/:activityId/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activityId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({ error: 'Cancellation reason is required' });
      return;
    }

    // Get activity and controller info
    const activityResult = await db.query(
      `SELECT ac.*, cr.endpoint
       FROM intersect_activity_correlations ac
       JOIN intersect_controller_registry cr ON ac.controller_id = cr.controller_id
       WHERE ac.activity_id = $1`,
      [activityId]
    );

    if (activityResult.rowCount === 0) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    const activity = activityResult.rows[0];

    if (activity.status === 'completed' || activity.status === 'failed' || activity.status === 'cancelled') {
      res.status(409).json({
        error: `Activity already ${activity.status}`,
      });
      return;
    }

    // Send cancellation request to controller
    try {
      const response = await fetch(
        `${activity.endpoint}/activities/instance/${activityId}/cancel`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
          signal: AbortSignal.timeout(10000),
        }
      );

      const result = await response.json() as { cancelled?: boolean; message?: string };

      // Update local status
      await db.query(
        `UPDATE intersect_activity_correlations
         SET status = 'cancelled', updated_at = NOW()
         WHERE activity_id = $1`,
        [activityId]
      );

      res.json({
        cancelled: result.cancelled,
        message: result.message,
      });
    } catch (fetchError) {
      // Update status anyway (controller might be unreachable)
      await db.query(
        `UPDATE intersect_activity_correlations
         SET status = 'cancelled', updated_at = NOW()
         WHERE activity_id = $1`,
        [activityId]
      );

      res.json({
        cancelled: true,
        message: 'Marked as cancelled (controller unreachable)',
        warning: (fetchError as Error).message,
      });
    }
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Data Products
// ============================================================================

/**
 * GET /intersect/data-products
 * List data products with optional filters
 */
router.get('/data-products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activityId, contentType, limit = 50, offset = 0 } = req.query;

    let query = `SELECT * FROM intersect_data_products WHERE 1=1`;
    const params: any[] = [];

    if (activityId) {
      params.push(activityId);
      query += ` AND activity_id = $${params.length}`;
    }

    if (contentType) {
      params.push(contentType);
      query += ` AND content_type = $${params.length}`;
    }

    params.push(limit, offset);
    query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await db.query(query, params);

    res.json({
      products: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /intersect/data-products/:productUuid/link
 * Link a data product to an ADAM artifact
 */
router.post('/data-products/:productUuid/link', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productUuid } = req.params;
    const { artifactId, storageUri } = req.body;

    if (!artifactId) {
      res.status(400).json({ error: 'artifactId is required' });
      return;
    }

    const result = await db.query(
      `UPDATE intersect_data_products
       SET artifact_id = $1, storage_uri = COALESCE($2, storage_uri)
       WHERE product_uuid = $3
       RETURNING *`,
      [artifactId, storageUri, productUuid]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Data product not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Event Log
// ============================================================================

/**
 * GET /intersect/events
 * Query event log
 */
router.get('/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventType, controllerId, experimentRunId, limit = 100, offset = 0 } = req.query;

    let query = `SELECT * FROM intersect_event_log WHERE 1=1`;
    const params: any[] = [];

    if (eventType) {
      params.push(eventType);
      query += ` AND event_type = $${params.length}`;
    }

    if (controllerId) {
      params.push(controllerId);
      query += ` AND controller_id = $${params.length}`;
    }

    if (experimentRunId) {
      params.push(experimentRunId);
      query += ` AND experiment_run_id = $${params.length}`;
    }

    params.push(limit, offset);
    query += ` ORDER BY received_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await db.query(query, params);

    res.json({
      events: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
