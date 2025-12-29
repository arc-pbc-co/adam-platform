/**
 * HTTP Server for Desktop Metal Instrument Controller
 *
 * Exposes the DesktopMetalController via HTTP endpoints
 * following the INTERSECT Instrument Controller capability contract.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import {
  DesktopMetalController,
  createDesktopMetalController,
} from './DesktopMetalController';
import {
  IntersectEvent,
  PerformActionRequest,
  StartActivityRequest,
  CancelActivityRequest,
} from '../../../backend/src/integrations/intersect/types';

// Mock Desktop Metal client for development
// In production, this would be the actual DesktopMetalClient
const mockDMClient = {
  async getPrinters() {
    return [
      { id: 'X25-001', name: 'X25 Pro #1', status: 'idle' },
      { id: 'P50-001', name: 'P50 Shop System #1', status: 'idle' },
    ];
  },
  async getPrinter(printerId: string) {
    return { id: printerId, name: `Printer ${printerId}`, status: 'idle' };
  },
  async submitPrintJob(printerId: string, experimentId: string, parameters: any, files: any) {
    return {
      id: `job_${Date.now()}`,
      experimentId,
      printerId,
      status: 'queued',
      parameters,
      files,
      createdAt: new Date(),
      progress: 0,
    };
  },
  async getJobStatus(jobId: string) {
    // Simulate job progress
    const progress = Math.min(100, Math.floor(Math.random() * 30) + 70);
    return {
      id: jobId,
      status: progress >= 100 ? 'completed' : 'printing',
      progress,
      createdAt: new Date(),
    };
  },
  async cancelJob(jobId: string) {
    console.log(`[Mock] Job ${jobId} cancelled`);
  },
  async getTelemetry(printerId: string) {
    return {
      printerId,
      timestamp: new Date(),
      metrics: {
        temperature: 22 + Math.random() * 5,
        humidity: 40 + Math.random() * 10,
        binderLevel: 80 + Math.random() * 20,
        powderLevel: 70 + Math.random() * 30,
      },
    };
  },
  async uploadFile(file: Buffer, filename: string) {
    return `file_${Date.now()}_${filename}`;
  },
};

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Large limit for file uploads

// Create controller instance
const controller = createDesktopMetalController(
  mockDMClient as any,
  process.env.CONTROLLER_ID || 'desktop-metal-controller'
);

// Event callback URL
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
// Cleanup on shutdown
// ============================================================================

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  controller.shutdown();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  controller.shutdown();
  process.exit(0);
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`Desktop Metal Instrument Controller running on port ${PORT}`);
  console.log(`Controller ID: ${controller.controllerId}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export { app, controller };
