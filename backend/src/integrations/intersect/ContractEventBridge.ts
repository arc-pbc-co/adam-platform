/**
 * Contract-Compliant ADAM Event Bridge
 *
 * Transforms INTERSECT controller events (IntersectEventEnvelope) into
 * ADAM normalized events (AdamIntersectEventEnvelope) that conform to
 * the JSON schema: adam/intersect-event-envelope.v1.json
 *
 * The bridge:
 * 1. Receives IntersectEventEnvelope from controllers
 * 2. Looks up correlation context (campaignId, experimentRunId, traceId)
 * 3. Emits AdamIntersectEventEnvelope to downstream consumers
 */

import {
  IntersectEventEnvelope,
  AdamIntersectEventEnvelope,
  AdamEventCorrelation,
  AdamEventType,
  AdamEventTypeValue,
  InstrumentActionCompletionEvent,
  InstrumentActivityStatusChangeEvent,
  toTimeStamp,
  createAdamEventEnvelope,
} from './contract-types';

// ============================================================================
// Types
// ============================================================================

export interface CorrelationContext {
  campaignId: string;
  experimentRunId: string;
  traceId: string;
  instrumentControllerId?: string;
}

export interface CorrelationLookup {
  /**
   * Look up correlation context by activity ID
   */
  getByActivityId(activityId: string): Promise<CorrelationContext | null>;

  /**
   * Store correlation context for an activity
   */
  setForActivityId(activityId: string, context: CorrelationContext): Promise<void>;
}

export type AdamEventHandler = (event: AdamIntersectEventEnvelope) => Promise<void>;

export interface ContractEventBridgeConfig {
  /** Default correlation for events without activity context */
  defaultCorrelation?: Partial<CorrelationContext>;

  /** Controller ID to include in correlation */
  instrumentControllerId?: string;
}

// ============================================================================
// In-Memory Correlation Lookup
// ============================================================================

export class InMemoryCorrelationLookup implements CorrelationLookup {
  private correlations: Map<string, CorrelationContext> = new Map();

  async getByActivityId(activityId: string): Promise<CorrelationContext | null> {
    return this.correlations.get(activityId) || null;
  }

  async setForActivityId(activityId: string, context: CorrelationContext): Promise<void> {
    this.correlations.set(activityId, context);
  }

  clear(): void {
    this.correlations.clear();
  }
}

// ============================================================================
// Contract Event Bridge
// ============================================================================

export class ContractEventBridge {
  private correlationLookup: CorrelationLookup;
  private config: ContractEventBridgeConfig;
  private handlers: AdamEventHandler[] = [];
  private running: boolean = false;

  constructor(
    correlationLookup: CorrelationLookup,
    config: ContractEventBridgeConfig = {}
  ) {
    this.correlationLookup = correlationLookup;
    this.config = config;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  start(): void {
    this.running = true;
    console.log('[ContractEventBridge] Started');
  }

  stop(): void {
    this.running = false;
    console.log('[ContractEventBridge] Stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  // ============================================================================
  // Event Handler Registration
  // ============================================================================

  /**
   * Register a handler for normalized ADAM events
   */
  onEvent(handler: AdamEventHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Remove all handlers
   */
  clearHandlers(): void {
    this.handlers = [];
  }

  // ============================================================================
  // Correlation Management
  // ============================================================================

  /**
   * Register correlation context for an activity before it starts
   */
  async registerCorrelation(activityId: string, context: CorrelationContext): Promise<void> {
    await this.correlationLookup.setForActivityId(activityId, context);
  }

  // ============================================================================
  // Event Processing
  // ============================================================================

  /**
   * Process an incoming INTERSECT event envelope and emit ADAM normalized event
   *
   * Input schema: IntersectEventEnvelope.schema.json
   * Output schema: adam/intersect-event-envelope.v1.json
   */
  async processEvent(event: IntersectEventEnvelope): Promise<AdamIntersectEventEnvelope | null> {
    if (!this.running) {
      console.warn('[ContractEventBridge] Received event while not running');
      return null;
    }

    // Determine correlation context
    const correlation = await this.resolveCorrelation(event);

    if (!correlation) {
      console.warn('[ContractEventBridge] Could not resolve correlation for event:', event.eventName);
      return null;
    }

    // Transform to ADAM event
    const adamEvent = this.transformToAdamEvent(event, correlation);

    // Emit to handlers
    await this.emitToHandlers(adamEvent);

    return adamEvent;
  }

  /**
   * Resolve correlation context from event data or lookup
   */
  private async resolveCorrelation(event: IntersectEventEnvelope): Promise<AdamEventCorrelation | null> {
    let context: CorrelationContext | null = null;

    // Try to get correlation from activity ID
    if (event.eventName === 'InstrumentActivityStatusChange') {
      const eventData = event.eventData as InstrumentActivityStatusChangeEvent;
      context = await this.correlationLookup.getByActivityId(eventData.activityId);
    }

    // Fall back to default correlation if available
    if (!context && this.config.defaultCorrelation) {
      const defaults = this.config.defaultCorrelation;
      if (defaults.campaignId && defaults.experimentRunId && defaults.traceId) {
        context = {
          campaignId: defaults.campaignId,
          experimentRunId: defaults.experimentRunId,
          traceId: defaults.traceId,
          instrumentControllerId: this.config.instrumentControllerId,
        };
      }
    }

    if (!context) {
      return null;
    }

    // Build AdamEventCorrelation (schema-compliant)
    const correlation: AdamEventCorrelation = {
      campaignId: context.campaignId,
      experimentRunId: context.experimentRunId,
      traceId: context.traceId,
    };

    if (context.instrumentControllerId || this.config.instrumentControllerId) {
      correlation.instrumentControllerId = context.instrumentControllerId || this.config.instrumentControllerId;
    }

    return correlation;
  }

  /**
   * Transform INTERSECT event to ADAM normalized event
   */
  private transformToAdamEvent(
    event: IntersectEventEnvelope,
    correlation: AdamEventCorrelation
  ): AdamIntersectEventEnvelope {
    // Map event name to ADAM event type
    const eventTypeMap: Record<string, AdamEventTypeValue> = {
      'InstrumentActionCompletion': AdamEventType.ACTION_COMPLETION,
      'InstrumentActivityStatusChange': AdamEventType.ACTIVITY_STATUS_CHANGE,
    };

    // Determine occurredAt timestamp
    let occurredAt: string;
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
   * Emit event to all registered handlers
   */
  private async emitToHandlers(event: AdamIntersectEventEnvelope): Promise<void> {
    for (const handler of this.handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error('[ContractEventBridge] Handler error:', error);
      }
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createContractEventBridge(
  correlationLookup?: CorrelationLookup,
  config?: ContractEventBridgeConfig
): ContractEventBridge {
  return new ContractEventBridge(
    correlationLookup || new InMemoryCorrelationLookup(),
    config || {}
  );
}
