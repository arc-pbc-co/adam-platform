import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { metricsMiddleware } from './middleware/metrics';
import routes from './routes';
import { initializeWebSocket } from './websocket';
import { connectDatabase } from './database';
import { connectNATS } from './messaging/nats';
import { connectRedis } from './cache/redis';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3200;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'adam-api-gateway',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// Initialize services
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Connected to PostgreSQL database');

    // Connect to Redis
    await connectRedis();
    logger.info('Connected to Redis cache');

    // Connect to NATS
    await connectNATS();
    logger.info('Connected to NATS messaging system');

    // Initialize WebSocket
    initializeWebSocket(wss);
    logger.info('WebSocket server initialized');

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`🚀 ADAM API Gateway running on port ${PORT}`);
      logger.info(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

startServer();
