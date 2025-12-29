/**
 * INTERSECT Event Bridge
 *
 * Subscribes to INTERSECT async events and normalizes them into ADAM events.
 * Handles:
 * - InstrumentActionCompletion events
 * - InstrumentActivityStatusChange events
 *
 * Responsibilities:
 * - Subscribe to NATS subjects for INTERSECT events
 * - Correlate events to ExperimentRuns using stored mappings
 * - Update ExperimentRun state in database
 * - Emit normalized events to ADAM's event bus
 * - Trigger downstream analysis/decision workflows
 */

import { EventEmitter } from 'events';
import {
  InstrumentActionCompletion,
  InstrumentActivityStatusChange,
  NormalizedAdamEvent,
  ActivityStatus,
  IntersectEvent,
  IntersectEventType,
} from '../types';
import { ICorrelationStore } from '../correlation/CorrelationStore';
import { SchemaMapper, schemaMapper } from '../mapping/SchemaMapper';

/**
 * NATS subject patterns for INTERSECT events
 */
export const INTERSECT_EVENT_SUBJECTS = {
  ACTION_COMPLETION: 'intersect.events.action.completion',
  ACTIVITY_STATUS: 'intersect.events.activity.status',
  ALL_EVENTS: 'intersect.events.>',
} as const;

/**
 * Event handler callback type
 */
export type EventHandler<T> = (event: T) => Promise<void>;

/**
 * Event bridge configuration
 */
export interface EventBridgeConfig {
  natsUrl?: string;
  subjects?: string[];
  enableLogging?: boolean;
}

/**
 * Interface for the Event Bridge
 */
export interface IIntersectEventBridge {
  // Lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;

  // Event handlers
  onActionCompletion(handler: EventHandler<InstrumentActionCompletion>): void;
  onActivityStatusChange(handler: EventHandler<InstrumentActivityStatusChange>): void;
  onNormalizedEvent(handler: EventHandler<NormalizedAdamEvent>): void;

  // Generic subscription
  subscribe(eventType: string, handler: EventHandler<IntersectEvent>): void;

  // Manual event injection (for testing)
  injectEvent(event: IntersectEvent): Promise<void>;
  handleIncomingEvent(event: IntersectEvent): Promise<void>;
}

/**
 * INTERSECT Event Bridge Implementation
 *
 * For Phase 1, this uses an in-memory EventEmitter.
 * In production, this would connect to NATS for pub/sub messaging.
 */
export class IntersectEventBridge implements IIntersectEventBridge {
  private emitter: EventEmitter;
  private correlationStore: ICorrelationStore;
  private mapper: SchemaMapper;
  private config: EventBridgeConfig;
  private isRunning: boolean = false;

  // NATS client would be added here for production
  // private natsClient?: NatsConnection;

  constructor(
    correlationStore: ICorrelationStore,
    config: EventBridgeConfig = {},
    mapper: SchemaMapper = schemaMapper
  ) {
    this.correlationStore = correlationStore;
    this.config = config;
    this.mapper = mapper;
    this.emitter = new EventEmitter();

    // Increase max listeners for high-throughput scenarios
    this.emitter.setMaxListeners(100);
  }

  /**
   * Start the event bridge
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.log('Starting INTERSECT Event Bridge...');

    // In production, connect to NATS here:
    // this.natsClient = await connect({ servers: this.config.natsUrl });
    // await this.subscribeToSubjects();

    this.isRunning = true;
    this.log('INTERSECT Event Bridge started');
  }

  /**
   * Stop the event bridge
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.log('Stopping INTERSECT Event Bridge...');

    // In production, disconnect from NATS:
    // await this.natsClient?.drain();

    this.emitter.removeAllListeners();
    this.isRunning = false;
    this.log('INTERSECT Event Bridge stopped');
  }

  /**
   * Register handler for action completion events
   */
  onActionCompletion(handler: EventHandler<InstrumentActionCompletion>): void {
    this.emitter.on('action.completion', handler);
  }

  /**
   * Register handler for activity status change events
   */
  onActivityStatusChange(handler: EventHandler<InstrumentActivityStatusChange>): void {
    this.emitter.on('activity.status_change', handler);
  }

  /**
   * Register handler for normalized ADAM events
   */
  onNormalizedEvent(handler: EventHandler<NormalizedAdamEvent>): void {
    this.emitter.on('adam.event', handler);
  }

  /**
   * Generic subscription for any event type
   */
  subscribe(eventType: string, handler: EventHandler<IntersectEvent>): void {
    this.emitter.on(eventType, handler);
  }

  /**
   * Handle incoming event (alias for injectEvent, for test compatibility)
   */
  async handleIncomingEvent(event: IntersectEvent): Promise<void> {
    return this.injectEvent(event);
  }

