/**
 * Robot Arm Instrument Controller
 *
 * INTERSECT-compliant controller for robotic sample handling:
 * - Build box transfers between stations
 * - Sample picking and placement
 * - Automated tray management
 * - Safety interlocks
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
  KeyValue,
} from '../../../backend/src/integrations/intersect/types';

// ============================================================================
// Types
// ============================================================================

interface RobotPosition {
  x: number;
  y: number;
  z: number;
  rotation: number;
}

interface RobotState {
  position: RobotPosition;
  gripperOpen: boolean;
  holdingItem: string | null;
  estopActive: boolean;
  homingRequired: boolean;
}

interface TransferTask {
  activityId: string;
  activityName: string;
  status: ActivityStatus;
  progress: number;
  source: string;
  destination: string;
  itemId: string;
  startTime: Date;
  endTime?: Date;
  correlation: any;
  cancelled: boolean;
}

// Mock robot client interface
interface RobotClient {
  getState(): Promise<RobotState>;
  home(): Promise<void>;
  moveToPosition(position: RobotPosition): Promise<void>;
  openGripper(): Promise<void>;
  closeGripper(): Promise<void>;
  pickItem(stationId: string, slotIndex: number): Promise<string>;
  placeItem(stationId: string, slotIndex: number): Promise<void>;
  emergencyStop(): Promise<void>;
  resetEstop(): Promise<void>;
}

// ============================================================================
// Robot Arm Controller Implementation
// ============================================================================

export class RobotArmController implements InstrumentController {
  readonly controllerId: string;
  readonly controllerName: string = 'Robot Arm Controller';
  readonly controllerType: string = 'robot_arm';

  private robotClient: RobotClient;
  private activeTransfers: Map<string, TransferTask> = new Map();
  private eventCallback?: (event: IntersectEvent) => Promise<void>;
  private performedActions: Set<string> = new Set();

  constructor(robotClient: RobotClient, controllerId?: string) {
    this.robotClient = robotClient;
    this.controllerId = controllerId || `robot-arm-${uuidv4().slice(0, 8)}`;
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<HealthStatus> {
    try {
      const state = await this.robotClient.getState();

      const healthy = !state.estopActive && !state.homingRequired;

      return {
        healthy,
        status: healthy ? 'operational' : (state.estopActive ? 'emergency_stop' : 'needs_homing'),
        components: {
          connection: { healthy: true },
          motion: { healthy: !state.estopActive },
          gripper: { healthy: true },
          homing: { healthy: !state.homingRequired },
        },
        details: {
          position: state.position,
          gripperOpen: state.gripperOpen,
          holdingItem: state.holdingItem,
        },
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
        'home',
        'open_gripper',
        'close_gripper',
        'emergency_stop',
        'reset_estop',
        'move_to_safe_position',
      ],
    };
  }

  async getActionDescription(actionName: string): Promise<ActionDescription> {
    const descriptions: Record<string, ActionDescription> = {
      home: {
        actionName: 'home',
        description: 'Home all robot axes to known positions',
        version: '1.0.0',
        optionsSchema: { type: 'object', properties: {} },
        resultSchema: { type: 'object', properties: { homed: { type: 'boolean' } } },
      },
      open_gripper: {
        actionName: 'open_gripper',
        description: 'Open the robot gripper to release items',
        version: '1.0.0',
        optionsSchema: { type: 'object', properties: {} },
        resultSchema: { type: 'object', properties: { open: { type: 'boolean' } } },
      },
      close_gripper: {
        actionName: 'close_gripper',
        description: 'Close the robot gripper to grip items',
        version: '1.0.0',
        optionsSchema: { type: 'object', properties: {} },
        resultSchema: { type: 'object', properties: { closed: { type: 'boolean' } } },
      },
      emergency_stop: {
        actionName: 'emergency_stop',
        description: 'Immediately stop all robot motion',
        version: '1.0.0',
        optionsSchema: { type: 'object', properties: {} },
        resultSchema: { type: 'object', properties: { stopped: { type: 'boolean' } } },
      },
      reset_estop: {
        actionName: 'reset_estop',
        description: 'Reset emergency stop state (requires physical verification)',
        version: '1.0.0',
        optionsSchema: { type: 'object', properties: {} },
        resultSchema: { type: 'object', properties: { reset: { type: 'boolean' } } },
      },
      move_to_safe_position: {
        actionName: 'move_to_safe_position',
        description: 'Move robot to a safe position for maintenance',
        version: '1.0.0',
        optionsSchema: { type: 'object', properties: {} },
        resultSchema: { type: 'object', properties: { atSafePosition: { type: 'boolean' } } },
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
    // Check idempotency
    if (this.performedActions.has(request.idempotencyKey)) {
      return {
        actionName,
        status: 'completed',
        result: { cached: true },
        idempotencyKey: request.idempotencyKey,
      };
    }

    try {
      let result: any;

      switch (actionName) {
        case 'home':
          await this.robotClient.home();
          result = { homed: true };
          break;

        case 'open_gripper':
          await this.robotClient.openGripper();
          result = { open: true };
          break;

        case 'close_gripper':
          await this.robotClient.closeGripper();
          result = { closed: true };
          break;

        case 'emergency_stop':
          await this.robotClient.emergencyStop();
          result = { stopped: true };
          break;

        case 'reset_estop':
          await this.robotClient.resetEstop();
          result = { reset: true };
          break;

        case 'move_to_safe_position':
          await this.robotClient.moveToPosition({ x: 0, y: 0, z: 500, rotation: 0 });
          result = { atSafePosition: true };
          break;

        default:
          throw new Error(`Unknown action: ${actionName}`);
      }

      this.performedActions.add(request.idempotencyKey);

      await this.emitEvent('action.completion', {
        actionName,
        status: 'completed',
        idempotencyKey: request.idempotencyKey,
        result,
      });

      return {
        actionName,
        status: 'completed',
        result,
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
        'transfer_build_box',
        'transfer_sample',
        'load_tray',
        'unload_tray',
        'organize_samples',
      ],
    };
  }

  async getActivityDescription(activityName: string): Promise<ActivityDescription> {
    const descriptions: Record<string, ActivityDescription> = {
      transfer_build_box: {
        activityName: 'transfer_build_box',
        description: 'Transfer a build box between stations (printer → depowder → furnace)',
        version: '1.0.0',
        optionsSchema: {
          type: 'object',
          properties: {
            sourceStation: { type: 'string', description: 'Source station ID' },
            sourceSlot: { type: 'number', description: 'Source slot index' },
            destinationStation: { type: 'string', description: 'Destination station ID' },
            destinationSlot: { type: 'number', description: 'Destination slot index' },
            buildBoxId: { type: 'string', description: 'Build box identifier' },
          },
          required: ['sourceStation', 'destinationStation', 'buildBoxId'],
        },
        dataProductSchemas: [
          {
            name: 'transfer_log',
            description: 'Transfer operation log with timestamps',
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                buildBoxId: { type: 'string' },
                source: { type: 'string' },
                destination: { type: 'string' },
                startTime: { type: 'string' },
                endTime: { type: 'string' },
                success: { type: 'boolean' },
              },
            },
          },
        ],
      },
      transfer_sample: {
        activityName: 'transfer_sample',
        description: 'Transfer a single sample between positions',
        version: '1.0.0',
        optionsSchema: {
          type: 'object',
          properties: {
            sampleId: { type: 'string' },
            sourcePosition: { type: 'string' },
            destinationPosition: { type: 'string' },
          },
          required: ['sampleId', 'sourcePosition', 'destinationPosition'],
        },
        dataProductSchemas: [],
      },
      load_tray: {
        activityName: 'load_tray',
        description: 'Load samples onto a tray for batch processing',
        version: '1.0.0',
        optionsSchema: {
          type: 'object',
          properties: {
            trayId: { type: 'string' },
            sampleIds: { type: 'array', items: { type: 'string' } },
          },
          required: ['trayId', 'sampleIds'],
        },
        dataProductSchemas: [],
      },
      unload_tray: {
        activityName: 'unload_tray',
        description: 'Unload samples from a tray after processing',
        version: '1.0.0',
        optionsSchema: {
          type: 'object',
          properties: {
            trayId: { type: 'string' },
            destinationRack: { type: 'string' },
          },
          required: ['trayId', 'destinationRack'],
        },
        dataProductSchemas: [],
      },
      organize_samples: {
        activityName: 'organize_samples',
        description: 'Reorganize samples in storage according to a layout plan',
        version: '1.0.0',
        optionsSchema: {
          type: 'object',
          properties: {
            layoutPlan: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sampleId: { type: 'string' },
                  targetPosition: { type: 'string' },
                },
              },
            },
          },
          required: ['layoutPlan'],
        },
        dataProductSchemas: [],
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
    const activityId = `robot_${Date.now()}_${uuidv4().slice(0, 8)}`;

    const options = request.options || {};
    const task: TransferTask = {
      activityId,
      activityName,
      status: 'started',
      progress: 0,
      source: options.sourceStation || options.sourcePosition || '',
      destination: options.destinationStation || options.destinationPosition || '',
      itemId: options.buildBoxId || options.sampleId || options.trayId || '',
      startTime: new Date(),
      correlation: request.correlation,
      cancelled: false,
    };

    this.activeTransfers.set(activityId, task);

    // Emit start event
    await this.emitEvent('activity.status_change', {
      activityId,
      activityName,
      activityStatus: 'started',
      correlation: request.correlation,
    });

    // Start async execution
    this.executeTransfer(task);

    return {
      activityId,
      activityName,
      status: 'started',
      correlation: request.correlation,
    };
  }

  private async executeTransfer(task: TransferTask): Promise<void> {
    const steps = [
      { name: 'Moving to source', progress: 20 },
      { name: 'Picking item', progress: 40 },
      { name: 'Moving to destination', progress: 70 },
      { name: 'Placing item', progress: 90 },
      { name: 'Returning to safe position', progress: 100 },
    ];

    try {
      for (const step of steps) {
        if (task.cancelled) {
          task.status = 'cancelled';
          await this.emitEvent('activity.status_change', {
            activityId: task.activityId,
            activityName: task.activityName,
            activityStatus: 'cancelled',
            statusMsg: 'Transfer cancelled by user',
            correlation: task.correlation,
          });
          return;
        }

        // Simulate step execution
        await this.simulateStep(500);

        task.progress = step.progress;
        task.status = 'running';

        await this.emitEvent('activity.progress_update', {
          activityId: task.activityId,
          activityName: task.activityName,
          progress: step.progress,
          message: step.name,
        });
      }

      // Complete
      task.status = 'completed';
      task.endTime = new Date();

      await this.emitEvent('activity.status_change', {
        activityId: task.activityId,
        activityName: task.activityName,
        activityStatus: 'completed',
        correlation: task.correlation,
        dataProducts: [
          {
            productUuid: uuidv4(),
            productName: 'transfer_log',
            contentType: 'application/json',
          },
        ],
      });
    } catch (error) {
      task.status = 'failed';
      task.endTime = new Date();

      await this.emitEvent('activity.status_change', {
        activityId: task.activityId,
        activityName: task.activityName,
        activityStatus: 'failed',
        statusMsg: (error as Error).message,
        correlation: task.correlation,
      });
    }
  }

  private simulateStep(durationMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, durationMs));
  }

  async getActivityStatus(activityId: string): Promise<ActivityStatusResult> {
    const task = this.activeTransfers.get(activityId);
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
    const task = this.activeTransfers.get(activityId);
    if (!task) {
      throw new Error(`Unknown activity: ${activityId}`);
    }

    if (task.status !== 'completed') {
      throw new Error(`Activity ${activityId} not completed (status: ${task.status})`);
    }

    return {
      activityId,
      dataProducts: [
        {
          productUuid: uuidv4(),
          productName: 'transfer_log',
          contentType: 'application/json',
          data: {
            buildBoxId: task.itemId,
            source: task.source,
            destination: task.destination,
            startTime: task.startTime.toISOString(),
            endTime: task.endTime?.toISOString(),
            success: task.status === 'completed',
          },
        },
      ],
    };
  }

  async cancelActivity(
    activityId: string,
    request: CancelActivityRequest
  ): Promise<CancelActivityResult> {
    const task = this.activeTransfers.get(activityId);
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

  // ============================================================================
  // Event Handling
  // ============================================================================

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
      console.error(`[RobotArmController] Error emitting event:`, error);
    }
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  shutdown(): void {
    // Cancel all active transfers
    for (const task of this.activeTransfers.values()) {
      task.cancelled = true;
    }
    this.activeTransfers.clear();
    this.performedActions.clear();
  }
}

// ============================================================================
// Mock Robot Client (for development)
// ============================================================================

export function createMockRobotClient(): RobotClient {
  let state: RobotState = {
    position: { x: 0, y: 0, z: 0, rotation: 0 },
    gripperOpen: true,
    holdingItem: null,
    estopActive: false,
    homingRequired: true,
  };

  return {
    async getState() {
      return { ...state };
    },
    async home() {
      state.homingRequired = false;
      state.position = { x: 0, y: 0, z: 0, rotation: 0 };
    },
    async moveToPosition(position: RobotPosition) {
      if (state.estopActive) throw new Error('E-Stop active');
      if (state.homingRequired) throw new Error('Homing required');
      state.position = { ...position };
    },
    async openGripper() {
      state.gripperOpen = true;
      state.holdingItem = null;
    },
    async closeGripper() {
      state.gripperOpen = false;
    },
    async pickItem(stationId: string, slotIndex: number) {
      if (state.holdingItem) throw new Error('Already holding item');
      state.holdingItem = `item-${stationId}-${slotIndex}`;
      return state.holdingItem;
    },
    async placeItem(stationId: string, slotIndex: number) {
      if (!state.holdingItem) throw new Error('Not holding item');
      state.holdingItem = null;
    },
    async emergencyStop() {
      state.estopActive = true;
    },
    async resetEstop() {
      state.estopActive = false;
      state.homingRequired = true;
    },
  };
}

// ============================================================================
// Factory
// ============================================================================

export function createRobotArmController(
  robotClient?: RobotClient,
  controllerId?: string
): RobotArmController {
  return new RobotArmController(
    robotClient || createMockRobotClient(),
    controllerId
  );
}
