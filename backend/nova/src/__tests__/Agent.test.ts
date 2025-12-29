import { createAgent, Agent, AgentMetrics } from '../integrations/orchestration/Agent';
import { createScheduler, TaskStatus } from '../integrations/orchestration/Scheduler';
import { createCorrelationStore } from '../integrations/IntersectCorrelationStore';
import {
  IIntersectGatewayService,
  IIntersectEventBridge,
} from '../integrations/intersect-types';

// Mock dependencies
const mockGateway: Partial<IIntersectGatewayService> = {
  startActivity: jest.fn().mockResolvedValue({
    activityId: 'activity-123',
    status: 'submitted',
  }),
  getControllerHealth: jest.fn().mockResolvedValue({
    healthy: true,
    message: 'OK',
  }),
};

const mockEventBridge: Partial<IIntersectEventBridge> = {
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  isRunning: jest.fn().mockReturnValue(false),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
};

describe('Agent', () => {
  let agent: Agent;
  let scheduler: ReturnType<typeof createScheduler>;
  let correlationStore: ReturnType<typeof createCorrelationStore>;

  beforeEach(() => {
    scheduler = createScheduler({
      defaultMaxRetries: 3,
      baseRetryDelayMs: 1000,
      maxRetryDelayMs: 60000,
    });

    correlationStore = createCorrelationStore('memory');

    agent = createAgent(
      scheduler,
      correlationStore,
      mockGateway as IIntersectGatewayService,
      mockEventBridge as IIntersectEventBridge,
      {
        pollIntervalMs: 100, // Fast polling for tests
        maxConcurrent: 2,
        agentId: 'test-agent',
        verbose: false,
      }
    );
  });

  afterEach(() => {
    agent.stop();
    jest.clearAllMocks();
  });

  describe('start/stop', () => {
    it('should start and stop without errors', () => {
      expect(() => agent.start()).not.toThrow();
      expect(() => agent.stop()).not.toThrow();
    });

    it('should not start twice', () => {
      agent.start();
      agent.start(); // Should be a no-op
      agent.stop();
    });
  });

  describe('processTask', () => {
    it('should process a scheduled task', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        controllerId: 'ctrl-1',
        activityName: 'print_sample',
        activityOptions: [{ key: 'temperature', value: '200' }],
      });

      // Start agent to process the task
      agent.start();

      // Wait for task to be picked up
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify gateway was called
      expect(mockGateway.startActivity).toHaveBeenCalled();

      // Check task status changed
      const updatedTask = await scheduler.getTask(task.id);
      expect(updatedTask?.status).toBe('running' as TaskStatus);
    });

    it('should respect maxConcurrent limit', async () => {
      // Schedule 5 tasks
      for (let i = 0; i < 5; i++) {
        await scheduler.scheduleTask({
          experimentRunId: 'exp-123',
          controllerId: 'ctrl-1',
          activityName: `task_${i}`,
          activityOptions: [],
        });
      }

      agent.start();
      await new Promise(resolve => setTimeout(resolve, 200));

      const metrics = agent.getMetrics();
      // Should not exceed maxConcurrent (2)
      expect(metrics.currentlyProcessing).toBeLessThanOrEqual(2);
    });
  });

  describe('getMetrics', () => {
    it('should return agent metrics', () => {
      const metrics = agent.getMetrics();

      expect(metrics).toHaveProperty('agentId');
      expect(metrics).toHaveProperty('tasksProcessed');
      expect(metrics).toHaveProperty('tasksSucceeded');
      expect(metrics).toHaveProperty('tasksFailed');
      expect(metrics).toHaveProperty('currentlyProcessing');
    });

    it('should track processing count', async () => {
      await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        controllerId: 'ctrl-1',
        activityName: 'test',
        activityOptions: [],
      });

      agent.start();
      await new Promise(resolve => setTimeout(resolve, 200));

      const metrics = agent.getMetrics();
      expect(metrics.startedAt).toBeDefined();
    });
  });
});

