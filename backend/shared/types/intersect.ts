/**
 * INTERSECT Contract Types
 *
 * Shared type definitions for INTERSECT Instrument Controller integration.
 * Based on INTERSECT Instrument Controller Capability Contract v0.1
 */

import {
  Correlation,
  ActivityStatus,
  LegacyActivityStatus,
  ActivityCorrelation,
} from './correlation';

// Re-export correlation types for convenience
export {
  Correlation,
  ActivityStatus,
  LegacyActivityStatus,
  ActivityCorrelation,
};

// ============================================================================
// Common Types
// ============================================================================

export interface KeyValue {
  key: string;
  value: string;
}

export type ActionStatus = 'ACTION_SUCCESS' | 'ACTION_FAILURE';

// ============================================================================
// Error Types
// ============================================================================

export type IntersectErrorCode =
  | 'controller_unavailable'
  | 'controller_busy'
  | 'unknown_action'
  | 'unknown_activity'
  | 'unknown_activity_id'
  | 'invalid_options'
  | 'deadline_invalid'
  | 'data_not_ready'
  | 'internal_error';

export interface IntersectError {
  error: IntersectErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export class IntersectServiceError extends Error {
  constructor(
    public code: IntersectErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'IntersectServiceError';
  }

  toJSON(): IntersectError {
    return {
      error: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// ============================================================================
// Health Status Types
// ============================================================================

export interface ComponentHealth {
  healthy: boolean;
  message?: string;
}

export interface HealthStatus {
  healthy: boolean;
  status?: 'operational' | 'degraded' | 'offline';
  message?: string;
  components?: Record<string, ComponentHealth>;
}

// ============================================================================
// Option Types
// ============================================================================

export interface OptionDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  required?: boolean;
  default?: string;
  description?: string;
  enumValues?: string[];
}

// ============================================================================
// Action Types
// ============================================================================

export interface ActionListResponse {
  actionNames: string[];
}

export interface ActionDescriptionResponse {
  actionName: string;
  description: string;
  options?: OptionDefinition[];
  idempotent?: boolean;
}

export interface ActionDescription extends ActionDescriptionResponse {
  version?: string;
  optionsSchema?: Record<string, unknown>;
  resultSchema?: Record<string, unknown>;
}

export interface PerformActionRequest {
  actionOptions?: KeyValue[];
  idempotencyKey: string;
  correlation?: Correlation;
  options?: Record<string, unknown>;
}

export interface PerformActionResponse {
  accepted: boolean;
  message?: string;
}

export interface PerformActionResult extends PerformActionResponse {
  actionName?: string;
  status?: 'completed' | 'failed' | 'pending';
  result?: Record<string, unknown>;
  idempotencyKey?: string;
}

// ============================================================================
// Activity Types
// ============================================================================

export interface ActivityListResponse {
  activityNames: string[];
}

export interface DataProductSchema {
  name: string;
  description: string;
  contentType: string;
  schema?: Record<string, unknown>;
}

export interface ActivityDescriptionResponse {
  activityName: string;
  description: string;
  options?: OptionDefinition[];
  estimatedDuration?: number;
  dataProducts?: string[];
}

export interface ActivityDescription extends ActivityDescriptionResponse {
  version?: string;
  optionsSchema?: Record<string, unknown>;
  dataProductSchemas?: DataProductSchema[];
}

export interface StartActivityRequest {
  activityOptions?: KeyValue[];
  activityDeadline?: Date;
  correlation: Correlation;
  options?: Record<string, unknown>;
}

export interface StartActivityResponse {
  activityId: string;
  message?: string;
}

export interface StartActivityResult extends StartActivityResponse {
  activityName?: string;
  status: ActivityStatus | 'started';
  correlation?: Correlation;
}

export interface ActivityStatusResponse {
  activityId: string;
  activityName?: string;
  activityStatus: ActivityStatus;
  statusMsg?: string;
  progress?: number;
  timeBegin?: Date;
  timeEnd?: Date;
  errorMsg?: string;
}

export interface ActivityStatusResult extends ActivityStatusResponse {
  status?: ActivityStatus | string;
  message?: string;
}

export interface DataProduct {
  productUuid: string;
  productName: string;
  contentType: string;
  data?: Record<string, unknown>;
  storageUri?: string;
}

export interface ActivityDataResponse {
  activityId: string;
  products: string[];
  message?: string;
}

export interface ActivityDataResult extends ActivityDataResponse {
  dataProducts?: DataProduct[];
}

export interface CancelActivityRequest {
  reason: string;
}

export interface CancelActivityResponse {
  cancelled: boolean;
  message?: string;
}

export interface CancelActivityResult extends CancelActivityResponse {
  activityId: string;
}

// ============================================================================
// Event Types
// ============================================================================

export interface InstrumentActionCompletion {
  actionName: string;
  actionStatus: 'success' | 'failed';
  timeBegin: Date;
  timeEnd: Date;
  statusMsg?: string;
  errorMsg?: string;
  correlation?: Correlation;
}

export interface InstrumentActivityStatusChange {
  activityId: string;
  activityName: string;
  activityStatus: ActivityStatus | LegacyActivityStatus;
  progress?: number;
  statusMsg?: string;
  errorMsg?: string;
  cancellationReason?: string;
  correlation?: Correlation;
}

export interface NormalizedAdamEvent {
  eventType: string;
  experimentRunId: string;
  campaignId?: string;
  timestamp: Date;
  source: 'intersect';
  data: {
    activityId?: string;
    actionName?: string;
    status: string;
    progress?: number;
    message?: string;
    error?: string;
    dataProducts?: string[];
  };
}

export type IntersectEventType =
  | 'action.completion'
  | 'activity.status_change'
  | 'activity.progress_update'
  | 'activity.data_ready'
  | 'controller.health_update';

export interface IntersectEvent<T = unknown> {
  eventType: IntersectEventType;
  timestamp: Date;
  controllerId: string;
  payload: T;
}

export interface ActivityProgressPayload {
  activityId: string;
  activityName?: string;
  progress: number;
  statusMsg?: string;
}

export interface ActivityDataReadyPayload {
  activityId: string;
  activityName?: string;
  dataProducts: DataProduct[];
}

export interface ControllerHealthPayload {
  controllerId: string;
  healthy: boolean;
  status: string;
  message?: string;
}

// ============================================================================
// Controller Types
// ============================================================================

export interface ControllerInfo {
  controllerId: string;
  controllerName: string;
  controllerType: string;
  endpoint: string;
  status: 'online' | 'offline' | 'degraded';
  lastSeen: Date;
  capabilities: {
    actions: string[];
    activities: string[];
  };
}

export interface ControllerEndpoint {
  controllerId: string;
  endpoint: string;
  healthEndpoint?: string;
}

/**
 * INTERSECT Instrument Controller interface
 */
export interface InstrumentController {
  readonly controllerId: string;
  readonly controllerName: string;
  readonly controllerType: string;

  listActions(): Promise<ActionListResponse>;
  getActionDescription(actionName: string): Promise<ActionDescriptionResponse>;
  performAction(actionName: string, request: PerformActionRequest): Promise<PerformActionResponse>;

  listActivities(): Promise<ActivityListResponse>;
  getActivityDescription(activityName: string): Promise<ActivityDescriptionResponse>;
  startActivity(activityName: string, request: StartActivityRequest): Promise<StartActivityResponse>;
  getActivityStatus(activityId: string): Promise<ActivityStatusResponse>;
  getActivityData(activityId: string): Promise<ActivityDataResponse>;
  cancelActivity(activityId: string, request: CancelActivityRequest): Promise<CancelActivityResponse>;

  healthCheck(): Promise<{ healthy: boolean; message?: string }>;
}

// ============================================================================
// Gateway Configuration
// ============================================================================

export interface GatewayConfig {
  natsUrl: string;
  controllers: ControllerEndpoint[];
  defaultTimeout: number;
  retryConfig: {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
  };
}

export interface EventBridgeConfig {
  natsUrl: string;
  sourceControllerId?: string;
}

// ============================================================================
// Service Interfaces
// ============================================================================

export type EventHandler = (event: NormalizedAdamEvent) => Promise<void>;

export interface IIntersectEventBridge {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  subscribe(handler: EventHandler): void;
  unsubscribe(handler: EventHandler): void;
}

export interface IIntersectGatewayService {
  startActivity(params: {
    controllerId: string;
    activityName: string;
    experimentRunId: string;
    campaignId?: string;
    activityOptions?: KeyValue[];
    deadline?: Date;
  }): Promise<StartActivityResponse>;

  getActivityStatus(controllerId: string, activityId: string): Promise<ActivityStatusResponse>;
  getActivityData(controllerId: string, activityId: string): Promise<ActivityDataResponse>;
  cancelActivity(controllerId: string, activityId: string, reason: string): Promise<void>;

  performAction(params: {
    controllerId: string;
    actionName: string;
    actionOptions?: KeyValue[];
    idempotencyKey: string;
    correlation?: Correlation;
  }): Promise<PerformActionResponse>;

  listControllers(): Promise<ControllerInfo[]>;
  listActions(controllerId: string): Promise<string[]>;
  listActivities(controllerId: string): Promise<string[]>;
  getControllerHealth(controllerId: string): Promise<{ healthy: boolean; message?: string }>;
}

// ============================================================================
// Schema Mapping Types
// ============================================================================

export interface MappingResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export interface WorkOrderToActivityMapping {
  activityName: string;
  activityOptions: KeyValue[];
  estimatedDuration?: number;
}

export interface PhaseMapping {
  phaseName: string;
  activities: WorkOrderToActivityMapping[];
}

export interface ExperimentPlanMapping {
  phases: PhaseMapping[];
}

