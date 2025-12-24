/**
 * INTERSECT Contract-Compliant Type Definitions
 *
 * These types are derived directly from the JSON schemas in:
 * contracts/jsonschema/instrument-controller/v0.1/
 *
 * Use these types when interfacing with INTERSECT controllers to ensure
 * schema compliance. Run `npm run validate:fixtures` to verify.
 */

// ============================================================================
// Common Types (from common.json)
// ============================================================================

/**
 * Key-value string pair for options
 * Schema: common.json#/definitions/KeyValString
 */
export interface KeyValString {
  key: string;  // minLength: 1
  value: string;
}

/**
 * ISO 8601 timestamp string
 * Schema: common.json#/definitions/TimeStamp
 */
export type TimeStamp = string;  // format: date-time

/**
 * UUID string
 * Schema: common.json#/definitions/UUID
 */
export type UUID = string;  // format: uuid

// ============================================================================
// Activity Status Enum (from InstrumentActivityStatusChange.event.json)
// ============================================================================

export const ContractActivityStatus = {
  PENDING: 'ACTIVITY_PENDING',
  IN_PROGRESS: 'ACTIVITY_IN_PROGRESS',
  CANCELED: 'ACTIVITY_CANCELED',
  COMPLETED: 'ACTIVITY_COMPLETED',
  FAILED: 'ACTIVITY_FAILED',
} as const;

export type ContractActivityStatusType = typeof ContractActivityStatus[keyof typeof ContractActivityStatus];

// ============================================================================
// Action Status Enum (from InstrumentActionCompletion.event.json)
// ============================================================================

export const ContractActionStatus = {
  SUCCESS: 'ACTION_SUCCESS',
  FAILURE: 'ACTION_FAILURE',
} as const;

export type ContractActionStatusType = typeof ContractActionStatus[keyof typeof ContractActionStatus];

// ============================================================================
// Action Types (Request/Reply)
// ============================================================================

/**
 * ListActions reply
 * Schema: ListActions.reply.json
 */
export interface ListActionsReply {
  actionNames: string[];
  errorMsg?: string;
}

/**
 * GetActionDescription request
 * Schema: GetActionDescription.request.json
 */
export interface GetActionDescriptionRequest {
  actionName: string;  // minLength: 1
}

/**
 * GetActionDescription reply
 * Schema: GetActionDescription.reply.json
 */
export interface GetActionDescriptionReply {
  actionName: string;
  description?: string;
  optionsSchema?: Record<string, unknown>;
  resultSchema?: Record<string, unknown>;
  errorMsg?: string;
}

/**
 * PerformAction command
 * Schema: PerformAction.command.json
 */
export interface PerformActionCommand {
  actionName: string;  // minLength: 1
  actionOptions?: KeyValString[];
}

// ============================================================================
// Activity Types (Request/Reply)
// ============================================================================

/**
 * ListActivities reply
 * Schema: ListActivities.reply.json
 */
export interface ListActivitiesReply {
  activityNames: string[];
  errorMsg?: string;
}

/**
 * GetActivityDescription request
 * Schema: GetActivityDescription.request.json
 */
export interface GetActivityDescriptionRequest {
  activityName: string;  // minLength: 1
}

/**
 * GetActivityDescription reply
 * Schema: GetActivityDescription.reply.json
 */
export interface GetActivityDescriptionReply {
  activityName: string;
  description?: string;
  optionsSchema?: Record<string, unknown>;
  dataProductSchemas?: Array<{
    name: string;
    description?: string;
    contentType?: string;
    schema?: Record<string, unknown>;
  }>;
  errorMsg?: string;
}

/**
 * StartActivity request
 * Schema: StartActivity.request.json
 */
export interface StartActivityRequest {
  activityName: string;  // minLength: 1
  activityOptions?: KeyValString[];
  activityDeadline?: TimeStamp;
}

/**
 * StartActivity reply
 * Schema: StartActivity.reply.json
 */
export interface StartActivityReply {
  activityId: string;  // minLength: 1
  errorMsg?: string;
}

/**
 * GetActivityStatus request
 * Schema: GetActivityStatus.request.json
 */
export interface GetActivityStatusRequest {
  activityId: string;  // minLength: 1
}

/**
 * GetActivityStatus reply
 * Schema: GetActivityStatus.reply.json
 */
export interface GetActivityStatusReply {
  activityStatus: ContractActivityStatusType;
  timeBegin: TimeStamp;
  timeEnd?: TimeStamp;
  statusMsg?: string;
  errorMsg?: string;
}

/**
 * GetActivityData request
 * Schema: GetActivityData.request.json
 */
export interface GetActivityDataRequest {
  activityId: string;  // minLength: 1
}

/**
 * GetActivityData reply
 * Schema: GetActivityData.reply.json
 */
export interface GetActivityDataReply {
  products: UUID[];
  errorMsg?: string;
}

/**
 * CancelActivity command
 * Schema: CancelActivity.command.json
 */
export interface CancelActivityCommand {
  activityId: string;  // minLength: 1
  reason: string;  // minLength: 1
}

// ============================================================================
// Event Types (Async)
// ============================================================================

/**
 * InstrumentActionCompletion event data
 * Schema: InstrumentActionCompletion.event.json
 */
