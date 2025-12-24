/**
 * Contract-Compliant Simulator Controller
 *
 * A TypeScript implementation of the INTERSECT Instrument Controller
 * that matches the behavior of the Python simulator in:
 * contract-test-scaffold/simulator/python/app/main.py
 *
 * This controller:
 * - Implements the exact same actions (HOME, MOVE, CALIBRATE)
 * - Implements the exact same activities (BUILD, SCAN)
 * - Emits events that conform to the JSON schemas
 * - Can be used to run contract tests in Node.js environment
 */

import {
  KeyValString,
  ContractActivityStatus,
  ContractActivityStatusType,
  ContractActionStatus,
  ListActionsReply,
  GetActionDescriptionReply,
  PerformActionCommand,
  ListActivitiesReply,
  GetActivityDescriptionReply,
  StartActivityRequest,
  StartActivityReply,
  GetActivityStatusReply,
  GetActivityDataReply,
  CancelActivityCommand,
  IntersectEventEnvelope,
  toTimeStamp,
} from './contract-types';

import {
  ContractCompliantController,
  ControllerHealthStatus,
  EventCallback,
  generateActivityId,
  generateProductUuid,
} from './ContractCompliantController';

// ============================================================================
// Types
// ============================================================================

interface ActivityState {
  activityId: string;
  activityName: string;
  status: ContractActivityStatusType;
  timeBegin: string;
  timeEnd?: string;
  statusMsg?: string;
  products: string[];
  deadline?: Date;
}

// ============================================================================
// Contract Simulator Controller
// ============================================================================

export class ContractSimulatorController extends ContractCompliantController {
  readonly controllerId: string;
  readonly controllerName: string = 'Contract Test Simulator';
  readonly controllerType: string = 'simulator';

  // Same actions as Python simulator
  private readonly ACTIONS = ['HOME', 'MOVE', 'CALIBRATE'];

  // Same activities as Python simulator
  private readonly ACTIVITIES = ['BUILD', 'SCAN'];

  private activities: Map<string, ActivityState> = new Map();
  private nextActivityNum: number = 1;

