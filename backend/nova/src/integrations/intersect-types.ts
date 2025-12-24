/**
 * INTERSECT Types for Nova Integration
 *
 * Minimal type definitions for INTERSECT integration within Nova.
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
  activityId: string;
  campaignId: string;
  experimentRunId: string;
  stepId: string;
  controllerId: string;
  traceId: string;
  createdAt: Date;
  updatedAt: Date;
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

export interface NormalizedAdamEvent {
  eventType: string;
  occurredAt: string;
  correlation: {
    campaignId: string;
    experimentRunId: string;
    traceId: string;
    instrumentControllerId?: string;
  };
  payload: InstrumentActivityStatusChange | InstrumentActionCompletion;
}

// ============================================================================
// Gateway Responses
// ============================================================================

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

export interface PerformActionResponse {
  accepted: boolean;
}

// ============================================================================
// Service Interfaces
// ============================================================================

export interface ICorrelationStore {
  save(correlation: Correlation): Promise<void>;
  findByActivityId(activityId: string): Promise<Correlation | null>;
  findByExperimentRunId(experimentRunId: string): Promise<Correlation[]>;
  findByStepId(stepId: string): Promise<Correlation | null>;
  updateStatus(activityId: string, status: ActivityStatus): Promise<void>;
  delete(activityId: string): Promise<void>;
}

export interface IIntersectGatewayService {
  startActivity(
    controllerId: string,
    activityName: string,
    options?: KeyValue[],
    deadline?: Date
  ): Promise<StartActivityResponse>;

  cancelActivity(
    controllerId: string,
    activityId: string,
    reason: string
  ): Promise<void>;

  getActivityStatus(
    controllerId: string,
    activityId: string
  ): Promise<ActivityStatusResponse>;

  performAction(
    controllerId: string,
    actionName: string,
    options?: KeyValue[]
  ): Promise<PerformActionResponse>;
}

export type EventHandler = (event: NormalizedAdamEvent) => Promise<void>;

export interface IIntersectEventBridge {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  subscribe(handler: EventHandler): void;
  unsubscribe(handler: EventHandler): void;
}
