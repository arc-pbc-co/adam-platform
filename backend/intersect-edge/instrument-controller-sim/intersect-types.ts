/**
 * INTERSECT Types for Instrument Controller Simulator
 *
 * Minimal type definitions for INTERSECT controller implementation.
 * These mirror the types from backend/src/integrations/intersect
 * but are kept local to avoid cross-package dependencies in Docker builds.
 */

// ============================================================================
// Basic Types
// ============================================================================

export interface KeyValue {
  key: string;
  value: string;
}

export type ActivityStatus =
  | 'ACTIVITY_PENDING'
  | 'ACTIVITY_IN_PROGRESS'
  | 'ACTIVITY_COMPLETED'
  | 'ACTIVITY_FAILED'
  | 'ACTIVITY_CANCELED';

export type ActionStatus = 'ACTION_SUCCESS' | 'ACTION_FAILURE';

// ============================================================================
// Correlation
// ============================================================================

export interface Correlation {
  experimentRunId?: string;
  campaignId?: string;
  traceId?: string;
}

// ============================================================================
// Events
// ============================================================================

export interface InstrumentActivityStatusChange {
  activityId: string;
  activityName: string;
  activityStatus: ActivityStatus;
  statusMsg?: string;
}

export interface InstrumentActionCompletion {
  actionName: string;
  actionStatus: ActionStatus;
  timeBegin: string;
  timeEnd: string;
  statusMsg?: string;
}

export interface IntersectEvent {
  eventName: string;
  eventData: InstrumentActivityStatusChange | InstrumentActionCompletion;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface ActionListResponse {
  actionNames: string[];
}

export interface ActionDescriptionResponse {
  actionName: string;
  description: string;
  requiredOptions?: string[];
  optionalOptions?: string[];
}

export interface PerformActionRequest {
  actionName: string;
  actionOptions?: KeyValue[];
  idempotencyKey?: string;
  correlation?: Correlation;
}

export interface PerformActionResponse {
  accepted: boolean;
  message?: string;
  errorMsg?: string;
}

export interface ActivityListResponse {
  activityNames: string[];
}

export interface ActivityDescriptionResponse {
  activityName: string;
  description: string;
  requiredOptions?: string[];
  optionalOptions?: string[];
  estimatedDuration?: number; // seconds
}

export interface StartActivityRequest {
  activityName: string;
  activityOptions?: KeyValue[];
  activityDeadline?: string;
  correlation?: Correlation;
}

export interface StartActivityResponse {
  activityId: string;
  errorMsg?: string;
}

export interface ActivityStatusResponse {
  activityStatus: ActivityStatus;
  timeBegin: string;
  timeEnd?: string;
  statusMsg?: string;
  errorMsg?: string;
}

export interface ActivityDataResponse {
  products: string[];
  errorMsg?: string;
}

export interface CancelActivityRequest {
  activityId: string;
  reason: string;
}

export interface CancelActivityResponse {
  cancelled: boolean;
  message?: string;
}

// ============================================================================
// Controller Interface
// ============================================================================

export interface InstrumentController {
  // Identification
  readonly controllerId: string;
  readonly controllerName: string;

  // Actions (synchronous commands)
  listActions(): Promise<ActionListResponse>;
  getActionDescription(actionName: string): Promise<ActionDescriptionResponse>;
  performAction(request: PerformActionRequest): Promise<PerformActionResponse>;

  // Activities (long-running operations)
  listActivities(): Promise<ActivityListResponse>;
  getActivityDescription(activityName: string): Promise<ActivityDescriptionResponse>;
  startActivity(request: StartActivityRequest): Promise<StartActivityResponse>;
  getActivityStatus(activityId: string): Promise<ActivityStatusResponse>;
  getActivityData(activityId: string): Promise<ActivityDataResponse>;
  cancelActivity(request: CancelActivityRequest): Promise<CancelActivityResponse>;

  // Event emission
  onEvent(handler: (event: IntersectEvent) => void): void;
  offEvent(handler: (event: IntersectEvent) => void): void;
}
