import { connect, NatsConnection, JetStreamClient, JetStreamManager, StringCodec, consumerOpts, RetentionPolicy, StorageType, createInbox } from 'nats';
import { logger } from '../utils/logger';

let natsConnection: NatsConnection | null = null;
let jetStream: JetStreamClient | null = null;
let jsm: JetStreamManager | null = null;
const sc = StringCodec();

// Required streams for the platform
const REQUIRED_STREAMS = [
  { name: 'EXPERIMENTS', subjects: ['EXPERIMENTS.>'] },
  { name: 'HARDWARE', subjects: ['HARDWARE.>'] },
  { name: 'AGENTS', subjects: ['AGENTS.>'] },
];

async function ensureStreamsExist() {
  if (!jsm) return;

  for (const stream of REQUIRED_STREAMS) {
    try {
      await jsm.streams.info(stream.name);
      logger.info(`Stream ${stream.name} exists`);
    } catch {
      // Stream doesn't exist, create it
      try {
        await jsm.streams.add({
          name: stream.name,
          subjects: stream.subjects,
          retention: RetentionPolicy.Limits,
          storage: StorageType.Memory,
          max_msgs: 10000,
          max_age: 24 * 60 * 60 * 1e9, // 24 hours in nanoseconds
        });
        logger.info(`Created stream: ${stream.name}`);
      } catch (createError) {
        logger.error(`Failed to create stream ${stream.name}:`, createError);
      }
    }
  }
}

export async function connectNATS() {
  try {
    natsConnection = await connect({
      servers: process.env.NATS_URL || 'nats://localhost:4222',
    });

    jetStream = natsConnection.jetstream();
    jsm = await natsConnection.jetstreamManager();

    // Ensure required streams exist
    await ensureStreamsExist();

    logger.info('NATS connection established');

    // Handle connection events
    (async () => {
      for await (const status of natsConnection!.status()) {
        logger.info(`NATS connection status: ${status.type}`);
      }
    })();
  } catch (error) {
    logger.error('NATS connection failed:', error);
    throw error;
  }
}

export async function publishEvent(
  stream: string,
  subject: string,
  data: any
): Promise<void> {
  if (!jetStream) {
    throw new Error('NATS JetStream not initialized');
  }

  try {
    const js = jetStream;
    await js.publish(`${stream}.${subject}`, sc.encode(JSON.stringify(data)));
    logger.debug(`Published event: ${stream}.${subject}`);
  } catch (error) {
    logger.error(`Failed to publish event ${stream}.${subject}:`, error);
    throw error;
  }
}

export async function subscribeToEvents(
  stream: string,
  subject: string,
  handler: (data: any) => void | Promise<void>
): Promise<void> {
  if (!jetStream) {
    throw new Error('NATS JetStream not initialized');
  }

  try {
    const js = jetStream;
    const opts = consumerOpts();
    // Replace dots, asterisks, and other invalid characters for durable names
    const durableName = `api-gateway-${stream}-${subject}`.replace(/[.*>]/g, '-');
    opts.durable(durableName);
    opts.manualAck();
    opts.deliverTo(createInbox());
    const subscription = await js.subscribe(`${stream}.${subject}`, opts);

    (async () => {
      for await (const message of subscription) {
        try {
          const data = JSON.parse(sc.decode(message.data));
          await handler(data);
          message.ack();
        } catch (error) {
          logger.error(`Error processing message from ${stream}.${subject}:`, error);
          message.nak();
        }
      }
    })();

    logger.info(`Subscribed to: ${stream}.${subject}`);
  } catch (error) {
    logger.error(`Failed to subscribe to ${stream}.${subject}:`, error);
    throw error;
  }
}

export function getNatsConnection(): NatsConnection | null {
  return natsConnection;
}
