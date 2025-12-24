import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger';
import { subscribeToEvents } from '../messaging/nats';

interface WebSocketClient extends WebSocket {
  id: string;
  subscriptions: Set<string>;
}

const clients = new Map<string, WebSocketClient>();

export function initializeWebSocket(wss: WebSocketServer) {
  // Subscribe to NATS events and broadcast to WebSocket clients
  setupEventBroadcasting();

  wss.on('connection', (ws: WebSocket) => {
    const client = ws as WebSocketClient;
    client.id = generateClientId();
    client.subscriptions = new Set();

    clients.set(client.id, client);
    logger.info(`WebSocket client connected: ${client.id}`);

    // Send welcome message
    client.send(JSON.stringify({
      type: 'connected',
      clientId: client.id,
      message: 'Connected to ADAM Platform',
    }));

    // Handle messages from client
    client.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        handleClientMessage(client, data);
      } catch (error) {
        logger.error('Error parsing WebSocket message:', error);
        client.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        }));
      }
    });

    // Handle client disconnect
    client.on('close', () => {
      clients.delete(client.id);
      logger.info(`WebSocket client disconnected: ${client.id}`);
    });

    // Handle errors
    client.on('error', (error) => {
      logger.error(`WebSocket error for client ${client.id}:`, error);
    });
  });
}

function handleClientMessage(client: WebSocketClient, data: any) {
  const { type, payload } = data;

  switch (type) {
    case 'subscribe':
      handleSubscribe(client, payload);
      break;
    case 'unsubscribe':
      handleUnsubscribe(client, payload);
      break;
    case 'ping':
      client.send(JSON.stringify({ type: 'pong' }));
      break;
    default:
      logger.warn(`Unknown message type: ${type}`);
  }
}

function handleSubscribe(client: WebSocketClient, payload: any) {
  const { topic } = payload;

  if (!topic) {
    client.send(JSON.stringify({
      type: 'error',
      message: 'Topic is required for subscription',
    }));
    return;
  }

  client.subscriptions.add(topic);
  logger.info(`Client ${client.id} subscribed to: ${topic}`);

  client.send(JSON.stringify({
    type: 'subscribed',
    topic,
  }));
}

function handleUnsubscribe(client: WebSocketClient, payload: any) {
  const { topic } = payload;

  if (!topic) {
    client.send(JSON.stringify({
      type: 'error',
      message: 'Topic is required for unsubscription',
    }));
    return;
  }

  client.subscriptions.delete(topic);
  logger.info(`Client ${client.id} unsubscribed from: ${topic}`);

  client.send(JSON.stringify({
    type: 'unsubscribed',
    topic,
  }));
}

function setupEventBroadcasting() {
  // Subscribe to experiment events
  subscribeToEvents('EXPERIMENTS', '*', (data) => {
    broadcast('experiments', data);
  });

  // Subscribe to hardware events
  subscribeToEvents('HARDWARE', '*', (data) => {
    broadcast('hardware', data);
  });

  // Subscribe to agent events
  subscribeToEvents('AGENTS', '*', (data) => {
    broadcast('agents', data);
  });
}

function broadcast(topic: string, data: any) {
  const message = JSON.stringify({
    type: 'event',
    topic,
    data,
  });

  clients.forEach((client) => {
    if (client.subscriptions.has(topic) || client.subscriptions.has('*')) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  });
}

function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export { broadcast };