export interface InstrumentActionCompletionEvent {
  actionName: string;
  actionStatus: ContractActionStatusType;
  timeBegin: TimeStamp;
  timeEnd: TimeStamp;
  statusMsg?: string;
}

/**
 * InstrumentActivityStatusChange event data
 * Schema: InstrumentActivityStatusChange.event.json
 */
export interface InstrumentActivityStatusChangeEvent {
  activityId: string;
  activityName: string;
  activityStatus: ContractActivityStatusType;
  statusMsg?: string;
}

/**
 * Event envelope for simulator transport
 * Schema: IntersectEventEnvelope.schema.json
 */
export interface IntersectEventEnvelope {
  eventName: 'InstrumentActionCompletion' | 'InstrumentActivityStatusChange';
  eventData: InstrumentActionCompletionEvent | InstrumentActivityStatusChangeEvent;
}

// ============================================================================
// ADAM Event Bridge Types (Normalized Output)
// ============================================================================

/**
 * ADAM event type enum for bridge output
 * Schema: adam/intersect-event-envelope.v1.json
 */
export const AdamEventType = {
  ACTION_COMPLETION: 'adam.intersect.instrument_action_completion',
  ACTIVITY_STATUS_CHANGE: 'adam.intersect.instrument_activity_status_change',
} as const;

export type AdamEventTypeValue = typeof AdamEventType[keyof typeof AdamEventType];

/**
 * Correlation context for ADAM events
 * Schema: adam/intersect-event-envelope.v1.json#/properties/correlation
 */
export interface AdamEventCorrelation {
  campaignId: string;  // minLength: 1
  experimentRunId: string;  // minLength: 1
  traceId: string;  // minLength: 1
  instrumentControllerId?: string;
}

/**
 * ADAM normalized event envelope (bridge output)
 * Schema: adam/intersect-event-envelope.v1.json
 */
export interface AdamIntersectEventEnvelope {
  eventType: AdamEventTypeValue;
  occurredAt: TimeStamp;
  correlation: AdamEventCorrelation;
  payload: InstrumentActionCompletionEvent | InstrumentActivityStatusChangeEvent;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert internal activity status to contract format
 */
export function toContractActivityStatus(status: string): ContractActivityStatusType {
  const mapping: Record<string, ContractActivityStatusType> = {
    'pending': ContractActivityStatus.PENDING,
    'started': ContractActivityStatus.PENDING,
    'running': ContractActivityStatus.IN_PROGRESS,
    'in_progress': ContractActivityStatus.IN_PROGRESS,
    'completed': ContractActivityStatus.COMPLETED,
    'failed': ContractActivityStatus.FAILED,
    'cancelled': ContractActivityStatus.CANCELED,
    'canceled': ContractActivityStatus.CANCELED,
    'timeout': ContractActivityStatus.CANCELED,
  };
  return mapping[status.toLowerCase()] || ContractActivityStatus.PENDING;
}

/**
 * Convert internal action status to contract format
 */
export function toContractActionStatus(status: string): ContractActionStatusType {
  const successStatuses = ['success', 'completed', 'done'];
  return successStatuses.includes(status.toLowerCase())
    ? ContractActionStatus.SUCCESS
    : ContractActionStatus.FAILURE;
}

/**
 * Convert contract activity status to internal format
 */
export function fromContractActivityStatus(status: ContractActivityStatusType): string {
  const mapping: Record<ContractActivityStatusType, string> = {
    [ContractActivityStatus.PENDING]: 'pending',
    [ContractActivityStatus.IN_PROGRESS]: 'running',
    [ContractActivityStatus.COMPLETED]: 'completed',
    [ContractActivityStatus.FAILED]: 'failed',
    [ContractActivityStatus.CANCELED]: 'cancelled',
  };
  return mapping[status] || 'pending';
}

/**
 * Format Date to ISO 8601 timestamp string (contract format)
 */
export function toTimeStamp(date: Date | string): TimeStamp {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Create an ADAM normalized event envelope from INTERSECT event
 */
export function createAdamEventEnvelope(
  event: IntersectEventEnvelope,
  correlation: AdamEventCorrelation
): AdamIntersectEventEnvelope {
  const eventTypeMap: Record<string, AdamEventTypeValue> = {
    'InstrumentActionCompletion': AdamEventType.ACTION_COMPLETION,
    'InstrumentActivityStatusChange': AdamEventType.ACTIVITY_STATUS_CHANGE,
  };

  // Determine occurred time from event data
  let occurredAt: TimeStamp;
  if (event.eventName === 'InstrumentActionCompletion') {
    occurredAt = (event.eventData as InstrumentActionCompletionEvent).timeBegin;
  } else {
    occurredAt = toTimeStamp(new Date());
  }

  return {
    eventType: eventTypeMap[event.eventName],
    occurredAt,
    correlation,
    payload: event.eventData,
  };
}

/**
 * Validate that a value matches the contract activity status enum
 */
export function isValidContractActivityStatus(value: string): value is ContractActivityStatusType {
  return Object.values(ContractActivityStatus).includes(value as ContractActivityStatusType);
}

/**
 * Validate that a value matches the contract action status enum
 */
export function isValidContractActionStatus(value: string): value is ContractActionStatusType {
  return Object.values(ContractActionStatus).includes(value as ContractActionStatusType);
}