  /**
   * Inject an event manually (used by controllers and for testing)
   */
  async injectEvent(event: IntersectEvent): Promise<void> {
    this.log(`Received event: ${event.eventType} from ${event.controllerId}`);

    try {
      switch (event.eventType) {
        case 'action.completion':
          await this.handleActionCompletion(
            event.payload as InstrumentActionCompletion,
            event.controllerId
          );
          break;
        case 'activity.status_change':
          await this.handleActivityStatusChange(
            event.payload as InstrumentActivityStatusChange,
            event.controllerId
          );
          break;
        case 'activity.progress_update':
          await this.handleActivityProgressUpdate(event);
          break;
        default:
          this.log(`Unknown event type: ${event.eventType}`);
      }
    } catch (error) {
      console.error('Error processing INTERSECT event:', error);
    }
  }

  /**
   * Handle activity progress update events
   */
  private async handleActivityProgressUpdate(event: IntersectEvent): Promise<void> {
    const payload = event.payload as { activityId: string; progress: number; statusMsg?: string };
    this.log(`Activity progress update: ${payload.activityId} - ${payload.progress}%`);

    // Emit full event for subscribers
    this.emitter.emit('activity.progress_update', event);
  }

  /**
   * Handle action completion events
   */
  private async handleActionCompletion(
    event: InstrumentActionCompletion,
    controllerId: string
  ): Promise<void> {
    this.log(`Action completed: ${event.actionName} - ${event.actionStatus}`);

    // Emit raw event for specific handlers
    this.emitter.emit('action.completion', event);

    // Map to normalized ADAM event
    const normalizedEvent = this.mapper.mapActionCompletionToAdamEvent(event, controllerId);

    // Emit normalized event
    this.emitter.emit('adam.event', normalizedEvent);

    this.log(`Emitted normalized event: ${normalizedEvent.eventType}`);
  }

  /**
   * Handle activity status change events
   */
  private async handleActivityStatusChange(
    payload: InstrumentActivityStatusChange,
    controllerId: string
  ): Promise<void> {
    this.log(
      `Activity status change: ${payload.activityId} - ${payload.activityStatus} (${payload.progress || 0}%)`
    );

    // Update correlation store
    await this.correlationStore.updateActivityStatus(
      payload.activityId,
      payload.activityStatus as ActivityStatus
    );

    // Build full event object for subscribers
    const fullEvent: IntersectEvent = {
      eventType: 'activity.status_change',
      controllerId,
      timestamp: new Date(),
      payload,
    };

    // Emit full event for specific handlers
    this.emitter.emit('activity.status_change', fullEvent);

    // Map to normalized ADAM event
    const normalizedEvent = this.mapper.mapActivityStatusToAdamEvent(payload, controllerId);

    // Emit normalized event
    this.emitter.emit('adam.event', normalizedEvent);

    // If activity is completed, emit additional completion event
    if (payload.activityStatus === 'completed') {
      this.emitter.emit('activity.completed', fullEvent);
    }

    // If activity failed, emit failure event for alerting
    if (payload.activityStatus === 'failed') {
      this.emitter.emit('activity.failed', fullEvent);
    }

    this.log(`Emitted normalized event: ${normalizedEvent.eventType}`);
  }

  /**
   * Logging helper
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(`[IntersectEventBridge] ${message}`);
    }
  }
}

/**
 * Event bridge with workflow integration
 *
 * Extends base event bridge to trigger ADAM workflows on certain events
 */
export class WorkflowIntegratedEventBridge extends IntersectEventBridge {
  private workflowTriggers: Map<string, (event: NormalizedAdamEvent) => Promise<void>> = new Map();

  /**
   * Register a workflow trigger for a specific event pattern
   */
  registerWorkflowTrigger(
    eventPattern: string,
    trigger: (event: NormalizedAdamEvent) => Promise<void>
  ): void {
    this.workflowTriggers.set(eventPattern, trigger);

    // Subscribe to normalized events and check pattern
    this.onNormalizedEvent(async (event) => {
      if (this.matchesPattern(event.eventType, eventPattern)) {
        await trigger(event);
      }
    });
  }

  /**
   * Check if event type matches pattern
   */
  private matchesPattern(eventType: string, pattern: string): boolean {
    // Support wildcards: experiment.* matches experiment.completed, etc.
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return eventType.startsWith(prefix);
    }
    return eventType === pattern;
  }
}

/**
 * Factory function to create event bridge
 */
export function createEventBridge(
  correlationStore: ICorrelationStore,
  config: EventBridgeConfig = {}
): IIntersectEventBridge {
  return new IntersectEventBridge(correlationStore, config);
}

/**
 * Factory function to create workflow-integrated event bridge
 */
export function createWorkflowEventBridge(
  correlationStore: ICorrelationStore,
  config: EventBridgeConfig = {}
): WorkflowIntegratedEventBridge {
  return new WorkflowIntegratedEventBridge(correlationStore, config);
}
