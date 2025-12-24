/**
 * Characterization Instrument Controller
 *
 * INTERSECT-compliant controller for material characterization instruments:
 * - X-Ray Diffraction (XRD)
 * - Scanning Electron Microscopy (SEM)
 * - Optical Microscopy
 * - Density Measurement
 * - Hardness Testing
 *
 * Implements the INTERSECT Instrument Controller capability contract.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  InstrumentController,
  IntersectEvent,
  ActionDescription,
  ActivityDescription,
  HealthStatus,
  PerformActionRequest,
  PerformActionResult,
  StartActivityRequest,
  StartActivityResult,
  ActivityStatusResult,
  ActivityDataResult,
  CancelActivityRequest,
  CancelActivityResult,
  ActivityStatus,
} from '../../../backend/src/integrations/intersect/types';

// ============================================================================
// Types
// ============================================================================

type InstrumentType = 'xrd' | 'sem' | 'optical' | 'density' | 'hardness';

interface InstrumentState {
  type: InstrumentType;
  status: 'idle' | 'busy' | 'error' | 'maintenance';
  currentSample?: string;
  lastCalibration?: Date;
  errorMessage?: string;
}

interface MeasurementTask {
  activityId: string;
  activityName: string;
  status: ActivityStatus;
  progress: number;
  instrumentType: InstrumentType;
  sampleId: string;
  parameters: Record<string, any>;
  startTime: Date;
  endTime?: Date;
  correlation: any;
  cancelled: boolean;
  results?: MeasurementResult;
}

interface MeasurementResult {
  sampleId: string;
  instrumentType: InstrumentType;
  measurementTime: Date;
  data: any;
  metadata: Record<string, any>;
}

// Mock characterization client interface
interface CharacterizationClient {
  getInstrumentState(type: InstrumentType): Promise<InstrumentState>;
  calibrate(type: InstrumentType): Promise<void>;
  loadSample(type: InstrumentType, sampleId: string): Promise<void>;
  unloadSample(type: InstrumentType): Promise<void>;
  startMeasurement(type: InstrumentType, parameters: Record<string, any>): Promise<void>;
  getMeasurementProgress(type: InstrumentType): Promise<number>;
  getMeasurementResults(type: InstrumentType): Promise<any>;
  abortMeasurement(type: InstrumentType): Promise<void>;
}

// ============================================================================
// Characterization Controller Implementation
// ============================================================================

export class CharacterizationController implements InstrumentController {
  readonly controllerId: string;
  readonly controllerName: string = 'Characterization Instruments Controller';
  readonly controllerType: string = 'characterization';

  private client: CharacterizationClient;
  private activeMeasurements: Map<string, MeasurementTask> = new Map();
  private eventCallback?: (event: IntersectEvent) => Promise<void>;
  private performedActions: Set<string> = new Set();

  constructor(client: CharacterizationClient, controllerId?: string) {
    this.client = client;
    this.controllerId = controllerId || `characterization-${uuidv4().slice(0, 8)}`;
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<HealthStatus> {
    try {
      const instruments: InstrumentType[] = ['xrd', 'sem', 'optical', 'density', 'hardness'];
      const states = await Promise.all(
        instruments.map(async (type) => {
          try {
            const state = await this.client.getInstrumentState(type);
            return { type, state };
          } catch {
            return { type, state: { type, status: 'error' as const, errorMessage: 'Unreachable' } };
          }
        })
      );

      const components: Record<string, any> = {};
      let allHealthy = true;

      for (const { type, state } of states) {
        const healthy = state.status === 'idle' || state.status === 'busy';
        components[type] = {
          healthy,
          status: state.status,
          currentSample: state.currentSample,
          lastCalibration: state.lastCalibration,
          error: state.errorMessage,
        };
        if (!healthy) allHealthy = false;
      }

      return {
        healthy: allHealthy,
        status: allHealthy ? 'operational' : 'degraded',
        components,
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'error',
        error: (error as Error).message,
      };
    }
  }

  // ============================================================================
  // Actions
  // ============================================================================

  async listActions() {
    return {
      actionNames: [
        'calibrate_xrd',
        'calibrate_sem',
        'calibrate_optical',
        'load_sample',
        'unload_sample',
        'abort_measurement',
      ],
    };
  }

  async getActionDescription(actionName: string): Promise<ActionDescription> {
    const descriptions: Record<string, ActionDescription> = {
      calibrate_xrd: {
        actionName: 'calibrate_xrd',
        description: 'Calibrate XRD instrument with reference standard',
        version: '1.0.0',
        optionsSchema: { type: 'object' },
        resultSchema: { type: 'object', properties: { calibrated: { type: 'boolean' } } },
      },
      calibrate_sem: {
        actionName: 'calibrate_sem',
        description: 'Calibrate SEM instrument and adjust beam',
        version: '1.0.0',
        optionsSchema: { type: 'object' },
        resultSchema: { type: 'object', properties: { calibrated: { type: 'boolean' } } },
      },
      calibrate_optical: {
        actionName: 'calibrate_optical',
        description: 'Calibrate optical microscope focus and lighting',
        version: '1.0.0',
        optionsSchema: { type: 'object' },
        resultSchema: { type: 'object', properties: { calibrated: { type: 'boolean' } } },
      },
      load_sample: {
        actionName: 'load_sample',
        description: 'Load a sample into the specified instrument',
        version: '1.0.0',
        optionsSchema: {
          type: 'object',
          properties: {
            instrumentType: { type: 'string', enum: ['xrd', 'sem', 'optical', 'density', 'hardness'] },
            sampleId: { type: 'string' },
          },
          required: ['instrumentType', 'sampleId'],
        },
        resultSchema: { type: 'object', properties: { loaded: { type: 'boolean' } } },
      },
      unload_sample: {
        actionName: 'unload_sample',
        description: 'Unload sample from the specified instrument',
        version: '1.0.0',
        optionsSchema: {
          type: 'object',
          properties: {
            instrumentType: { type: 'string', enum: ['xrd', 'sem', 'optical', 'density', 'hardness'] },
          },
          required: ['instrumentType'],
        },
        resultSchema: { type: 'object', properties: { unloaded: { type: 'boolean' } } },
      },
      abort_measurement: {
        actionName: 'abort_measurement',
        description: 'Abort current measurement on specified instrument',
        version: '1.0.0',
        optionsSchema: {
          type: 'object',
          properties: {
            instrumentType: { type: 'string', enum: ['xrd', 'sem', 'optical', 'density', 'hardness'] },
          },
          required: ['instrumentType'],
        },
        resultSchema: { type: 'object', properties: { aborted: { type: 'boolean' } } },
      },
    };

    if (!descriptions[actionName]) {
      throw new Error(`Unknown action: ${actionName}`);
    }

    return descriptions[actionName];
  }

  async performAction(
    actionName: string,
    request: PerformActionRequest
  ): Promise<PerformActionResult> {
    if (this.performedActions.has(request.idempotencyKey)) {
      return {
        actionName,
        status: 'completed',
        result: { cached: true },
        idempotencyKey: request.idempotencyKey,
      };
    }

    try {
      const options = request.options || {};

      switch (actionName) {
        case 'calibrate_xrd':
          await this.client.calibrate('xrd');
          break;
        case 'calibrate_sem':
          await this.client.calibrate('sem');
          break;
        case 'calibrate_optical':
          await this.client.calibrate('optical');
          break;
        case 'load_sample':
          await this.client.loadSample(options.instrumentType, options.sampleId);
          break;
        case 'unload_sample':
          await this.client.unloadSample(options.instrumentType);
          break;
        case 'abort_measurement':
          await this.client.abortMeasurement(options.instrumentType);
          break;
        default:
          throw new Error(`Unknown action: ${actionName}`);
      }

      this.performedActions.add(request.idempotencyKey);

      return {
        actionName,
        status: 'completed',
        result: { success: true },
        idempotencyKey: request.idempotencyKey,
      };
    } catch (error) {
      return {
        actionName,
        status: 'failed',
        error: (error as Error).message,
        idempotencyKey: request.idempotencyKey,
      };
    }
  }

  // ============================================================================
  // Activities
  // ============================================================================

  async listActivities() {
    return {
      activityNames: [
        'xrd_scan',
        'sem_imaging',
        'optical_imaging',
        'density_measurement',
        'hardness_test',
        'full_characterization',
      ],
    };
  }

  async getActivityDescription(activityName: string): Promise<ActivityDescription> {
    const descriptions: Record<string, ActivityDescription> = {
      xrd_scan: {
        activityName: 'xrd_scan',
        description: 'Perform X-Ray Diffraction scan for phase analysis',
        version: '1.0.0',
        optionsSchema: {
          type: 'object',
          properties: {
            sampleId: { type: 'string' },
            startAngle: { type: 'number', default: 20 },
            endAngle: { type: 'number', default: 80 },
            stepSize: { type: 'number', default: 0.02 },
            dwellTime: { type: 'number', default: 1 },
          },
          required: ['sampleId'],
        },
        dataProductSchemas: [
          {
            name: 'xrd_pattern',
            description: 'XRD diffraction pattern data',
            contentType: 'application/json',
            schema: { type: 'object' },
          },
          {
            name: 'phase_analysis',
            description: 'Identified phases and compositions',
            contentType: 'application/json',
            schema: { type: 'object' },
          },
        ],
      },
      sem_imaging: {
        activityName: 'sem_imaging',
        description: 'Capture SEM images at multiple magnifications',
        version: '1.0.0',
        optionsSchema: {
          type: 'object',
          properties: {
            sampleId: { type: 'string' },
            magnifications: { type: 'array', items: { type: 'number' }, default: [100, 500, 1000, 5000] },
            voltage: { type: 'number', default: 15 },
            mode: { type: 'string', enum: ['SE', 'BSE'], default: 'SE' },
          },
          required: ['sampleId'],
        },
        dataProductSchemas: [
          {
            name: 'sem_images',
            description: 'SEM image collection',
            contentType: 'image/tiff',
            schema: {},
          },
          {
            name: 'eds_spectrum',
            description: 'EDS elemental analysis if performed',
            contentType: 'application/json',
            schema: { type: 'object' },
          },
        ],
      },
      optical_imaging: {
        activityName: 'optical_imaging',
        description: 'Capture optical microscopy images',
        version: '1.0.0',
        optionsSchema: {
          type: 'object',
          properties: {
            sampleId: { type: 'string' },
            magnifications: { type: 'array', items: { type: 'number' }, default: [5, 10, 20, 50] },
            lighting: { type: 'string', enum: ['brightfield', 'darkfield', 'polarized'], default: 'brightfield' },
          },
          required: ['sampleId'],
        },
        dataProductSchemas: [
          {
            name: 'optical_images',
            description: 'Optical microscopy images',
            contentType: 'image/tiff',
            schema: {},
          },
        ],
      },
      density_measurement: {
        activityName: 'density_measurement',
        description: 'Measure sample density using Archimedes method',
        version: '1.0.0',
        optionsSchema: {
          type: 'object',
          properties: {
            sampleId: { type: 'string' },
            repetitions: { type: 'number', default: 3 },
            fluidType: { type: 'string', default: 'water' },
          },
          required: ['sampleId'],
        },
        dataProductSchemas: [
          {
            name: 'density_report',
            description: 'Density measurement results',
            contentType: 'application/json',
            schema: { type: 'object' },
          },
        ],
      },
      hardness_test: {
        activityName: 'hardness_test',
        description: 'Perform Vickers or Rockwell hardness test',
        version: '1.0.0',
        optionsSchema: {
          type: 'object',
          properties: {
            sampleId: { type: 'string' },
            method: { type: 'string', enum: ['vickers', 'rockwell'], default: 'vickers' },
            load: { type: 'number', default: 1 },
            indentations: { type: 'number', default: 5 },
          },
          required: ['sampleId'],
        },
        dataProductSchemas: [
          {
            name: 'hardness_report',
            description: 'Hardness test results with statistics',
            contentType: 'application/json',
            schema: { type: 'object' },
          },
        ],
      },
      full_characterization: {
        activityName: 'full_characterization',
        description: 'Complete characterization suite: XRD, SEM, density, hardness',
        version: '1.0.0',
        optionsSchema: {
          type: 'object',
          properties: {
            sampleId: { type: 'string' },
            includeXrd: { type: 'boolean', default: true },
            includeSem: { type: 'boolean', default: true },
            includeDensity: { type: 'boolean', default: true },
            includeHardness: { type: 'boolean', default: true },
          },
          required: ['sampleId'],
        },
        dataProductSchemas: [
          {
            name: 'characterization_report',
            description: 'Complete characterization report',
            contentType: 'application/json',
            schema: { type: 'object' },
          },
        ],
      },
    };

    if (!descriptions[activityName]) {
      throw new Error(`Unknown activity: ${activityName}`);
    }

    return descriptions[activityName];
  }

  async startActivity(
    activityName: string,
    request: StartActivityRequest
  ): Promise<StartActivityResult> {
    const activityId = `char_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const options = request.options || {};

    const instrumentTypeMap: Record<string, InstrumentType> = {
      xrd_scan: 'xrd',
      sem_imaging: 'sem',
      optical_imaging: 'optical',
      density_measurement: 'density',
      hardness_test: 'hardness',
      full_characterization: 'xrd', // Starts with XRD
    };

    const task: MeasurementTask = {
      activityId,
      activityName,
      status: 'started',
      progress: 0,
      instrumentType: instrumentTypeMap[activityName] || 'xrd',
      sampleId: options.sampleId || '',
      parameters: options,
      startTime: new Date(),
      correlation: request.correlation,
      cancelled: false,
    };

    this.activeMeasurements.set(activityId, task);

    await this.emitEvent('activity.status_change', {
      activityId,
      activityName,
      activityStatus: 'started',
      correlation: request.correlation,
    });

    this.executeMeasurement(task);

    return {
      activityId,
      activityName,
      status: 'started',
      correlation: request.correlation,
    };
  }

  private async executeMeasurement(task: MeasurementTask): Promise<void> {
    try {
      // Load sample
      await this.client.loadSample(task.instrumentType, task.sampleId);
      task.progress = 10;
      await this.emitProgress(task, 'Sample loaded');

      if (task.cancelled) {
        await this.handleCancellation(task);
        return;
      }

      // Start measurement
      await this.client.startMeasurement(task.instrumentType, task.parameters);
      task.progress = 20;
      await this.emitProgress(task, 'Measurement started');

      // Monitor progress
      while (!task.cancelled) {
        await this.simulateStep(500);

        const progress = await this.client.getMeasurementProgress(task.instrumentType);
        task.progress = 20 + (progress * 0.7); // 20-90%

        await this.emitProgress(task, `Measuring: ${progress}%`);

        if (progress >= 100) break;
      }

      if (task.cancelled) {
        await this.handleCancellation(task);
        return;
      }

      // Get results
      const results = await this.client.getMeasurementResults(task.instrumentType);
      task.results = {
        sampleId: task.sampleId,
        instrumentType: task.instrumentType,
        measurementTime: new Date(),
        data: results,
        metadata: task.parameters,
      };
      task.progress = 95;
      await this.emitProgress(task, 'Processing results');

      // Unload sample
      await this.client.unloadSample(task.instrumentType);
      task.progress = 100;

      // Complete
      task.status = 'completed';
      task.endTime = new Date();

      await this.emitEvent('activity.status_change', {
        activityId: task.activityId,
        activityName: task.activityName,
        activityStatus: 'completed',
        correlation: task.correlation,
        dataProducts: this.getDataProducts(task),
      });
    } catch (error) {
      task.status = 'failed';
      task.endTime = new Date();

      try {
        await this.client.unloadSample(task.instrumentType);
      } catch {}

      await this.emitEvent('activity.status_change', {
        activityId: task.activityId,
        activityName: task.activityName,
        activityStatus: 'failed',
        statusMsg: (error as Error).message,
        correlation: task.correlation,
      });
    }
  }

  private async handleCancellation(task: MeasurementTask): Promise<void> {
    task.status = 'cancelled';
    task.endTime = new Date();

    try {
      await this.client.abortMeasurement(task.instrumentType);
      await this.client.unloadSample(task.instrumentType);
    } catch {}

    await this.emitEvent('activity.status_change', {
      activityId: task.activityId,
      activityName: task.activityName,
      activityStatus: 'cancelled',
      statusMsg: 'Measurement cancelled by user',
      correlation: task.correlation,
    });
  }

  private getDataProducts(task: MeasurementTask): Array<{ productUuid: string; productName: string; contentType: string }> {
    const products: Array<{ productUuid: string; productName: string; contentType: string }> = [];

    switch (task.activityName) {
      case 'xrd_scan':
        products.push(
          { productUuid: uuidv4(), productName: 'xrd_pattern', contentType: 'application/json' },
          { productUuid: uuidv4(), productName: 'phase_analysis', contentType: 'application/json' }
        );
        break;
      case 'sem_imaging':
        products.push(
          { productUuid: uuidv4(), productName: 'sem_images', contentType: 'image/tiff' },
          { productUuid: uuidv4(), productName: 'eds_spectrum', contentType: 'application/json' }
        );
        break;
      case 'optical_imaging':
        products.push({ productUuid: uuidv4(), productName: 'optical_images', contentType: 'image/tiff' });
        break;
      case 'density_measurement':
        products.push({ productUuid: uuidv4(), productName: 'density_report', contentType: 'application/json' });
        break;
      case 'hardness_test':
        products.push({ productUuid: uuidv4(), productName: 'hardness_report', contentType: 'application/json' });
        break;
      case 'full_characterization':
        products.push({ productUuid: uuidv4(), productName: 'characterization_report', contentType: 'application/json' });
        break;
    }

    return products;
  }

  private async emitProgress(task: MeasurementTask, message: string): Promise<void> {
    await this.emitEvent('activity.progress_update', {
      activityId: task.activityId,
      activityName: task.activityName,
      progress: Math.round(task.progress),
      message,
    });
  }

  private simulateStep(durationMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, durationMs));
  }

  async getActivityStatus(activityId: string): Promise<ActivityStatusResult> {
    const task = this.activeMeasurements.get(activityId);
    if (!task) {
      throw new Error(`Unknown activity: ${activityId}`);
    }

    return {
      activityId,
      status: task.status,
      progress: task.progress,
      startTime: task.startTime,
      endTime: task.endTime,
    };
  }

  async getActivityData(activityId: string): Promise<ActivityDataResult> {
    const task = this.activeMeasurements.get(activityId);
    if (!task) {
      throw new Error(`Unknown activity: ${activityId}`);
    }

    if (task.status !== 'completed') {
      throw new Error(`Activity ${activityId} not completed (status: ${task.status})`);
    }

    return {
      activityId,
      dataProducts: this.getDataProducts(task).map((p) => ({
        ...p,
        data: task.results,
      })),
    };
  }

  async cancelActivity(
    activityId: string,
    request: CancelActivityRequest
  ): Promise<CancelActivityResult> {
    const task = this.activeMeasurements.get(activityId);
    if (!task) {
      throw new Error(`Unknown activity: ${activityId}`);
    }

    if (task.status === 'completed' || task.status === 'failed') {
      return {
        activityId,
        cancelled: false,
        message: `Activity already ${task.status}`,
      };
    }

    task.cancelled = true;

    return {
      activityId,
      cancelled: true,
      message: `Cancellation requested: ${request.reason}`,
    };
  }

  setEventCallback(callback: (event: IntersectEvent) => Promise<void>): void {
    this.eventCallback = callback;
  }

  private async emitEvent(eventType: string, payload: any): Promise<void> {
    if (!this.eventCallback) return;

    const event: IntersectEvent = {
      eventType,
      controllerId: this.controllerId,
      timestamp: new Date(),
      payload,
    };

    try {
      await this.eventCallback(event);
    } catch (error) {
      console.error(`[CharacterizationController] Error emitting event:`, error);
    }
  }

  shutdown(): void {
    for (const task of this.activeMeasurements.values()) {
      task.cancelled = true;
    }
    this.activeMeasurements.clear();
    this.performedActions.clear();
  }
}

// ============================================================================
// Mock Characterization Client
// ============================================================================

export function createMockCharacterizationClient(): CharacterizationClient {
  const instruments: Map<InstrumentType, InstrumentState> = new Map([
    ['xrd', { type: 'xrd', status: 'idle', lastCalibration: new Date() }],
    ['sem', { type: 'sem', status: 'idle', lastCalibration: new Date() }],
    ['optical', { type: 'optical', status: 'idle', lastCalibration: new Date() }],
    ['density', { type: 'density', status: 'idle', lastCalibration: new Date() }],
    ['hardness', { type: 'hardness', status: 'idle', lastCalibration: new Date() }],
  ]);

  const measurementProgress: Map<InstrumentType, number> = new Map();

  return {
    async getInstrumentState(type: InstrumentType) {
      return instruments.get(type) || { type, status: 'error', errorMessage: 'Unknown instrument' };
    },
    async calibrate(type: InstrumentType) {
      const state = instruments.get(type);
      if (state) {
        state.lastCalibration = new Date();
      }
    },
    async loadSample(type: InstrumentType, sampleId: string) {
      const state = instruments.get(type);
      if (state) {
        state.currentSample = sampleId;
        state.status = 'busy';
      }
    },
    async unloadSample(type: InstrumentType) {
      const state = instruments.get(type);
      if (state) {
        state.currentSample = undefined;
        state.status = 'idle';
      }
    },
    async startMeasurement(type: InstrumentType, parameters: Record<string, any>) {
      measurementProgress.set(type, 0);
      // Simulate measurement progress
      const interval = setInterval(() => {
        const current = measurementProgress.get(type) || 0;
        if (current < 100) {
          measurementProgress.set(type, Math.min(100, current + 10));
        } else {
          clearInterval(interval);
        }
      }, 200);
    },
    async getMeasurementProgress(type: InstrumentType) {
      return measurementProgress.get(type) || 0;
    },
    async getMeasurementResults(type: InstrumentType) {
      // Return mock results based on instrument type
      switch (type) {
        case 'xrd':
          return {
            peaks: [
              { angle: 44.5, intensity: 1000, phase: 'Fe' },
              { angle: 64.8, intensity: 450, phase: 'Fe' },
            ],
            phases: [{ name: 'Iron (BCC)', percentage: 98.5 }],
          };
        case 'sem':
          return {
            images: ['img_100x.tiff', 'img_500x.tiff', 'img_1000x.tiff'],
            eds: { Fe: 96.2, C: 2.1, Mn: 1.2, Si: 0.5 },
          };
        case 'density':
          return {
            measurements: [7.82, 7.85, 7.81],
            average: 7.827,
            stdDev: 0.021,
            relDensity: 99.1,
          };
        case 'hardness':
          return {
            method: 'Vickers',
            load: 1,
            measurements: [285, 290, 288, 292, 287],
            average: 288.4,
            stdDev: 2.7,
          };
        default:
          return {};
      }
    },
    async abortMeasurement(type: InstrumentType) {
      measurementProgress.set(type, 100);
    },
  };
}

// ============================================================================
// Factory
// ============================================================================

export function createCharacterizationController(
  client?: CharacterizationClient,
  controllerId?: string
): CharacterizationController {
  return new CharacterizationController(
    client || createMockCharacterizationClient(),
    controllerId
  );
}
