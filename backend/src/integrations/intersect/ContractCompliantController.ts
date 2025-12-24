/**
 * Contract-Compliant Instrument Controller Base
 *
 * Abstract base class that ensures all controller implementations
 * emit events and return responses that conform to the INTERSECT
 * JSON Schema contract (v0.1).
 *
 * Controllers should extend this class and implement the abstract methods.
 */

import {
  KeyValString,
  TimeStamp,
  UUID,
  ContractActivityStatus,
  ContractActivityStatusType,
  ContractActionStatus,
  ContractActionStatusType,
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
  InstrumentActionCompletionEvent,
  InstrumentActivityStatusChangeEvent,
  IntersectEventEnvelope,
  toTimeStamp,
  toContractActivityStatus,
  toContractActionStatus,
} from './contract-types';

// ============================================================================
// Types
// ============================================================================

export interface ControllerHealthStatus {
  healthy: boolean;
  status: string;
  message?: string;
  components?: Record<string, { healthy: boolean; status?: string }>;
}

export type EventCallback = (event: IntersectEventEnvelope) => Promise<void>;

// ============================================================================
// Abstract Base Controller
// ============================================================================

export abstract class ContractCompliantController {
  abstract readonly controllerId: string;
  abstract readonly controllerName: string;
  abstract readonly controllerType: string;

  protected eventCallback?: EventCallback;

  // ============================================================================
  // Event Callback Management
  // ============================================================================

  /**
   * Set the callback for emitting events
   */
  setEventCallback(callback: EventCallback): void {
    this.eventCallback = callback;
  }

  // ============================================================================
  // Contract-Compliant Event Emission
  // ============================================================================

  /**
   * Emit an InstrumentActionCompletion event
   * Conforms to: InstrumentActionCompletion.event.json
   */
  protected async emitActionCompletion(
    actionName: string,
    status: 'success' | 'failure',
    timeBegin: Date,
    timeEnd: Date,
    statusMsg?: string
  ): Promise<void> {
    if (!this.eventCallback) return;

    const eventData: InstrumentActionCompletionEvent = {
      actionName,
      actionStatus: status === 'success'
        ? ContractActionStatus.SUCCESS
        : ContractActionStatus.FAILURE,
      timeBegin: toTimeStamp(timeBegin),
      timeEnd: toTimeStamp(timeEnd),
    };

    if (statusMsg) {
      eventData.statusMsg = statusMsg;
    }

    const envelope: IntersectEventEnvelope = {
      eventName: 'InstrumentActionCompletion',
      eventData,
    };

    await this.eventCallback(envelope);
  }

  /**
   * Emit an InstrumentActivityStatusChange event
   * Conforms to: InstrumentActivityStatusChange.event.json
   */
  protected async emitActivityStatusChange(
    activityId: string,
    activityName: string,
    status: ContractActivityStatusType,
    statusMsg?: string
  ): Promise<void> {
    if (!this.eventCallback) return;

    const eventData: InstrumentActivityStatusChangeEvent = {
      activityId,
      activityName,
      activityStatus: status,
    };

    if (statusMsg) {
      eventData.statusMsg = statusMsg;
    }

    const envelope: IntersectEventEnvelope = {
      eventName: 'InstrumentActivityStatusChange',
      eventData,
    };

    await this.eventCallback(envelope);
  }

  // ============================================================================
  // Abstract Methods (to be implemented by subclasses)
  // ============================================================================

  /**
   * Health check
   */
  abstract healthCheck(): Promise<ControllerHealthStatus>;

  /**
   * List available actions
   * Returns: ListActions.reply.json
   */
  abstract listActions(): Promise<ListActionsReply>;

  /**
   * Get action description
   * Returns: GetActionDescription.reply.json
   */
  abstract getActionDescription(actionName: string): Promise<GetActionDescriptionReply>;

  /**
   * Perform an action
   * Input: PerformAction.command.json
   * Returns 202 Accepted, completion via event
   */
  abstract performAction(command: PerformActionCommand): Promise<{ accepted: boolean }>;

  /**
   * List available activities
   * Returns: ListActivities.reply.json
   */
  abstract listActivities(): Promise<ListActivitiesReply>;

  /**
   * Get activity description
   * Returns: GetActivityDescription.reply.json
   */
  abstract getActivityDescription(activityName: string): Promise<GetActivityDescriptionReply>;

  /**
   * Start an activity
   * Input: StartActivity.request.json
   * Returns: StartActivity.reply.json
   */
  abstract startActivity(request: StartActivityRequest): Promise<StartActivityReply>;

  /**
   * Get activity status
   * Returns: GetActivityStatus.reply.json
   */
  abstract getActivityStatus(activityId: string): Promise<GetActivityStatusReply>;

  /**
   * Get activity data (products)
   * Returns: GetActivityData.reply.json
   */
  abstract getActivityData(activityId: string): Promise<GetActivityDataReply>;

  /**
   * Cancel an activity
   * Input: CancelActivity.command.json
   */
  abstract cancelActivity(command: CancelActivityCommand): Promise<{ accepted: boolean }>;

  /**
   * Shutdown the controller
   */
  abstract shutdown(): void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique activity ID in the expected format
 */
export function generateActivityId(prefix: string = 'act'): string {
  const num = Math.floor(Math.random() * 10000);
  return `${prefix}_${num.toString().padStart(4, '0')}`;
}

/**
 * Generate a UUID for data products
 */
export function generateProductUuid(): UUID {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
