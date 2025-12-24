/**
 * Simulated Instrument Controller
 *
 * A mock implementation of the INTERSECT Instrument Controller capability
 * for development and testing purposes. Simulates:
 * - Print jobs
 * - Sinter cycles
 * - Depowder cycles
 * - Quality inspections
 *
 * Emits realistic status events during activity execution.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  InstrumentController,
  ActionListResponse,
  ActionDescriptionResponse,
  PerformActionRequest,
  PerformActionResponse,
  ActivityListResponse,
  ActivityDescriptionResponse,
  StartActivityRequest,
  StartActivityResponse,
  ActivityStatusResponse,
  ActivityDataResponse,
  CancelActivityRequest,
  CancelActivityResponse,
  InstrumentActivityStatusChange,
  InstrumentActionCompletion,
  ActivityStatus,
  Correlation,
  IntersectEvent,
} from '../../../backend/src/integrations/intersect/types';

/**
 * Configuration for simulated activities
 */
interface SimulationConfig {
  printJobDurationMs: number;
  sinterCycleDurationMs: number;
  depowderDurationMs: number;
  inspectionDurationMs: number;
  failureRate: number; // 0-1
  progressIntervalMs: number;
}

const DEFAULT_CONFIG: SimulationConfig = {
  printJobDurationMs: 30000, // 30 seconds for testing
  sinterCycleDurationMs: 20000,
  depowderDurationMs: 10000,
  inspectionDurationMs: 15000,
  failureRate: 0.05, // 5% failure rate
  progressIntervalMs: 2000, // Progress update every 2 seconds
};

/**
 * Tracked activity state
 */
interface SimulatedActivity {
  activityId: string;
  activityName: string;
  status: ActivityStatus;
  progress: number;
  startTime: Date;
  endTime?: Date;
  correlation?: Correlation;
  deadline?: Date;
  dataProducts: string[];
  timerId?: NodeJS.Timeout;
  cancelled: boolean;
  errorMsg?: string;
}

/**
 * Event emitter callback type
 */
type EventCallback = (event: IntersectEvent) => Promise<void>;

/**
 * Simulated Instrument Controller
 */
export class SimulatedInstrumentController implements InstrumentController {
  readonly controllerId: string;
  readonly controllerName: string;
  readonly controllerType: string = 'simulated';

  private config: SimulationConfig;
  private activities: Map<string, SimulatedActivity> = new Map();
  private performedActions: Set<string> = new Set();
  private eventCallback?: EventCallback;

