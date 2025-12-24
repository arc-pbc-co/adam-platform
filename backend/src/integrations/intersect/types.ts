/**
 * INTERSECT Integration Type Definitions
 * Based on INTERSECT Instrument Controller Capability Contract v0.1
 */

// ============================================================================
// Common Types
// ============================================================================

export interface KeyValue {
  key: string;
  value: string;
}

export interface Correlation {
  experimentRunId: string;
  campaignId?: string;
  traceId?: string;
}

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
// Action Types
// ============================================================================

export interface ActionListResponse {
  actionNames: string[];
}

export interface OptionDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  required?: boolean;
  default?: string;
  description?: string;
  enumValues?: string[];
}

export interface ActionDescriptionResponse {
  actionName: string;
  description: string;
  options?: OptionDefinition[];
  idempotent?: boolean;
}

export interface PerformActionRequest {
  actionOptions?: KeyValue[];
  idempotencyKey: string;
  correlation?: Correlation;
}

export interface PerformActionResponse {
  accepted: boolean;
  message?: string;
}

// ============================================================================
// Activity Types
// ============================================================================

export interface ActivityListResponse {
  activityNames: string[];
}

export interface ActivityDescriptionResponse {
  activityName: string;
  description: string;
  options?: OptionDefinition[];
  estimatedDuration?: number; // seconds
  dataProducts?: string[];
}

export interface StartActivityRequest {
  activityOptions?: KeyValue[];
  activityDeadline?: Date;
  correlation: Correlation;
}

export interface StartActivityResponse {
  activityId: string;
  message?: string;
}

export type ActivityStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ActivityStatusResponse {
  activityId: string;
  activityName?: string;
  activityStatus: ActivityStatus;
  statusMsg?: string;
  progress?: number; // 0-100
  timeBegin?: Date;
  timeEnd?: Date;
  errorMsg?: string;
}

export interface ActivityDataResponse {
  activityId: string;
  products: string[]; // UUIDs
  message?: string;
}

export interface CancelActivityRequest {
  reason: string;
}

export interface CancelActivityResponse {
  cancelled: boolean;
  message?: string;
}

// ============================================================================
// Event Types (Async Messaging)
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
  activityStatus: ActivityStatus;
  progress?: number;
  statusMsg?: string;
  errorMsg?: string;
  cancellationReason?: string;
  correlation?: Correlation;
}

// ============================================================================
// Controller Interface
// ============================================================================

export interface InstrumentController {
  // Controller metadata
  readonly controllerId: string;
  readonly controllerName: string;
  readonly controllerType: string;

  // Action methods
  listActions(): Promise<ActionListResponse>;
  getActionDescription(actionName: string): Promise<ActionDescriptionResponse>;
  performAction(
    actionName: string,
    request: PerformActionRequest
  ): Promise<PerformActionResponse>;

  // Activity methods
  listActivities(): Promise<ActivityListResponse>;
  getActivityDescription(activityName: string): Promise<ActivityDescriptionResponse>;
  startActivity(
    activityName: string,
    request: StartActivityRequest
  ): Promise<StartActivityResponse>;
  getActivityStatus(activityId: string): Promise<ActivityStatusResponse>;
  getActivityData(activityId: string): Promise<ActivityDataResponse>;
  cancelActivity(
    activityId: string,
    request: CancelActivityRequest
  ): Promise<CancelActivityResponse>;

  // Health check
  healthCheck(): Promise<{ healthy: boolean; message?: string }>;
}

// ============================================================================
// Gateway Types
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

export interface ControllerEndpoint {
  controllerId: string;
  endpoint: string;
  healthEndpoint?: string;
}

// ============================================================================
// Correlation Store Types
// ============================================================================

export interface ActivityCorrelation {
  id: string;
  activityId: string;
  experimentRunId: string;
  campaignId?: string;
  controllerId: string;
  activityName: string;
  status: ActivityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataProductMapping {
  id: string;
  productUuid: string;
  activityId: string;
  artifactId?: string;
  storageUri?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  createdAt: Date;
}

// ============================================================================
// Event Bridge Types
// ============================================================================

export type IntersectEventType =
  | 'action.completion'
  | 'activity.status_change';

export interface IntersectEvent<T = unknown> {
  eventType: IntersectEventType;
  timestamp: Date;
  controllerId: string;
  payload: T;
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

// ============================================================================
// Schema Mapper Types
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

export interface ExperimentPlanMapping {
  phases: PhaseMapping[];
}

export interface PhaseMapping {
  phaseName: string;
  activities: WorkOrderToActivityMapping[];
}
