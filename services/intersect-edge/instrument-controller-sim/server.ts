/**
 * HTTP Server for Simulated Instrument Controller
 *
 * Exposes the SimulatedInstrumentController via HTTP endpoints
 * following the INTERSECT Instrument Controller capability contract.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { SimulatedInstrumentController, createSimulatedController } from './SimulatedController';
import {
  IntersectEvent,
  PerformActionRequest,
  StartActivityRequest,
  CancelActivityRequest,
} from '../../../backend/src/integrations/intersect/types';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Create controller instance
const controller = createSimulatedController({
  printJobDurationMs: parseInt(process.env.PRINT_JOB_DURATION_MS || '30000'),
  sinterCycleDurationMs: parseInt(process.env.SINTER_CYCLE_DURATION_MS || '20000'),
  depowderDurationMs: parseInt(process.env.DEPOWDER_DURATION_MS || '10000'),
  inspectionDurationMs: parseInt(process.env.INSPECTION_DURATION_MS || '15000'),
  failureRate: parseFloat(process.env.FAILURE_RATE || '0.05'),
  progressIntervalMs: parseInt(process.env.PROGRESS_INTERVAL_MS || '2000'),
});

// Event callback URL (for pushing events to ADAM)
const eventCallbackUrl = process.env.EVENT_CALLBACK_URL;

// Set up event callback
controller.setEventCallback(async (event: IntersectEvent) => {
  console.log(`[Event] ${event.eventType}:`, JSON.stringify(event.payload, null, 2));

  if (eventCallbackUrl) {
    try {
      await fetch(eventCallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Failed to send event callback:', error);
    }
  }
});

// Error handler wrapper
const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
};

// ============================================================================
// Health Check
// ============================================================================

app.get('/health', asyncHandler(async (req, res) => {
  const health = await controller.healthCheck();
  res.json(health);
}));

// ============================================================================
// Action Endpoints
// ============================================================================

app.get('/actions', asyncHandler(async (req, res) => {
  const result = await controller.listActions();
  res.json(result);
}));

app.get('/actions/:actionName', asyncHandler(async (req, res) => {
  const result = await controller.getActionDescription(req.params.actionName);
  res.json(result);
}));

app.post('/actions/:actionName/perform', asyncHandler(async (req, res) => {
  const request: PerformActionRequest = req.body;

  if (!request.idempotencyKey) {
    res.status(400).json({
      error: 'invalid_options',
      message: 'idempotencyKey is required',
    });
    return;
  }

  const result = await controller.performAction(req.params.actionName, request);
  res.status(202).json(result);
}));

// ============================================================================
// Activity Endpoints
// ============================================================================

app.get('/activities', asyncHandler(async (req, res) => {
  const result = await controller.listActivities();
  res.json(result);
}));

app.get('/activities/:activityName', asyncHandler(async (req, res) => {
  const result = await controller.getActivityDescription(req.params.activityName);
  res.json(result);
}));

app.post('/activities/:activityName/start', asyncHandler(async (req, res) => {
  const request: StartActivityRequest = {
    ...req.body,
    activityDeadline: req.body.activityDeadline
      ? new Date(req.body.activityDeadline)
      : undefined,
  };

  if (!request.correlation?.experimentRunId) {
    res.status(400).json({
      error: 'invalid_options',
      message: 'correlation.experimentRunId is required',
    });
    return;
  }

  const result = await controller.startActivity(req.params.activityName, request);
  res.status(202).json(result);
}));

app.get('/activities/instance/:activityId/status', asyncHandler(async (req, res) => {
  const result = await controller.getActivityStatus(req.params.activityId);
  res.json(result);
}));

app.get('/activities/instance/:activityId/data', asyncHandler(async (req, res) => {
  try {
    const result = await controller.getActivityData(req.params.activityId);
    res.json(result);
  } catch (error) {
    if ((error as Error).message.includes('not completed')) {
      res.status(425).json({
        error: 'data_not_ready',
        message: (error as Error).message,
      });
      return;
    }
    throw error;
  }
}));

app.post('/activities/instance/:activityId/cancel', asyncHandler(async (req, res) => {
  const request: CancelActivityRequest = req.body;

  if (!request.reason) {
    res.status(400).json({
      error: 'invalid_options',
      message: 'reason is required',
    });
    return;
  }

  const result = await controller.cancelActivity(req.params.activityId, request);
  res.json(result);
}));

// ============================================================================
// Admin/Debug Endpoints
// ============================================================================

app.get('/admin/activities', (req, res) => {
  const activities = controller.getAllActivities();
  res.json({
    count: activities.length,
    activities: activities.map((a) => ({
      activityId: a.activityId,
      activityName: a.activityName,
      status: a.status,
      progress: a.progress,
      startTime: a.startTime,
      endTime: a.endTime,
    })),
  });
});

app.post('/admin/reset', (req, res) => {
  controller.reset();
  res.json({ message: 'Controller state reset' });
});

// ============================================================================
// Error Handler
// ============================================================================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  if (err.message.includes('Unknown')) {
    res.status(404).json({
      error: err.message.includes('activity') ? 'unknown_activity_id' : 'unknown_action',
      message: err.message,
    });
    return;
  }

  res.status(500).json({
    error: 'internal_error',
    message: err.message,
  });
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`Simulated Instrument Controller running on port ${PORT}`);
  console.log(`Controller ID: ${controller.controllerId}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('Available actions:', (controller.listActions() as any).actionNames);
  console.log('Available activities:', (controller.listActivities() as any).activityNames);
});

export { app, controller };
