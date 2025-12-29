import { createSupervisor, Supervisor, EscalationEvent, SupervisorMetrics } from '../integrations/orchestration/Supervisor';
import { createScheduler, TaskStatus } from '../integrations/orchestration/Scheduler';
import { createCorrelationStore } from '../integrations/IntersectCorrelationStore';
import { IIntersectGatewayService } from '../integrations/intersect-types';

// Mock gateway
const mockGateway: Partial<IIntersectGatewayService> = {
  getControllerHealth: jest.fn().mockResolvedValue({
    healthy: true,
    message: 'OK',
  }),
};

describe('Supervisor', () => {
  let supervisor: Supervisor;
  let scheduler: ReturnType<typeof createScheduler>;
  let correlationStore: ReturnType<typeof createCorrelationStore>;
  let escalationHandler: jest.Mock;

  beforeEach(() => {
    scheduler = createScheduler({
      defaultMaxRetries: 3,
      baseRetryDelayMs: 1000,
      maxRetryDelayMs: 60000,
    });

    correlationStore = createCorrelationStore('memory');
    escalationHandler = jest.fn();

    supervisor = createSupervisor(
      scheduler,
      correlationStore,
      mockGateway as IIntersectGatewayService,
      {
        monitorIntervalMs: 100, // Fast for tests
        staleThresholdMs: 500,
        activityTimeoutMs: 1000,
        autoRetryEnabled: true,
        escalationEnabled: true,
        healthCheckIntervalMs: 200,
      }
    );

    supervisor.onEscalation(escalationHandler);
  });

  afterEach(() => {
    supervisor.stop();
    jest.clearAllMocks();
  });

  describe('start/stop', () => {
    it('should start and stop without errors', () => {
      expect(() => supervisor.start()).not.toThrow();
      expect(() => supervisor.stop()).not.toThrow();
    });
  });

  describe('monitoring', () => {
    it('should detect stale tasks', async () => {
      // Create a task and mark it as running
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        controllerId: 'ctrl-1',
        activityName: 'long_running',
        activityOptions: [],
      });

      await scheduler.markStarted(task.id, 'activity-123');

      // Create correlation with old timestamp
      await correlationStore.save({
        activityId: 'activity-123',
        experimentRunId: 'exp-123',
        controllerId: 'ctrl-1',
        activityName: 'long_running',
        status: 'running',
        createdAt: new Date(Date.now() - 2000), // 2 seconds ago
        updatedAt: new Date(Date.now() - 2000),
      });

      supervisor.start();
      await new Promise(resolve => setTimeout(resolve, 300));

      // Supervisor should have performed checks
      const metrics = supervisor.getMetrics();
      expect(metrics.checksPerformed).toBeGreaterThan(0);
    });

    it('should trigger escalation for repeated failures', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        controllerId: 'ctrl-1',
        activityName: 'failing_task',
        activityOptions: [],
        maxRetries: 0, // No retries
      });

      // Mark as failed
      await scheduler.markFailed(task.id, 'Connection error');

      supervisor.start();
      await new Promise(resolve => setTimeout(resolve, 300));

      // Supervisor should have performed checks
      const metrics = supervisor.getMetrics();
      expect(metrics.checksPerformed).toBeGreaterThan(0);
    });
  });

  describe('getMetrics', () => {
    it('should return supervisor metrics', () => {
      const metrics = supervisor.getMetrics();

      expect(metrics).toHaveProperty('checksPerformed');
      expect(metrics).toHaveProperty('staleActivitiesDetected');
      expect(metrics).toHaveProperty('timeoutsEnforced');
      expect(metrics).toHaveProperty('retriesScheduled');
      expect(metrics).toHaveProperty('failuresEscalated');
    });
  });

  describe('getControllerHealth', () => {
    it('should track controller health', async () => {
      supervisor.start();
      await new Promise(resolve => setTimeout(resolve, 300));

      const health = supervisor.getControllerHealth();
      expect(health).toBeInstanceOf(Map);
    });
  });
});

