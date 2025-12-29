// Jest setup file
import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.POSTGRES_HOST = 'localhost';
process.env.TIMESCALE_HOST = 'localhost';
process.env.NATS_URL = 'nats://localhost:4222';
process.env.INTERSECT_ENABLED = 'false';

// Mock logger to prevent console spam during tests
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Global test timeout
jest.setTimeout(10000);

