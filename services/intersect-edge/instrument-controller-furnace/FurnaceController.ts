/**
 * Furnace/Sintering Instrument Controller
 *
 * INTERSECT-compliant controller for sintering furnaces:
 * - Temperature profile execution
 * - Atmosphere control (Argon, Nitrogen, Vacuum)
 * - Multi-zone heating
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
} from '../../../backend/src/integrations/intersect/types';

// ============================================================================
// Types
// ============================================================================

interface TemperatureZone {
  zoneId: string;
  setpoint: number;
  actual: number;
  heaterPower: number;
}

interface AtmosphereState {
  type: 'air' | 'argon' | 'nitrogen' | 'vacuum' | 'forming_gas';
  pressure: number; // mbar
  flowRate: number; // L/min
  oxygenLevel: number; // ppm
}

interface FurnaceState {
  zones: TemperatureZone[];
  atmosphere: AtmosphereState;
  doorOpen: boolean;
  cooling: boolean;
  emergencyOff: boolean;
  currentProfile?: string;
  profileProgress?: number;
}

interface TemperatureStep {
  targetTemp: number;
  rampRate: number; // °C/min
  holdTime: number; // minutes
}

interface SinterProfile {
  name: string;
  atmosphere: AtmosphereState['type'];
  steps: TemperatureStep[];
}

interface SinterCycle {
  activityId: string;
  activityName: string;
  status: ActivityStatus;
  progress: number;
  profile: SinterProfile;
  currentStep: number;
  currentTemp: number;
  startTime: Date;
  endTime?: Date;
  correlation: any;
  cancelled: boolean;
  dataLog: Array<{
    timestamp: Date;
    temperatures: number[];
    atmosphere: string;
    phase: string;
  }>;
}

// Mock furnace client interface
interface FurnaceClient {
  getState(): Promise<FurnaceState>;
  setZoneTemperature(zoneId: string, temperature: number): Promise<void>;
  setAtmosphere(type: AtmosphereState['type']): Promise<void>;
  startCooling(): Promise<void>;
  stopCooling(): Promise<void>;
  openDoor(): Promise<void>;
  closeDoor(): Promise<void>;
  emergencyOff(): Promise<void>;
  reset(): Promise<void>;
}

// ============================================================================
// Furnace Controller Implementation
// ============================================================================

export class FurnaceController implements InstrumentController {
  readonly controllerId: string;
  readonly controllerName: string = 'Sintering Furnace Controller';
  readonly controllerType: string = 'furnace';

  private furnaceClient: FurnaceClient;
  private activeCycles: Map<string, SinterCycle> = new Map();
  private eventCallback?: (event: IntersectEvent) => Promise<void>;
  private performedActions: Set<string> = new Set();

  // Standard sintering profiles
  private standardProfiles: Map<string, SinterProfile> = new Map([
    [
      'steel_standard',
      {
        name: 'Steel Standard Sintering',
        atmosphere: 'argon',
        steps: [
          { targetTemp: 600, rampRate: 10, holdTime: 30 }, // Debind
          { targetTemp: 1350, rampRate: 5, holdTime: 120 }, // Sinter
          { targetTemp: 100, rampRate: -3, holdTime: 0 }, // Cool
        ],
      },
    ],
    [
      'titanium_standard',
      {
        name: 'Titanium Standard Sintering',
        atmosphere: 'vacuum',
        steps: [
          { targetTemp: 500, rampRate: 8, holdTime: 60 }, // Debind
          { targetTemp: 1200, rampRate: 3, holdTime: 180 }, // Sinter
          { targetTemp: 100, rampRate: -2, holdTime: 0 }, // Cool
        ],
      },
    ],
    [
      'copper_standard',
      {
        name: 'Copper Standard Sintering',
        atmosphere: 'forming_gas',
        steps: [
          { targetTemp: 400, rampRate: 10, holdTime: 20 }, // Debind
          { targetTemp: 1000, rampRate: 5, holdTime: 60 }, // Sinter
          { targetTemp: 100, rampRate: -5, holdTime: 0 }, // Cool
        ],
      },
    ],
  ]);

  constructor(furnaceClient: FurnaceClient, controllerId?: string) {
    this.furnaceClient = furnaceClient;
    this.controllerId = controllerId || `furnace-${uuidv4().slice(0, 8)}`;
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<HealthStatus> {
    try {
      const state = await this.furnaceClient.getState();

      const healthy = !state.emergencyOff && !state.doorOpen;

      return {
        healthy,
        status: healthy
          ? state.currentProfile
            ? 'running_profile'
            : 'idle'
          : state.emergencyOff
          ? 'emergency_off'
          : 'door_open',
        components: {
          heating: {
            healthy: !state.emergencyOff,
            zones: state.zones.map((z) => ({
              zoneId: z.zoneId,
              setpoint: z.setpoint,
              actual: z.actual,
            })),
          },
          atmosphere: {
            healthy: true,
            type: state.atmosphere.type,
            pressure: state.atmosphere.pressure,
          },
          door: { healthy: !state.doorOpen },
          cooling: { healthy: true, active: state.cooling },
        },
        details: {
          currentProfile: state.currentProfile,
          profileProgress: state.profileProgress,
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
        'set_zone_temperature',
        'set_atmosphere',
        'start_cooling',
        'stop_cooling',
        'open_door',
        'close_door',
        'emergency_off',
        'reset',
      ],
    };
  }

  async getActionDescription(actionName: string): Promise<ActionDescription> {
    const descriptions: Record<string, ActionDescription> = {
      set_zone_temperature: {
        actionName: 'set_zone_temperature',
        description: 'Set target temperature for a specific zone',
        version: '1.0.0',
        optionsSchema: {
          type: 'object',
          properties: {
            zoneId: { type: 'string' },
            temperature: { type: 'number', minimum: 0, maximum: 1600 },
          },
          required: ['zoneId', 'temperature'],
        },
        resultSchema: { type: 'object' },
      },
      set_atmosphere: {
        actionName: 'set_atmosphere',
        description: 'Set furnace atmosphere type',
        version: '1.0.0',
        optionsSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['air', 'argon', 'nitrogen', 'vacuum', 'forming_gas'],
            },
          },
          required: ['type'],
        },
        resultSchema: { type: 'object' },
      },
      start_cooling: {
        actionName: 'start_cooling',
        description: 'Activate furnace cooling system',
        version: '1.0.0',
        optionsSchema: { type: 'object' },
        resultSchema: { type: 'object' },
      },
      stop_cooling: {
        actionName: 'stop_cooling',
        description: 'Deactivate furnace cooling system',
        version: '1.0.0',
        optionsSchema: { type: 'object' },
        resultSchema: { type: 'object' },
      },
      open_door: {
        actionName: 'open_door',
        description: 'Open furnace door (only when cool)',
        version: '1.0.0',
        optionsSchema: { type: 'object' },
        resultSchema: { type: 'object' },
      },
      close_door: {
        actionName: 'close_door',
        description: 'Close furnace door',
        version: '1.0.0',
        optionsSchema: { type: 'object' },
        resultSchema: { type: 'object' },
      },
      emergency_off: {
        actionName: 'emergency_off',
        description: 'Emergency shutdown of all heating',
        version: '1.0.0',
        optionsSchema: { type: 'object' },
        resultSchema: { type: 'object' },
      },
      reset: {
        actionName: 'reset',
        description: 'Reset furnace from emergency state',
        version: '1.0.0',
        optionsSchema: { type: 'object' },
        resultSchema: { type: 'object' },
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
        case 'set_zone_temperature':
          await this.furnaceClient.setZoneTemperature(
            options.zoneId,
            options.temperature
          );
          break;
        case 'set_atmosphere':
          await this.furnaceClient.setAtmosphere(options.type);
          break;
        case 'start_cooling':
          await this.furnaceClient.startCooling();
          break;
        case 'stop_cooling':
          await this.furnaceClient.stopCooling();
          break;
        case 'open_door':
          await this.furnaceClient.openDoor();
          break;
        case 'close_door':
          await this.furnaceClient.closeDoor();
          break;
        case 'emergency_off':
          await this.furnaceClient.emergencyOff();
          break;
        case 'reset':
          await this.furnaceClient.reset();
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
        'sinter_cycle',
        'debind_cycle',
        'custom_profile',
        'temperature_calibration',
      ],
    };
  }

  async getActivityDescription(activityName: string): Promise<ActivityDescription> {
    const descriptions: Record<string, ActivityDescription> = {
      sinter_cycle: {
        activityName: 'sinter_cycle',
        description: 'Execute a complete sintering cycle with temperature profile',
        version: '1.0.0',
        optionsSchema: {
          type: 'object',
          properties: {
            profileName: {
              type: 'string',
              description: 'Standard profile name or "custom"',
            },
            customProfile: {
              type: 'object',
              description: 'Custom profile if profileName is "custom"',
            },
            buildBoxId: { type: 'string' },
          },
          required: ['profileName'],
        },
        dataProductSchemas: [
          {
            name: 'sinter_log',
            description: 'Complete temperature and atmosphere log',
            contentType: 'application/json',
            schema: { type: 'object' },
          },
          {
            name: 'thermal_image',
            description: 'Final thermal image of parts',
            contentType: 'image/png',
            schema: {},
          },
        ],
      },
      debind_cycle: {
        activityName: 'debind_cycle',
        description: 'Execute a debinding-only cycle',
        version: '1.0.0',
        optionsSchema: {
          type: 'object',
          properties: {
            material: { type: 'string' },
            maxTemperature: { type: 'number' },
            holdTime: { type: 'number' },
          },
          required: ['material'],
        },
        dataProductSchemas: [],
      },
      custom_profile: {
        activityName: 'custom_profile',
        description: 'Execute a custom temperature profile',
        version: '1.0.0',
        optionsSchema: {
          type: 'object',
          properties: {
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  targetTemp: { type: 'number' },
                  rampRate: { type: 'number' },
                  holdTime: { type: 'number' },
                },
              },
            },
            atmosphere: { type: 'string' },
          },
          required: ['steps', 'atmosphere'],
        },
        dataProductSchemas: [],
      },
      temperature_calibration: {
        activityName: 'temperature_calibration',
        description: 'Run temperature calibration procedure',
        version: '1.0.0',
        optionsSchema: {
          type: 'object',
          properties: {
            targetTemperatures: {
              type: 'array',
              items: { type: 'number' },
            },
          },
        },
        dataProductSchemas: [
          {
            name: 'calibration_report',
            description: 'Calibration results and adjustments',
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
    const activityId = `furnace_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const options = request.options || {};

    // Get profile
    let profile: SinterProfile;
    if (options.profileName === 'custom' && options.customProfile) {
      profile = options.customProfile as SinterProfile;
    } else {
      profile = this.standardProfiles.get(options.profileName) || {
        name: 'Default',
        atmosphere: 'argon',
        steps: [
          { targetTemp: 1200, rampRate: 5, holdTime: 60 },
          { targetTemp: 100, rampRate: -3, holdTime: 0 },
        ],
      };
    }

    const cycle: SinterCycle = {
      activityId,
      activityName,
      status: 'started',
      progress: 0,
      profile,
      currentStep: 0,
      currentTemp: 25,
      startTime: new Date(),
      correlation: request.correlation,
      cancelled: false,
      dataLog: [],
    };

    this.activeCycles.set(activityId, cycle);

    await this.emitEvent('activity.status_change', {
      activityId,
      activityName,
      activityStatus: 'started',
      correlation: request.correlation,
    });

    // Start async execution
    this.executeSinterCycle(cycle);

    return {
      activityId,
      activityName,
      status: 'started',
      correlation: request.correlation,
    };
  }

  private async executeSinterCycle(cycle: SinterCycle): Promise<void> {
    try {
      // Set atmosphere
      await this.furnaceClient.setAtmosphere(cycle.profile.atmosphere);

      const totalSteps = cycle.profile.steps.length;

      for (let i = 0; i < totalSteps; i++) {
        if (cycle.cancelled) {
          cycle.status = 'cancelled';
          await this.furnaceClient.startCooling();
          await this.emitEvent('activity.status_change', {
            activityId: cycle.activityId,
            activityName: cycle.activityName,
            activityStatus: 'cancelled',
            statusMsg: 'Cycle cancelled - initiating cooling',
            correlation: cycle.correlation,
          });
          return;
        }

        const step = cycle.profile.steps[i];
        cycle.currentStep = i;

        // Simulate temperature ramp and hold
        const rampTime = Math.abs(step.targetTemp - cycle.currentTemp) / Math.abs(step.rampRate);
        const holdTime = step.holdTime;
        const totalStepTime = rampTime + holdTime;

        // Simulate in increments
        const increments = 10;
        for (let j = 0; j < increments; j++) {
          if (cycle.cancelled) break;

          await this.simulateStep(200);

          // Update temperature
          const stepProgress = (j + 1) / increments;
          if (j < increments * (rampTime / totalStepTime)) {
            cycle.currentTemp = cycle.currentTemp + (step.targetTemp - cycle.currentTemp) * stepProgress;
          }

          // Log data point
          cycle.dataLog.push({
            timestamp: new Date(),
            temperatures: [cycle.currentTemp],
            atmosphere: cycle.profile.atmosphere,
            phase: j < increments * (rampTime / totalStepTime) ? 'ramp' : 'hold',
          });

          // Update progress
          const overallProgress = ((i + stepProgress) / totalSteps) * 100;
          cycle.progress = Math.round(overallProgress);

          await this.emitEvent('activity.progress_update', {
            activityId: cycle.activityId,
            activityName: cycle.activityName,
            progress: cycle.progress,
            message: `Step ${i + 1}/${totalSteps}: ${cycle.currentTemp.toFixed(0)}°C`,
          });
        }

        cycle.currentTemp = step.targetTemp;
      }

      // Complete
      cycle.status = 'completed';
      cycle.endTime = new Date();

      await this.emitEvent('activity.status_change', {
        activityId: cycle.activityId,
        activityName: cycle.activityName,
        activityStatus: 'completed',
        correlation: cycle.correlation,
        dataProducts: [
          {
            productUuid: uuidv4(),
            productName: 'sinter_log',
            contentType: 'application/json',
          },
        ],
      });
    } catch (error) {
      cycle.status = 'failed';
      cycle.endTime = new Date();

      await this.furnaceClient.emergencyOff();

      await this.emitEvent('activity.status_change', {
        activityId: cycle.activityId,
        activityName: cycle.activityName,
        activityStatus: 'failed',
        statusMsg: (error as Error).message,
        correlation: cycle.correlation,
      });
    }
  }

  private simulateStep(durationMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, durationMs));
  }

  async getActivityStatus(activityId: string): Promise<ActivityStatusResult> {
    const cycle = this.activeCycles.get(activityId);
    if (!cycle) {
      throw new Error(`Unknown activity: ${activityId}`);
    }

    return {
      activityId,
      status: cycle.status,
      progress: cycle.progress,
      startTime: cycle.startTime,
      endTime: cycle.endTime,
      message: `Step ${cycle.currentStep + 1}, Temp: ${cycle.currentTemp.toFixed(0)}°C`,
    };
  }

  async getActivityData(activityId: string): Promise<ActivityDataResult> {
    const cycle = this.activeCycles.get(activityId);
    if (!cycle) {
      throw new Error(`Unknown activity: ${activityId}`);
    }

    if (cycle.status !== 'completed') {
      throw new Error(`Activity ${activityId} not completed (status: ${cycle.status})`);
    }

    return {
      activityId,
      dataProducts: [
        {
          productUuid: uuidv4(),
          productName: 'sinter_log',
          contentType: 'application/json',
          data: {
            profile: cycle.profile,
            startTime: cycle.startTime.toISOString(),
            endTime: cycle.endTime?.toISOString(),
            dataPoints: cycle.dataLog.length,
            peakTemperature: Math.max(...cycle.dataLog.map((d) => d.temperatures[0])),
            totalDuration: cycle.endTime
              ? (cycle.endTime.getTime() - cycle.startTime.getTime()) / 1000 / 60
              : 0,
          },
        },
      ],
    };
  }

  async cancelActivity(
    activityId: string,
    request: CancelActivityRequest
  ): Promise<CancelActivityResult> {
    const cycle = this.activeCycles.get(activityId);
    if (!cycle) {
      throw new Error(`Unknown activity: ${activityId}`);
    }

    if (cycle.status === 'completed' || cycle.status === 'failed') {
      return {
        activityId,
        cancelled: false,
        message: `Activity already ${cycle.status}`,
      };
    }

    cycle.cancelled = true;

    return {
      activityId,
      cancelled: true,
      message: `Cancellation requested: ${request.reason}. Initiating controlled cooldown.`,
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
      console.error(`[FurnaceController] Error emitting event:`, error);
    }
  }

  shutdown(): void {
    for (const cycle of this.activeCycles.values()) {
      cycle.cancelled = true;
    }
    this.activeCycles.clear();
    this.performedActions.clear();
  }
}

// ============================================================================
// Mock Furnace Client
// ============================================================================

export function createMockFurnaceClient(): FurnaceClient {
  let state: FurnaceState = {
    zones: [
      { zoneId: 'top', setpoint: 25, actual: 25, heaterPower: 0 },
      { zoneId: 'middle', setpoint: 25, actual: 25, heaterPower: 0 },
      { zoneId: 'bottom', setpoint: 25, actual: 25, heaterPower: 0 },
    ],
    atmosphere: {
      type: 'air',
      pressure: 1013,
      flowRate: 0,
      oxygenLevel: 210000,
    },
    doorOpen: false,
    cooling: false,
    emergencyOff: false,
  };

  return {
    async getState() {
      return { ...state };
    },
    async setZoneTemperature(zoneId: string, temperature: number) {
      const zone = state.zones.find((z) => z.zoneId === zoneId);
      if (zone) {
        zone.setpoint = temperature;
      }
    },
    async setAtmosphere(type: AtmosphereState['type']) {
      state.atmosphere.type = type;
      state.atmosphere.oxygenLevel = type === 'air' ? 210000 : 10;
    },
    async startCooling() {
      state.cooling = true;
    },
    async stopCooling() {
      state.cooling = false;
    },
    async openDoor() {
      const maxTemp = Math.max(...state.zones.map((z) => z.actual));
      if (maxTemp > 50) {
        throw new Error('Cannot open door while temperature > 50°C');
      }
      state.doorOpen = true;
    },
    async closeDoor() {
      state.doorOpen = false;
    },
    async emergencyOff() {
      state.emergencyOff = true;
      state.zones.forEach((z) => {
        z.setpoint = 0;
        z.heaterPower = 0;
      });
    },
    async reset() {
      state.emergencyOff = false;
    },
  };
}

// ============================================================================
// Factory
// ============================================================================

export function createFurnaceController(
  furnaceClient?: FurnaceClient,
  controllerId?: string
): FurnaceController {
  return new FurnaceController(
    furnaceClient || createMockFurnaceClient(),
    controllerId
  );
}