  constructor(controllerId?: string) {
    super();
    this.controllerId = controllerId || 'controller_sim_01';
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<ControllerHealthStatus> {
    return {
      healthy: true,
      status: 'operational',
      message: 'Simulator running',
    };
  }

  // ============================================================================
  // Actions
  // ============================================================================

  async listActions(): Promise<ListActionsReply> {
    return {
      actionNames: [...this.ACTIONS],
    };
  }

  async getActionDescription(actionName: string): Promise<GetActionDescriptionReply> {
    if (!this.ACTIONS.includes(actionName)) {
      return {
        actionName,
        errorMsg: `Unknown action: ${actionName}`,
      };
    }

    const descriptions: Record<string, GetActionDescriptionReply> = {
      HOME: {
        actionName: 'HOME',
        description: 'Move all axes to home position',
        optionsSchema: {
          type: 'object',
          properties: {
            speed: { type: 'string', enum: ['slow', 'fast'] },
          },
        },
      },
      MOVE: {
        actionName: 'MOVE',
        description: 'Move to specified position',
        optionsSchema: {
          type: 'object',
          properties: {
            x: { type: 'string' },
            y: { type: 'string' },
            z: { type: 'string' },
          },
        },
      },
      CALIBRATE: {
        actionName: 'CALIBRATE',
        description: 'Run calibration routine (always fails in simulator)',
        optionsSchema: { type: 'object' },
      },
    };

    return descriptions[actionName];
  }

  async performAction(command: PerformActionCommand): Promise<{ accepted: boolean }> {
    const timeBegin = new Date();

    // Simulate async action completion (same as Python simulator)
    setTimeout(async () => {
      const timeEnd = new Date();

      // CALIBRATE always fails (same as Python simulator)
      const isCalibrate = command.actionName.toUpperCase() === 'CALIBRATE';

      await this.emitActionCompletion(
        command.actionName,
        isCalibrate ? 'failure' : 'success',
        timeBegin,
        timeEnd,
        isCalibrate ? 'Calibration target not found' : undefined
      );
    }, 200);

    return { accepted: true };
  }

  // ============================================================================
  // Activities
  // ============================================================================

  async listActivities(): Promise<ListActivitiesReply> {
    return {
      activityNames: [...this.ACTIVITIES],
    };
  }

  async getActivityDescription(activityName: string): Promise<GetActivityDescriptionReply> {
    if (!this.ACTIVITIES.includes(activityName)) {
      return {
        activityName,
        errorMsg: `Unknown activity: ${activityName}`,
      };
    }

    const descriptions: Record<string, GetActivityDescriptionReply> = {
      BUILD: {
        activityName: 'BUILD',
        description: 'Execute a build operation',
        optionsSchema: {
          type: 'object',
          properties: {
            layer_height_mm: { type: 'string' },
          },
        },
        dataProductSchemas: [
          {
            name: 'build_report',
            contentType: 'application/json',
          },
        ],
      },
      SCAN: {
        activityName: 'SCAN',
        description: 'Execute a scanning operation',
        optionsSchema: {
          type: 'object',
          properties: {
            resolution: { type: 'string' },
          },
        },
        dataProductSchemas: [
          {
            name: 'scan_data',
            contentType: 'application/octet-stream',
          },
        ],
      },
    };

    return descriptions[activityName];
  }

  async startActivity(request: StartActivityRequest): Promise<StartActivityReply> {
    if (!this.ACTIVITIES.includes(request.activityName)) {
      return {
        activityId: '',
        errorMsg: `Unknown activityName: ${request.activityName}`,
      };
    }

    // Generate activity ID in same format as Python simulator: act_NNNN
    const activityId = `act_${this.nextActivityNum.toString().padStart(4, '0')}`;
    this.nextActivityNum++;

    // Parse deadline if provided
    let deadline: Date | undefined;
    if (request.activityDeadline) {
      try {
        deadline = new Date(request.activityDeadline);
      } catch (e) {
        return {
          activityId: '',
          errorMsg: `Invalid activityDeadline: ${e}`,
        };
      }
    }

    // Create activity state
    const state: ActivityState = {
      activityId,
      activityName: request.activityName,
      status: ContractActivityStatus.PENDING,
      timeBegin: toTimeStamp(new Date()),
      products: [],
      deadline,
    };
    this.activities.set(activityId, state);

    // Emit initial PENDING status
    await this.emitActivityStatusChange(
      activityId,
      request.activityName,
      ContractActivityStatus.PENDING
    );

    // Run activity simulation (same timing as Python simulator)
    this.runActivitySimulation(state);

    return { activityId };
  }

  private async runActivitySimulation(state: ActivityState): Promise<void> {
    // Wait 200ms then transition to IN_PROGRESS
    await this.delay(200);
    state.status = ContractActivityStatus.IN_PROGRESS;
    await this.emitActivityStatusChange(
      state.activityId,
      state.activityName,
      ContractActivityStatus.IN_PROGRESS
    );

    // Wait 500ms then complete (or cancel if deadline exceeded)
    await this.delay(500);

    // Check deadline
    if (state.deadline && new Date() > state.deadline) {
      state.status = ContractActivityStatus.CANCELED;
      state.statusMsg = 'Deadline exceeded';
      state.timeEnd = toTimeStamp(new Date());
      await this.emitActivityStatusChange(
        state.activityId,
        state.activityName,
        ContractActivityStatus.CANCELED,
        state.statusMsg
      );
      return;
    }

    // Complete successfully
    state.status = ContractActivityStatus.COMPLETED;
    state.timeEnd = toTimeStamp(new Date());
    // Generate 2 data products (same as Python simulator)
    state.products = [generateProductUuid(), generateProductUuid()];

    await this.emitActivityStatusChange(
      state.activityId,
      state.activityName,
      ContractActivityStatus.COMPLETED
    );
  }

  async getActivityStatus(activityId: string): Promise<GetActivityStatusReply> {
    const state = this.activities.get(activityId);
    if (!state) {
      return {
        activityStatus: ContractActivityStatus.FAILED,
        timeBegin: toTimeStamp(new Date()),
        errorMsg: 'Unknown activityId',
      };
    }

    const reply: GetActivityStatusReply = {
      activityStatus: state.status,
      timeBegin: state.timeBegin,
    };

    if (state.timeEnd) {
      reply.timeEnd = state.timeEnd;
    }

    if (state.statusMsg) {
      reply.statusMsg = state.statusMsg;
    }

    return reply;
  }

  async getActivityData(activityId: string): Promise<GetActivityDataReply> {
    const state = this.activities.get(activityId);
    if (!state) {
      return {
        products: [],
        errorMsg: 'Unknown activityId',
      };
    }

    // Data only available when completed (same as Python simulator)
    if (state.status !== ContractActivityStatus.COMPLETED) {
      return {
        products: [],
        errorMsg: 'Data not ready',
      };
    }

    return {
      products: state.products,
    };
  }

  async cancelActivity(command: CancelActivityCommand): Promise<{ accepted: boolean }> {
    const state = this.activities.get(command.activityId);
    if (!state) {
      return { accepted: false };
    }

    state.status = ContractActivityStatus.CANCELED;
    state.timeEnd = toTimeStamp(new Date());
    state.statusMsg = command.reason;

    await this.emitActivityStatusChange(
      state.activityId,
      state.activityName,
      ContractActivityStatus.CANCELED,
      state.statusMsg
    );

    return { accepted: true };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  shutdown(): void {
    this.activities.clear();
    this.nextActivityNum = 1;
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset state (useful for testing)
   */
  reset(): void {
    this.activities.clear();
    this.nextActivityNum = 1;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createContractSimulatorController(
  controllerId?: string
): ContractSimulatorController {
  return new ContractSimulatorController(controllerId);
}
