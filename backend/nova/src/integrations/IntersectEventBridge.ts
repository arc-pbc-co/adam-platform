/**
 * INTERSECT Event Bridge for Nova
 *
 * Handles event communication between Nova and INTERSECT controllers.
 * Can connect to NATS JetStream or work in standalone mode for testing.
 */

import { connect, NatsConnection, JetStreamClient, StringCodec, consumerOpts, createInbox } from 'nats';
import {
  IIntersectEventBridge,
  NormalizedAdamEvent,
  EventHandler,
  EventBridgeConfig,
} from './intersect-types';

/**
 * NATS-based Event Bridge implementation
 */
export class NovaIntersectEventBridge implements IIntersectEventBridge {
  private nats?: NatsConnection;
  private jetstream?: JetStreamClient;
  private handlers: Set<EventHandler> = new Set();
  private running = false;
  private sc = StringCodec();
  private config: EventBridgeConfig;

  constructor(config: EventBridgeConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.running) return;

    try {
      this.nats = await connect({
        servers: this.config.natsUrl,
      });
      this.jetstream = this.nats.jetstream();

      // Subscribe to INTERSECT events
      await this.subscribeToIntersectEvents();

      this.running = true;
      console.log('[IntersectEventBridge] Started, connected to NATS');
    } catch (error) {
      console.error('[IntersectEventBridge] Failed to start:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.running) return;

    if (this.nats) {
      await this.nats.drain();
      this.nats = undefined;
      this.jetstream = undefined;
    }

    this.running = false;
    console.log('[IntersectEventBridge] Stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  subscribe(handler: EventHandler): void {
    this.handlers.add(handler);
  }

  unsubscribe(handler: EventHandler): void {
    this.handlers.delete(handler);
  }

  /**
   * Emit an event to all handlers (for testing or local events)
   */
  async emit(event: NormalizedAdamEvent): Promise<void> {
    for (const handler of this.handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error('[IntersectEventBridge] Handler error:', error);
      }
    }
  }

  private async subscribeToIntersectEvents(): Promise<void> {
    if (!this.jetstream) return;

    const subjects = [
      'INTERSECT.activity.status_change',
      'INTERSECT.activity.progress',
      'INTERSECT.activity.data_ready',
      'INTERSECT.action.completion',
    ];

    for (const subject of subjects) {
      try {
        const opts = consumerOpts();
        opts.durable(`nova-${subject.replace(/\./g, '-')}`);
        opts.manualAck();
        opts.deliverTo(createInbox());

        const sub = await this.jetstream.subscribe(subject, opts);

        (async () => {
          for await (const msg of sub) {
            try {
              const rawEvent = JSON.parse(this.sc.decode(msg.data));
              const normalizedEvent = this.normalizeEvent(rawEvent, subject);
              await this.emit(normalizedEvent);
              msg.ack();
            } catch (error) {
              console.error(`[IntersectEventBridge] Error processing ${subject}:`, error);
              msg.nak();
            }
          }
        })();
      } catch (error) {
        console.warn(`[IntersectEventBridge] Could not subscribe to ${subject}:`, error);
      }
    }
  }

  private normalizeEvent(raw: any, subject: string): NormalizedAdamEvent {
    return {
      eventType: subject,
      experimentRunId: raw.correlation?.experimentRunId || raw.experimentRunId || '',
      campaignId: raw.correlation?.campaignId || raw.campaignId,
      timestamp: new Date(raw.timestamp || Date.now()),
      source: 'intersect',
      data: {
        activityId: raw.activityId,
        actionName: raw.actionName,
        status: raw.activityStatus || raw.actionStatus || raw.status,
        progress: raw.progress,
        message: raw.statusMsg || raw.message,
        error: raw.errorMsg || raw.error,
        dataProducts: raw.products || raw.dataProducts,
      },
    };
  }
}

/**
 * Standalone Event Bridge for testing (no NATS required)
 */
export class StandaloneEventBridge implements IIntersectEventBridge {
  private handlers: Set<EventHandler> = new Set();
  private running = false;

  async start(): Promise<void> {
    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  subscribe(handler: EventHandler): void {
    this.handlers.add(handler);
  }

  unsubscribe(handler: EventHandler): void {
    this.handlers.delete(handler);
  }

  /**
   * Manually emit an event (for testing)
   */
  async emit(event: NormalizedAdamEvent): Promise<void> {
    for (const handler of this.handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error('[StandaloneEventBridge] Handler error:', error);
      }
    }
  }
}

/**
 * Factory function
 */
export function createEventBridge(config?: EventBridgeConfig): IIntersectEventBridge {
  if (config?.natsUrl) {
    return new NovaIntersectEventBridge(config);
  }
  return new StandaloneEventBridge();
}