  constructor(
    controllerId: string = 'simulated-controller',
    controllerName: string = 'Simulated Instrument Controller',
    config: Partial<SimulationConfig> = {}
  ) {
    this.controllerId = controllerId;
    this.controllerName = controllerName;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set event callback for emitting events
   */
  setEventCallback(callback: EventCallback): void {
    this.eventCallback = callback;
  }

  // ============================================================================
  // Action Methods
  // ============================================================================

  async listActions(): Promise<ActionListResponse> {
    return {
      actionNames: [
        'calibrate_printhead',
        'home_axes',
        'preheat_buildplate',
        'clean_printhead',
        'check_binder_level',
        'check_powder_level',
      ],
    };
  }

  async getActionDescription(actionName: string): Promise<ActionDescriptionResponse> {
    const descriptions: Record<string, ActionDescriptionResponse> = {
      calibrate_printhead: {
        actionName: 'calibrate_printhead',
        description: 'Calibrate the printhead for optimal binder jetting',
        options: [],
        idempotent: true,
      },
      home_axes: {
        actionName: 'home_axes',
        description: 'Move all axes to home position',
        options: [],
        idempotent: true,
      },
      preheat_buildplate: {
        actionName: 'preheat_buildplate',
        description: 'Preheat the build plate to specified temperature',
        options: [
          { name: 'temperature', type: 'number', required: true, description: 'Target temperature in Celsius' },
        ],
        idempotent: false,
      },
      clean_printhead: {
        actionName: 'clean_printhead',
        description: 'Clean the printhead nozzles',
        options: [],
        idempotent: true,
      },
      check_binder_level: {
        actionName: 'check_binder_level',
        description: 'Check current binder level',
        options: [],
        idempotent: true,
      },
      check_powder_level: {
        actionName: 'check_powder_level',
        description: 'Check current powder level',
        options: [],
        idempotent: true,
      },
    };

    const desc = descriptions[actionName];
    if (!desc) {
      throw new Error(`Unknown action: ${actionName}`);
    }
    return desc;
  }

  async performAction(
    actionName: string,
    request: PerformActionRequest
  ): Promise<PerformActionResponse> {
    // Check idempotency
    if (this.performedActions.has(request.idempotencyKey)) {
      return { accepted: true, message: 'Action already performed (idempotent)' };
    }

    console.log(`[SimController] Performing action: ${actionName}`);

    // Simulate action execution (quick)
    await this.sleep(500 + Math.random() * 1000);

    // Mark as performed
    this.performedActions.add(request.idempotencyKey);

    // Emit completion event
    await this.emitActionCompletion({
      actionName,
      actionStatus: 'success',
      timeBegin: new Date(Date.now() - 1000),
      timeEnd: new Date(),
      statusMsg: `Action ${actionName} completed successfully`,
      correlation: request.correlation,
    });

    return { accepted: true, message: `Action ${actionName} completed` };
  }

  // ============================================================================
  // Activity Methods
  // ============================================================================

  async listActivities(): Promise<ActivityListResponse> {
    return {
      activityNames: [
        'print_job',
        'sinter_cycle',
        'depowder_cycle',
        'quality_inspection',
      ],
    };
  }

  async getActivityDescription(activityName: string): Promise<ActivityDescriptionResponse> {
    const descriptions: Record<string, ActivityDescriptionResponse> = {
      print_job: {
        activityName: 'print_job',
        description: 'Execute a binder jetting print job',
        options: [
          { name: 'printerId', type: 'string', required: true },
          { name: 'stlFileId', type: 'string', required: true },
          { name: 'material', type: 'string', required: true },
          { name: 'layerThickness', type: 'number', required: false, default: '50' },
        ],
        estimatedDuration: Math.round(this.config.printJobDurationMs / 1000),
        dataProducts: ['print_log', 'build_statistics', 'layer_images'],
      },
      sinter_cycle: {
        activityName: 'sinter_cycle',
        description: 'Execute a sintering cycle in the furnace',
        options: [
          { name: 'furnaceId', type: 'string', required: true },
          { name: 'material', type: 'string', required: true },
          { name: 'peakTemperature', type: 'number', required: true },
          { name: 'holdTime', type: 'number', required: true },
        ],
        estimatedDuration: Math.round(this.config.sinterCycleDurationMs / 1000),
        dataProducts: ['temperature_profile', 'sinter_log'],
      },
      depowder_cycle: {
        activityName: 'depowder_cycle',
        description: 'Remove excess powder from printed parts',
        options: [
          { name: 'stationId', type: 'string', required: true },
          { name: 'method', type: 'string', required: false, default: 'automated' },
        ],
        estimatedDuration: Math.round(this.config.depowderDurationMs / 1000),
        dataProducts: ['depowder_log'],
      },
      quality_inspection: {
        activityName: 'quality_inspection',
        description: 'Perform quality inspection on parts',
        options: [
          { name: 'inspectionType', type: 'string', required: true },
          { name: 'sampleIds', type: 'string', required: true },
        ],
        estimatedDuration: Math.round(this.config.inspectionDurationMs / 1000),
        dataProducts: ['inspection_report', 'measurements', 'images'],
      },
    };

    const desc = descriptions[activityName];
    if (!desc) {
      throw new Error(`Unknown activity: ${activityName}`);
    }
    return desc;
  }

  async startActivity(
    activityName: string,
    request: StartActivityRequest
  ): Promise<StartActivityResponse> {
    const activityId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const activity: SimulatedActivity = {
      activityId,
      activityName,
      status: 'pending',
      progress: 0,
      startTime: new Date(),
      correlation: request.correlation,
      deadline: request.activityDeadline,
      dataProducts: [],
      cancelled: false,
    };

    this.activities.set(activityId, activity);

    console.log(`[SimController] Starting activity: ${activityName} (${activityId})`);

    // Start simulation asynchronously
    this.runActivitySimulation(activity);

    return {
      activityId,
      message: `Activity ${activityName} started`,
    };
  }

  async getActivityStatus(activityId: string): Promise<ActivityStatusResponse> {
    const activity = this.activities.get(activityId);
    if (!activity) {
      throw new Error(`Unknown activity ID: ${activityId}`);
    }

    return {
      activityId: activity.activityId,
      activityName: activity.activityName,
      activityStatus: activity.status,
      statusMsg: this.getStatusMessage(activity),
      progress: activity.progress,
      timeBegin: activity.startTime,
      timeEnd: activity.endTime,
      errorMsg: activity.errorMsg,
    };
  }

  async getActivityData(activityId: string): Promise<ActivityDataResponse> {
    const activity = this.activities.get(activityId);
    if (!activity) {
      throw new Error(`Unknown activity ID: ${activityId}`);
    }

    if (activity.status !== 'completed') {
      throw new Error('Data not ready - activity not completed');
    }

    return {
      activityId: activity.activityId,
      products: activity.dataProducts,
      message: `${activity.dataProducts.length} data products available`,
    };
  }

  async cancelActivity(
    activityId: string,
    request: CancelActivityRequest
  ): Promise<CancelActivityResponse> {
    const activity = this.activities.get(activityId);
    if (!activity) {
      throw new Error(`Unknown activity ID: ${activityId}`);
    }

    if (activity.status === 'completed' || activity.status === 'failed') {
      return {
        cancelled: false,
        message: `Activity already ${activity.status}`,
      };
    }

    activity.cancelled = true;
    activity.status = 'cancelled';
    activity.endTime = new Date();

    if (activity.timerId) {
      clearTimeout(activity.timerId);
    }

    // Emit cancellation event
    await this.emitStatusChange(activity, request.reason);

    return {
      cancelled: true,
      message: `Activity cancelled: ${request.reason}`,
    };
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    return {
      healthy: true,
      message: 'Simulated controller is healthy',
    };
  }

  // ============================================================================
  // Simulation Logic
  // ============================================================================

  private async runActivitySimulation(activity: SimulatedActivity): Promise<void> {
    const duration = this.getActivityDuration(activity.activityName);
    const steps = 10;
    const stepDuration = duration / steps;

    // Update to running
    activity.status = 'running';
    await this.emitStatusChange(activity);

    for (let i = 1; i <= steps; i++) {
      // Check for cancellation or deadline
      if (activity.cancelled) {
        return;
      }

      if (activity.deadline && new Date() > activity.deadline) {
        activity.status = 'cancelled';
        activity.endTime = new Date();
        activity.errorMsg = 'Deadline exceeded';
        await this.emitStatusChange(activity, 'Deadline exceeded');
        return;
      }

      await this.sleep(stepDuration);

      // Update progress
      activity.progress = i * 10;
      await this.emitStatusChange(activity);

      // Simulate random failure
      if (Math.random() < this.config.failureRate / steps) {
        activity.status = 'failed';
        activity.endTime = new Date();
        activity.errorMsg = 'Simulated random failure';
        await this.emitStatusChange(activity, 'Simulated failure occurred');
        return;
      }
    }

    // Complete successfully
    activity.status = 'completed';
    activity.progress = 100;
    activity.endTime = new Date();
    activity.dataProducts = this.generateDataProducts(activity.activityName);

    await this.emitStatusChange(activity);
    console.log(`[SimController] Activity completed: ${activity.activityId}`);
  }

  private getActivityDuration(activityName: string): number {
    const durations: Record<string, number> = {
      print_job: this.config.printJobDurationMs,
      sinter_cycle: this.config.sinterCycleDurationMs,
      depowder_cycle: this.config.depowderDurationMs,
      quality_inspection: this.config.inspectionDurationMs,
    };
    return durations[activityName] || 10000;
  }

  private generateDataProducts(activityName: string): string[] {
    const productCounts: Record<string, number> = {
      print_job: 3,
      sinter_cycle: 2,
      depowder_cycle: 1,
      quality_inspection: 3,
    };

    const count = productCounts[activityName] || 1;
    return Array.from({ length: count }, () => uuidv4());
  }

  private getStatusMessage(activity: SimulatedActivity): string {
    switch (activity.status) {
      case 'pending':
        return 'Activity queued, waiting to start';
      case 'running':
        return `Processing... ${activity.progress}% complete`;
      case 'completed':
        return 'Activity completed successfully';
      case 'failed':
        return activity.errorMsg || 'Activity failed';
      case 'cancelled':
        return activity.errorMsg || 'Activity was cancelled';
      default:
        return 'Unknown status';
    }
  }

  // ============================================================================
  // Event Emission
  // ============================================================================

  private async emitStatusChange(
    activity: SimulatedActivity,
    additionalMsg?: string
  ): Promise<void> {
    const event: InstrumentActivityStatusChange = {
      activityId: activity.activityId,
      activityName: activity.activityName,
      activityStatus: activity.status,
      progress: activity.progress,
      statusMsg: additionalMsg || this.getStatusMessage(activity),
      errorMsg: activity.errorMsg,
      correlation: activity.correlation,
    };

    if (this.eventCallback) {
      await this.eventCallback({
        eventType: 'activity.status_change',
        timestamp: new Date(),
        controllerId: this.controllerId,
        payload: event,
      });
    }
  }

  private async emitActionCompletion(event: InstrumentActionCompletion): Promise<void> {
    if (this.eventCallback) {
      await this.eventCallback({
        eventType: 'action.completion',
        timestamp: new Date(),
        controllerId: this.controllerId,
        payload: event,
      });
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get all activities (for testing)
   */
  getAllActivities(): SimulatedActivity[] {
    return Array.from(this.activities.values());
  }

  /**
   * Clear all state (for testing)
   */
  reset(): void {
    for (const activity of this.activities.values()) {
      if (activity.timerId) {
        clearTimeout(activity.timerId);
      }
    }
    this.activities.clear();
    this.performedActions.clear();
  }
}

/**
 * Factory function
 */
export function createSimulatedController(
  config?: Partial<SimulationConfig>
): SimulatedInstrumentController {
  return new SimulatedInstrumentController(
    'simulated-controller',
    'Simulated Instrument Controller',
    config
  );
}
