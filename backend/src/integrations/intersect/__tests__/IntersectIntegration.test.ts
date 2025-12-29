/**
 * INTERSECT Integration End-to-End Tests
 *
 * These tests validate the full INTERSECT integration flow:
 * 1. Controller registration and discovery
 * 2. Activity lifecycle (start → progress → complete)
 * 3. Event propagation
 * 4. Correlation tracking
 * 5. Error handling and recovery
 */

import {
  InMemoryCorrelationStore,
  DefaultSchemaMapper,
  IntersectGatewayService,
  IntersectEventBridge,
  ActivityStatus,
  IntersectEvent,
  InstrumentController,
  ActionDescription,
  ActivityDescription,
  HealthStatus,
  PerformActionRequest,
  PerformActionResult,
  StartActivityRequest,
  StartActivityResult,
  ActivityStatusResult,
  ActivityDataResult,
  CancelActivityRequest,
  CancelActivityResult,
} from '../index';

// Mock controller for testing
class MockInstrumentController implements InstrumentController {
  readonly controllerId = 'mock-controller';
  readonly controllerName = 'Mock Test Controller';
  readonly controllerType = 'mock';

  private activities: Map<string, { status: ActivityStatus; progress: number }> = new Map();
  private eventCallback?: (event: IntersectEvent) => Promise<void>;
  private actionCounter = 0;
  private activityCounter = 0;

  async healthCheck(): Promise<HealthStatus> {
    return {
      healthy: true,
      status: 'operational',
      components: {
        connection: { healthy: true },
        resources: { healthy: true },
      },
    };
  }

  async listActions() {
    return {
      actionNames: ['test_action', 'validate_config'],
    };
  }

  async getActionDescription(actionName: string): Promise<ActionDescription> {
    return {
      actionName,
      description: `Test action: ${actionName}`,
      version: '1.0.0',
      optionsSchema: { type: 'object' },
      resultSchema: { type: 'object' },
    };
  }

  async performAction(
    actionName: string,
    request: PerformActionRequest
  ): Promise<PerformActionResult> {
    this.actionCounter++;
    return {
      accepted: true,
      actionName,
      status: 'completed',
      result: { success: true, counter: this.actionCounter },
      idempotencyKey: request.idempotencyKey,
    };
  }

  async listActivities() {
    return {
      activityNames: ['test_activity', 'long_running_process'],
    };
  }

  async getActivityDescription(activityName: string): Promise<ActivityDescription> {
    return {
      activityName,
      description: `Test activity: ${activityName}`,
      version: '1.0.0',
      optionsSchema: { type: 'object' },
      dataProductSchemas: [
        {
          name: 'test_output',
          description: 'Test output data',
          contentType: 'application/json',
          schema: { type: 'object' },
        },
      ],
    };
  }

  async startActivity(
    activityName: string,
    request: StartActivityRequest
  ): Promise<StartActivityResult> {
    this.activityCounter++;
    const activityId = `activity_${this.activityCounter}`;

    this.activities.set(activityId, { status: 'started', progress: 0 });

    // Emit start event
    if (this.eventCallback) {
      await this.eventCallback({
        eventType: 'activity.status_change',
        controllerId: this.controllerId,
        timestamp: new Date(),
        payload: {
          activityId,
          activityName,
          activityStatus: 'started',
          correlation: request.correlation,
        },
      });
    }

    // Simulate async progress
    this.simulateProgress(activityId, activityName, request.correlation);

    return {
      activityId,
      activityName,
      status: 'started',
      correlation: request.correlation,
    };
  }

  private async simulateProgress(
    activityId: string,
    activityName: string,
    correlation: any
  ) {
    // Progress updates
    for (let progress = 25; progress <= 100; progress += 25) {
      await new Promise((resolve) => setTimeout(resolve, 50));

      const status = progress >= 100 ? 'completed' : 'running';
      this.activities.set(activityId, { status, progress });

      if (this.eventCallback) {
        await this.eventCallback({
          eventType: 'activity.progress_update',
          controllerId: this.controllerId,
          timestamp: new Date(),
          payload: {
            activityId,
            activityName,
            progress,
            message: `Progress: ${progress}%`,
          },
        });
      }
    }

    // Completion event
    if (this.eventCallback) {
      await this.eventCallback({
        eventType: 'activity.status_change',
        controllerId: this.controllerId,
        timestamp: new Date(),
        payload: {
          activityId,
          activityName,
          activityStatus: 'completed',
          correlation,
          dataProducts: [
            {
              productUuid: `product_${activityId}`,
              productName: 'test_output',
              contentType: 'application/json',
            },
          ],
        },
      });
    }
  }

  async getActivityStatus(activityId: string): Promise<ActivityStatusResult> {
    const activity = this.activities.get(activityId);
    if (!activity) {
      throw new Error(`Unknown activity: ${activityId}`);
    }

    return {
      activityId,
      activityStatus: activity.status as any,
      status: activity.status,
      progress: activity.progress,
    };
  }

  async getActivityData(activityId: string): Promise<ActivityDataResult> {
    const activity = this.activities.get(activityId);
    if (!activity || activity.status !== 'completed') {
      throw new Error(`Activity ${activityId} not completed`);
    }

    return {
      activityId,
      products: [`product_${activityId}`],
      dataProducts: [
        {
          productUuid: `product_${activityId}`,
          productName: 'test_output',
          contentType: 'application/json',
          data: { result: 'success', testValue: 42 },
        },
      ],
    };
  }

  async cancelActivity(
    activityId: string,
    request: CancelActivityRequest
  ): Promise<CancelActivityResult> {
    const activity = this.activities.get(activityId);
    if (!activity) {
      throw new Error(`Unknown activity: ${activityId}`);
    }

    this.activities.set(activityId, { status: 'cancelled', progress: activity.progress });

    return {
      activityId,
      cancelled: true,
      message: `Cancelled: ${request.reason}`,
    };
  }

  setEventCallback(callback: (event: IntersectEvent) => Promise<void>): void {
    this.eventCallback = callback;
  }

  shutdown(): void {
    this.activities.clear();
  }
}

describe('INTERSECT Integration', () => {
  let correlationStore: InMemoryCorrelationStore;
  let schemaMapper: DefaultSchemaMapper;
  let eventBridge: IntersectEventBridge;
  let mockController: MockInstrumentController;

  beforeEach(() => {
    correlationStore = new InMemoryCorrelationStore();
    schemaMapper = new DefaultSchemaMapper();
    mockController = new MockInstrumentController();

    eventBridge = new IntersectEventBridge(
      correlationStore,
      { enableLogging: false }
    );
  });

  afterEach(() => {
    mockController.shutdown();
    eventBridge.stop();
  });

  describe('Controller Health', () => {
    it('should return healthy status', async () => {
      const health = await mockController.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.status).toBe('operational');
      expect(health.components?.connection?.healthy).toBe(true);
    });
  });

  describe('Actions', () => {
    it('should list available actions', async () => {
      const result = await mockController.listActions();

      expect(result.actionNames).toContain('test_action');
      expect(result.actionNames).toContain('validate_config');
    });

    it('should get action description', async () => {
      const desc = await mockController.getActionDescription('test_action');

      expect(desc.actionName).toBe('test_action');
      expect(desc.version).toBe('1.0.0');
      expect(desc.optionsSchema).toBeDefined();
    });

    it('should perform action with idempotency', async () => {
      const request: PerformActionRequest = {
        idempotencyKey: 'test-key-123',
        options: { test: true },
      };

      const result = await mockController.performAction('test_action', request);

      expect(result.status).toBe('completed');
      expect(result.idempotencyKey).toBe('test-key-123');
      expect(result.result?.success).toBe(true);
    });
  });

  describe('Activities', () => {
    it('should list available activities', async () => {
      const result = await mockController.listActivities();

      expect(result.activityNames).toContain('test_activity');
      expect(result.activityNames).toContain('long_running_process');
    });

    it('should get activity description', async () => {
      const desc = await mockController.getActivityDescription('test_activity');

      expect(desc.activityName).toBe('test_activity');
      expect(desc.dataProductSchemas?.length).toBeGreaterThan(0);
    });

    it('should start activity and track progress', async () => {
      const events: IntersectEvent[] = [];
      mockController.setEventCallback(async (event) => {
        events.push(event);
      });

      const request: StartActivityRequest = {
        correlation: {
          experimentRunId: 'exp-123',
          campaignId: 'camp-456',
        },
        options: { testParam: 'value' },
      };

      const result = await mockController.startActivity('test_activity', request);

      expect(result.activityId).toBeDefined();
      expect(result.status).toBe('started');

      // Wait for async progress simulation
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify events were emitted
      expect(events.length).toBeGreaterThan(0);

      const statusChanges = events.filter((e) => e.eventType === 'activity.status_change');
      const progressUpdates = events.filter((e) => e.eventType === 'activity.progress_update');

      expect(statusChanges.length).toBe(2); // started + completed
      expect(progressUpdates.length).toBe(4); // 25, 50, 75, 100
    });

    it('should get activity status', async () => {
      const startResult = await mockController.startActivity('test_activity', {
        correlation: { experimentRunId: 'exp-123' },
        options: {},
      });

      const status = await mockController.getActivityStatus(startResult.activityId);

      expect(status.activityId).toBe(startResult.activityId);
      expect(['started', 'running', 'completed']).toContain(status.status);
    });

    it('should get activity data when completed', async () => {
      mockController.setEventCallback(async () => {});

      const startResult = await mockController.startActivity('test_activity', {
        correlation: { experimentRunId: 'exp-123' },
        options: {},
      });

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 300));

      const data = await mockController.getActivityData(startResult.activityId);

      expect(data.activityId).toBe(startResult.activityId);
      expect(data.dataProducts?.length).toBeGreaterThan(0);
      expect(data.dataProducts?.[0].data?.result).toBe('success');
    });

    it('should cancel activity', async () => {
      const startResult = await mockController.startActivity('test_activity', {
        correlation: { experimentRunId: 'exp-123' },
        options: {},
      });

      const cancelResult = await mockController.cancelActivity(startResult.activityId, {
        reason: 'User requested cancellation',
      });

      expect(cancelResult.cancelled).toBe(true);

      const status = await mockController.getActivityStatus(startResult.activityId);
      expect(status.status).toBe('cancelled');
    });

    it('should throw error for unknown activity', async () => {
      await expect(
        mockController.getActivityStatus('unknown-id')
      ).rejects.toThrow('Unknown activity');
    });
  });

  describe('Correlation Store', () => {
    it('should store and retrieve activity correlations', async () => {
      const correlation = {
        activityId: 'activity-123',
        experimentRunId: 'exp-456',
        campaignId: 'camp-789',
        controllerId: 'mock-controller',
        activityName: 'test_activity',
        status: 'running' as ActivityStatus,
        startTime: new Date(),
      };

      await correlationStore.saveActivityCorrelation(correlation);

      const retrieved = await correlationStore.getActivityCorrelation('activity-123');
      expect(retrieved).toBeDefined();
      expect(retrieved?.experimentRunId).toBe('exp-456');
      expect(retrieved?.campaignId).toBe('camp-789');
    });

    it('should update activity status', async () => {
      const correlation = {
        activityId: 'activity-123',
        experimentRunId: 'exp-456',
        controllerId: 'mock-controller',
        activityName: 'test_activity',
        status: 'running' as ActivityStatus,
        startTime: new Date(),
      };

      await correlationStore.saveActivityCorrelation(correlation);
      await correlationStore.updateActivityStatus('activity-123', 'completed');

      const retrieved = await correlationStore.getActivityCorrelation('activity-123');
      expect(retrieved?.status).toBe('completed');
    });

    it('should query activities by experiment run', async () => {
      await correlationStore.saveActivityCorrelation({
        activityId: 'activity-1',
        experimentRunId: 'exp-123',
        controllerId: 'mock-controller',
        activityName: 'test_activity',
        status: 'completed' as ActivityStatus,
        startTime: new Date(),
      });

      await correlationStore.saveActivityCorrelation({
        activityId: 'activity-2',
        experimentRunId: 'exp-123',
        controllerId: 'mock-controller',
        activityName: 'test_activity',
        status: 'running' as ActivityStatus,
        startTime: new Date(),
      });

      await correlationStore.saveActivityCorrelation({
        activityId: 'activity-3',
        experimentRunId: 'exp-other',
        controllerId: 'mock-controller',
        activityName: 'test_activity',
        status: 'running' as ActivityStatus,
        startTime: new Date(),
      });

      const activities = await correlationStore.getActivitiesByExperimentRun('exp-123');
      expect(activities.length).toBe(2);
    });

    it('should save and retrieve data product mappings', async () => {
      const mapping = {
        productUuid: 'product-123',
        activityId: 'activity-456',
        experimentRunId: 'exp-789',
        productName: 'test_output',
        contentType: 'application/json',
        createdAt: new Date(),
      };

      await correlationStore.saveDataProductMapping(mapping);

      const retrieved = await correlationStore.getDataProductMapping('product-123');
      expect(retrieved).toBeDefined();
      expect(retrieved?.activityId).toBe('activity-456');
    });
  });

  describe('Schema Mapper', () => {
    it('should map ADAM experiment step to INTERSECT activity options', () => {
      const adamStep = {
        id: 'step-1',
        name: 'Print Parts',
        type: 'print_job',
        experimentId: 'exp-123',
        parameters: {
          printerId: 'printer-001',
          layerThickness: 50,
          resolution: 'high',
        },
      };

      const options = schemaMapper.mapAdamStepToActivityOptions(adamStep, 'print_job');

      expect(options.printerId).toBe('printer-001');
      expect(options.parameters?.layerThickness).toBe(50);
    });

    it('should create correlation from ADAM context', () => {
      const adamContext = {
        experimentId: 'exp-123',
        experimentRunId: 'run-456',
        campaignId: 'camp-789',
        userId: 'user-001',
      };

      const correlation = schemaMapper.createCorrelation(adamContext);

      expect(correlation.experimentRunId).toBe('run-456');
      expect(correlation.campaignId).toBe('camp-789');
      expect(correlation.metadata?.experimentId).toBe('exp-123');
      expect(correlation.metadata?.userId).toBe('user-001');
    });

    it('should map INTERSECT event to ADAM event', () => {
      const intersectEvent: IntersectEvent = {
        eventType: 'activity.status_change',
        controllerId: 'mock-controller',
        timestamp: new Date(),
        payload: {
          activityId: 'activity-123',
          activityName: 'print_job',
          activityStatus: 'completed',
          correlation: {
            experimentRunId: 'run-456',
            campaignId: 'camp-789',
          },
          dataProducts: [
            {
              productUuid: 'product-001',
              productName: 'print_results',
              contentType: 'application/json',
            },
          ],
        },
      };

      const adamEvent = schemaMapper.mapIntersectEventToAdam(intersectEvent);

      expect(adamEvent.source).toBe('intersect');
      expect(adamEvent.type).toBe('experiment.step.completed');
      expect(adamEvent.experimentRunId).toBe('run-456');
      expect(adamEvent.data.activityId).toBe('activity-123');
    });
  });

  describe('Event Bridge', () => {
    it('should subscribe to events and invoke handlers', async () => {
      const receivedEvents: IntersectEvent[] = [];

      eventBridge.subscribe('activity.status_change', async (event) => {
        receivedEvents.push(event);
      });

      eventBridge.start();

      const testEvent: IntersectEvent = {
        eventType: 'activity.status_change',
        controllerId: 'mock-controller',
        timestamp: new Date(),
        payload: {
          activityId: 'activity-123',
          activityStatus: 'completed',
        },
      };

      await eventBridge.handleIncomingEvent(testEvent);

      expect(receivedEvents.length).toBe(1);
      expect((receivedEvents[0].payload as any).activityId).toBe('activity-123');
    });

    it('should update correlation store on status change', async () => {
      // First create a correlation
      await correlationStore.saveActivityCorrelation({
        activityId: 'activity-123',
        experimentRunId: 'exp-456',
        controllerId: 'mock-controller',
        activityName: 'test_activity',
        status: 'running' as ActivityStatus,
        startTime: new Date(),
      });

      eventBridge.start();

      const statusEvent: IntersectEvent = {
        eventType: 'activity.status_change',
        controllerId: 'mock-controller',
        timestamp: new Date(),
        payload: {
          activityId: 'activity-123',
          activityStatus: 'completed',
          correlation: {
            experimentRunId: 'exp-456',
          },
        },
      };

      await eventBridge.handleIncomingEvent(statusEvent);

      const correlation = await correlationStore.getActivityCorrelation('activity-123');
      expect(correlation?.status).toBe('completed');
    });

    it('should handle multiple event types', async () => {
      const statusEvents: IntersectEvent[] = [];
      const progressEvents: IntersectEvent[] = [];

      eventBridge.subscribe('activity.status_change', async (event) => {
        statusEvents.push(event);
      });

      eventBridge.subscribe('activity.progress_update', async (event) => {
        progressEvents.push(event);
      });

      eventBridge.start();

      await eventBridge.handleIncomingEvent({
        eventType: 'activity.status_change',
        controllerId: 'mock-controller',
        timestamp: new Date(),
        payload: { activityId: '1', activityStatus: 'started' },
      });

      await eventBridge.handleIncomingEvent({
        eventType: 'activity.progress_update',
        controllerId: 'mock-controller',
        timestamp: new Date(),
        payload: { activityId: '1', progress: 50 },
      });

      await eventBridge.handleIncomingEvent({
        eventType: 'activity.status_change',
        controllerId: 'mock-controller',
        timestamp: new Date(),
        payload: { activityId: '1', activityStatus: 'completed' },
      });

      expect(statusEvents.length).toBe(2);
      expect(progressEvents.length).toBe(1);
    });
  });

  describe('Full Integration Flow', () => {
    it('should complete full experiment workflow', async () => {
      const events: IntersectEvent[] = [];

      // Set up event tracking
      mockController.setEventCallback(async (event) => {
        events.push(event);
        await eventBridge.handleIncomingEvent(event);
      });

      eventBridge.start();

      // 1. Start an activity (representing an experiment step)
      const startResult = await mockController.startActivity('test_activity', {
        correlation: {
          experimentRunId: 'exp-integration-test',
          campaignId: 'camp-001',
        },
        options: { testParam: 'integration' },
      });

      expect(startResult.activityId).toBeDefined();

      // 2. Save correlation
      await correlationStore.saveActivityCorrelation({
        activityId: startResult.activityId,
        experimentRunId: 'exp-integration-test',
        campaignId: 'camp-001',
        controllerId: mockController.controllerId,
        activityName: 'test_activity',
        status: 'started',
        startTime: new Date(),
      });

      // 3. Wait for async completion
      await new Promise((resolve) => setTimeout(resolve, 400));

      // 4. Verify final state
      const correlation = await correlationStore.getActivityCorrelation(startResult.activityId);
      expect(correlation?.status).toBe('completed');

      // 5. Get result data
      const data = await mockController.getActivityData(startResult.activityId);
      expect(data.dataProducts?.[0].data?.result).toBe('success');

      // 6. Verify events were properly tracked
      const completionEvents = events.filter(
        (e) =>
          e.eventType === 'activity.status_change' &&
          (e.payload as any).activityStatus === 'completed'
      );
      expect(completionEvents.length).toBe(1);
    });
  });
});

// =============================================================================
// Additional Integration Tests
// =============================================================================

import {
  InMemoryScheduler,
  TaskStatus,
  TaskPriority,
  ScheduledTask,
} from '../orchestration/Scheduler';
import { Agent, AgentConfig } from '../orchestration/Agent';
import { Supervisor, SupervisorConfig, EscalationEvent } from '../orchestration/Supervisor';
import { IIntersectGatewayService } from '../gateway/IntersectGatewayService';

describe('Scheduler', () => {
  let scheduler: InMemoryScheduler;

  beforeEach(() => {
    scheduler = new InMemoryScheduler({
      defaultMaxRetries: 3,
      baseRetryDelayMs: 100,
      maxRetryDelayMs: 1000,
    });
  });

  describe('Task Scheduling', () => {
    it('should schedule a new task with default values', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        campaignId: 'camp-456',
        controllerId: 'controller-1',
        activityName: 'test_activity',
        activityOptions: [{ key: 'param1', value: 'value1' }],
      });

      expect(task.id).toBeDefined();
      expect(task.status).toBe('pending');
      expect(task.priority).toBe('normal');
      expect(task.retryCount).toBe(0);
      expect(task.maxRetries).toBe(3);
    });

    it('should schedule a task with custom priority', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        campaignId: 'camp-456',
        controllerId: 'controller-1',
        activityName: 'critical_activity',
        activityOptions: [],
        priority: 'critical',
      });

      expect(task.priority).toBe('critical');
    });

    it('should schedule a task with deadline', async () => {
      const deadline = new Date(Date.now() + 60000);
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        campaignId: 'camp-456',
        controllerId: 'controller-1',
        activityName: 'timed_activity',
        activityOptions: [],
        deadline,
      });

      expect(task.deadline).toEqual(deadline);
    });
  });

  describe('Priority Queuing', () => {
    it('should return tasks in priority order', async () => {
      await scheduler.scheduleTask({
        experimentRunId: 'exp-1',
        campaignId: 'camp-1',
        controllerId: 'c1',
        activityName: 'low_priority',
        activityOptions: [],
        priority: 'low',
      });

      await scheduler.scheduleTask({
        experimentRunId: 'exp-2',
        campaignId: 'camp-2',
        controllerId: 'c1',
        activityName: 'critical_priority',
        activityOptions: [],
        priority: 'critical',
      });

      await scheduler.scheduleTask({
        experimentRunId: 'exp-3',
        campaignId: 'camp-3',
        controllerId: 'c1',
        activityName: 'normal_priority',
        activityOptions: [],
        priority: 'normal',
      });

      const readyTasks = await scheduler.getReadyTasks();

      expect(readyTasks[0].priority).toBe('critical');
      expect(readyTasks[1].priority).toBe('normal');
      expect(readyTasks[2].priority).toBe('low');
    });

    it('should sort same-priority tasks by scheduled time', async () => {
      const task1 = await scheduler.scheduleTask({
        experimentRunId: 'exp-1',
        campaignId: 'camp-1',
        controllerId: 'c1',
        activityName: 'first_task',
        activityOptions: [],
      });

      await new Promise((r) => setTimeout(r, 10));

      const task2 = await scheduler.scheduleTask({
        experimentRunId: 'exp-2',
        campaignId: 'camp-2',
        controllerId: 'c1',
        activityName: 'second_task',
        activityOptions: [],
      });

      const readyTasks = await scheduler.getReadyTasks();

      expect(readyTasks[0].id).toBe(task1.id);
      expect(readyTasks[1].id).toBe(task2.id);
    });
  });

  describe('Task Lifecycle', () => {
    it('should mark task as started with activity ID', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        campaignId: 'camp-456',
        controllerId: 'c1',
        activityName: 'test',
        activityOptions: [],
      });

      const started = await scheduler.markStarted(task.id, 'activity-xyz');

      expect(started.status).toBe('running');
      expect(started.activityId).toBe('activity-xyz');
      expect(started.startedAt).toBeDefined();
    });

    it('should mark task as completed', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        campaignId: 'camp-456',
        controllerId: 'c1',
        activityName: 'test',
        activityOptions: [],
      });

      await scheduler.markStarted(task.id, 'activity-xyz');
      const completed = await scheduler.markCompleted(task.id);

      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeDefined();
    });

    it('should mark task as failed with error', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        campaignId: 'camp-456',
        controllerId: 'c1',
        activityName: 'test',
        activityOptions: [],
      });

      await scheduler.markStarted(task.id, 'activity-xyz');
      const failed = await scheduler.markFailed(task.id, 'Connection timeout');

      expect(failed.status).toBe('failed');
      expect(failed.error).toBe('Connection timeout');
    });

    it('should cancel a pending task', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        campaignId: 'camp-456',
        controllerId: 'c1',
        activityName: 'test',
        activityOptions: [],
      });

      const cancelled = await scheduler.cancelTask(task.id, 'User requested');

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.error).toBe('User requested');
    });

    it('should throw when cancelling completed task', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        campaignId: 'camp-456',
        controllerId: 'c1',
        activityName: 'test',
        activityOptions: [],
      });

      await scheduler.markStarted(task.id, 'activity-xyz');
      await scheduler.markCompleted(task.id);

      await expect(scheduler.cancelTask(task.id, 'Too late')).rejects.toThrow(
        'Cannot cancel completed task'
      );
    });
  });

  describe('Retry Logic', () => {
    it('should schedule retry with exponential backoff', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        campaignId: 'camp-456',
        controllerId: 'c1',
        activityName: 'test',
        activityOptions: [],
        maxRetries: 3,
      });

      await scheduler.markStarted(task.id, 'activity-1');
      await scheduler.markFailed(task.id, 'First failure');

      const retried = await scheduler.scheduleRetry(task.id);

      expect(retried).not.toBeNull();
      expect(retried?.retryCount).toBe(1);
      expect(retried?.status).toBe('scheduled');
      expect(retried?.nextRetry).toBeDefined();
    });

    it('should return null when max retries exceeded', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        campaignId: 'camp-456',
        controllerId: 'c1',
        activityName: 'test',
        activityOptions: [],
        maxRetries: 1,
      });

      await scheduler.markStarted(task.id, 'activity-1');
      await scheduler.markFailed(task.id, 'First failure');
      await scheduler.scheduleRetry(task.id);

      await scheduler.markStarted(task.id, 'activity-2');
      await scheduler.markFailed(task.id, 'Second failure');

      const result = await scheduler.scheduleRetry(task.id);
      expect(result).toBeNull();
    });
  });

  describe('Task Queries', () => {
    beforeEach(async () => {
      await scheduler.scheduleTask({
        experimentRunId: 'exp-1',
        campaignId: 'camp-1',
        controllerId: 'c1',
        activityName: 'activity_a',
        activityOptions: [],
      });

      const task2 = await scheduler.scheduleTask({
        experimentRunId: 'exp-1',
        campaignId: 'camp-1',
        controllerId: 'c2',
        activityName: 'activity_b',
        activityOptions: [],
      });
      await scheduler.markStarted(task2.id, 'act-2');

      const task3 = await scheduler.scheduleTask({
        experimentRunId: 'exp-2',
        campaignId: 'camp-2',
        controllerId: 'c1',
        activityName: 'activity_c',
        activityOptions: [],
      });
      await scheduler.markStarted(task3.id, 'act-3');
      await scheduler.markCompleted(task3.id);
    });

    it('should query tasks by status', async () => {
      const runningTasks = await scheduler.queryTasks({ status: 'running' });
      expect(runningTasks.length).toBe(1);

      const completedTasks = await scheduler.queryTasks({ status: 'completed' });
      expect(completedTasks.length).toBe(1);
    });

    it('should query tasks by experiment run', async () => {
      const tasks = await scheduler.queryTasks({ experimentRunId: 'exp-1' });
      expect(tasks.length).toBe(2);
    });

    it('should query tasks by controller', async () => {
      const tasks = await scheduler.queryTasks({ controllerId: 'c1' });
      expect(tasks.length).toBe(2);
    });

    it('should get task statistics', async () => {
      const stats = await scheduler.getTaskStats();

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.running).toBe(1);
      expect(stats.completed).toBe(1);
    });
  });

  describe('Deadline Management', () => {
    it('should not return tasks past deadline', async () => {
      const pastDeadline = new Date(Date.now() - 1000);
      await scheduler.scheduleTask({
        experimentRunId: 'exp-1',
        campaignId: 'camp-1',
        controllerId: 'c1',
        activityName: 'expired_task',
        activityOptions: [],
        deadline: pastDeadline,
      });

      const futureDeadline = new Date(Date.now() + 60000);
      await scheduler.scheduleTask({
        experimentRunId: 'exp-2',
        campaignId: 'camp-2',
        controllerId: 'c1',
        activityName: 'valid_task',
        activityOptions: [],
        deadline: futureDeadline,
      });

      const readyTasks = await scheduler.getReadyTasks();
      expect(readyTasks.length).toBe(1);
      expect(readyTasks[0].activityName).toBe('valid_task');
    });
  });
});

// =============================================================================
// Mock Gateway for Agent/Supervisor Tests
// =============================================================================

class MockGatewayService {
  private activityCounter = 0;
  private controllerStatus: Map<string, boolean> = new Map([['c1', true], ['c2', true]]);
  public startActivityCalls: Array<{ controllerId: string; activityName: string }> = [];
  public cancelActivityCalls: Array<{ controllerId: string; activityId: string }> = [];

  async startActivity(params: {
    controllerId: string;
    activityName: string;
    experimentRunId: string;
    campaignId?: string;
    activityOptions?: any[];
    deadline?: Date;
  }) {
    this.startActivityCalls.push({
      controllerId: params.controllerId,
      activityName: params.activityName,
    });
    this.activityCounter++;
    return {
      activityId: `mock-activity-${this.activityCounter}`,
      activityName: params.activityName,
      status: 'started' as const,
    };
  }

  async getActivityStatus(controllerId: string, activityId: string) {
    return {
      activityId,
      activityStatus: 'running' as ActivityStatus,
      progress: 50,
    };
  }

  async getActivityData(controllerId: string, activityId: string) {
    return {
      activityId,
      products: [] as string[],
      dataProducts: [],
    };
  }

  async cancelActivity(controllerId: string, activityId: string, reason: string) {
    this.cancelActivityCalls.push({ controllerId, activityId });
  }

  async listControllers() {
    return [
      {
        controllerId: 'c1',
        controllerName: 'Controller 1',
        controllerType: 'mock',
        endpoint: 'http://localhost:8001',
        status: 'online' as const,
        lastSeen: new Date(),
        capabilities: { actions: [], activities: [] },
      },
      {
        controllerId: 'c2',
        controllerName: 'Controller 2',
        controllerType: 'mock',
        endpoint: 'http://localhost:8002',
        status: 'online' as const,
        lastSeen: new Date(),
        capabilities: { actions: [], activities: [] },
      },
    ];
  }

  async getControllerHealth(controllerId: string) {
    return {
      healthy: this.controllerStatus.get(controllerId) ?? false,
    };
  }

  async performAction() {
    return { accepted: true, actionName: 'test', status: 'completed' };
  }

  async listActions() {
    return [] as string[];
  }

  async listActivities() {
    return [] as string[];
  }

  async executeExperimentPlan() {
    return { activityId: 'test', activityName: 'test', status: 'started' as const };
  }

  setControllerHealth(controllerId: string, healthy: boolean) {
    this.controllerStatus.set(controllerId, healthy);
  }
}

describe('Agent', () => {
  let scheduler: InMemoryScheduler;
  let correlationStore: InMemoryCorrelationStore;
  let mockGateway: MockGatewayService;
  let eventBridge: IntersectEventBridge;
  let agent: Agent;

  beforeEach(() => {
    scheduler = new InMemoryScheduler();
    correlationStore = new InMemoryCorrelationStore();
    mockGateway = new MockGatewayService();
    eventBridge = new IntersectEventBridge(correlationStore, { enableLogging: false });

    agent = new Agent(
      scheduler,
      correlationStore,
      mockGateway as unknown as IIntersectGatewayService,
      eventBridge,
      {
        pollIntervalMs: 50,
        maxConcurrent: 3,
        agentId: 'test-agent',
        verbose: false,
      }
    );
  });

  afterEach(() => {
    agent.stop();
    eventBridge.stop();
  });

  describe('Lifecycle', () => {
    it('should start and stop correctly', () => {
      expect(agent.isRunning()).toBe(false);

      agent.start();
      expect(agent.isRunning()).toBe(true);

      agent.stop();
      expect(agent.isRunning()).toBe(false);
    });

    it('should not start twice', () => {
      agent.start();
      agent.start(); // Should be idempotent
      expect(agent.isRunning()).toBe(true);
    });
  });

  describe('Task Processing', () => {
    it('should process scheduled tasks', async () => {
      await scheduler.scheduleTask({
        experimentRunId: 'exp-1',
        campaignId: 'camp-1',
        controllerId: 'c1',
        activityName: 'test_activity',
        activityOptions: [],
      });

      agent.start();

      // Wait for polling
      await new Promise((r) => setTimeout(r, 100));

      expect(mockGateway.startActivityCalls.length).toBe(1);
      expect(mockGateway.startActivityCalls[0].activityName).toBe('test_activity');
    });

    it('should respect max concurrent limit', async () => {
      // Schedule more tasks than max concurrent
      for (let i = 0; i < 5; i++) {
        await scheduler.scheduleTask({
          experimentRunId: `exp-${i}`,
          campaignId: `camp-${i}`,
          controllerId: 'c1',
          activityName: `activity_${i}`,
          activityOptions: [],
        });
      }

      agent.start();

      // Wait for polling
      await new Promise((r) => setTimeout(r, 100));

      // Should only process maxConcurrent (3) tasks
      expect(mockGateway.startActivityCalls.length).toBeLessThanOrEqual(3);
    });

    it('should track execution metrics', async () => {
      await scheduler.scheduleTask({
        experimentRunId: 'exp-1',
        campaignId: 'camp-1',
        controllerId: 'c1',
        activityName: 'test_activity',
        activityOptions: [],
      });

      agent.start();
      await new Promise((r) => setTimeout(r, 100));

      const metrics = agent.getMetrics();
      expect(metrics.tasksProcessed).toBeGreaterThanOrEqual(1);
      expect(metrics.agentId).toBe('test-agent');
    });
  });

  describe('Event Handling', () => {
    it('should handle activity completion events', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-1',
        campaignId: 'camp-1',
        controllerId: 'c1',
        activityName: 'test_activity',
        activityOptions: [],
      });

      agent.start();
      eventBridge.start();

      await new Promise((r) => setTimeout(r, 100));

      // Simulate completion event
      await eventBridge.handleIncomingEvent({
        eventType: 'activity.status_change',
        controllerId: 'c1',
        timestamp: new Date(),
        payload: {
          activityId: 'mock-activity-1',
          activityStatus: 'completed',
          dataProducts: [],
        },
      });

      await new Promise((r) => setTimeout(r, 50));

      const taskState = await scheduler.getTask(task.id);
      expect(taskState?.status).toBe('completed');
    });
  });
});

describe('Supervisor', () => {
  let scheduler: InMemoryScheduler;
  let correlationStore: InMemoryCorrelationStore;
  let mockGateway: MockGatewayService;
  let supervisor: Supervisor;
  let escalationEvents: EscalationEvent[];

  beforeEach(() => {
    scheduler = new InMemoryScheduler();
    correlationStore = new InMemoryCorrelationStore();
    mockGateway = new MockGatewayService();
    escalationEvents = [];

    supervisor = new Supervisor(
      scheduler,
      correlationStore,
      mockGateway as unknown as IIntersectGatewayService,
      {
        monitorIntervalMs: 50,
        staleThresholdMs: 100,
        activityTimeoutMs: 200,
        autoRetryEnabled: true,
        escalationEnabled: true,
        healthCheckIntervalMs: 100,
      }
    );

    supervisor.onEscalation(async (event) => {
      escalationEvents.push(event);
    });
  });

  afterEach(() => {
    supervisor.stop();
  });

  describe('Lifecycle', () => {
    it('should start and stop correctly', () => {
      expect(supervisor.isRunning()).toBe(false);

      supervisor.start();
      expect(supervisor.isRunning()).toBe(true);

      supervisor.stop();
      expect(supervisor.isRunning()).toBe(false);
    });
  });

  describe('Metrics', () => {
    it('should track supervisor metrics', async () => {
      supervisor.start();
      await new Promise((r) => setTimeout(r, 100));

      const metrics = supervisor.getMetrics();
      expect(metrics.checksPerformed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Controller Health Monitoring', () => {
    it('should track controller health status', async () => {
      supervisor.start();
      await new Promise((r) => setTimeout(r, 150));

      const metrics = supervisor.getMetrics();
      expect(metrics.healthChecksPerformed).toBeGreaterThanOrEqual(1);
    });

    it('should detect offline controllers', async () => {
      mockGateway.setControllerHealth('c1', false);

      supervisor.start();
      await new Promise((r) => setTimeout(r, 150));

      const metrics = supervisor.getMetrics();
      expect(metrics.controllersOffline).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Escalation', () => {
    it('should escalate task failures when max retries exceeded', async () => {
      // Create a task and mark it as failed - supervisor monitoring will detect and escalate
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-1',
        campaignId: 'camp-1',
        controllerId: 'c1',
        activityName: 'failing_activity',
        activityOptions: [],
        maxRetries: 0, // No retries - should escalate immediately
      });

      await scheduler.markStarted(task.id, 'activity-1');
      await scheduler.markFailed(task.id, 'Simulated failure');

      supervisor.start();

      // Wait for monitoring cycle to detect and escalate the failure
      await new Promise((r) => setTimeout(r, 150));

      // The supervisor's monitoring cycle should have detected and escalated the failure
      expect(escalationEvents.length).toBeGreaterThanOrEqual(1);
      const taskFailedEvent = escalationEvents.find(e =>
        e.type === 'task_failed' || e.type === 'repeated_failures'
      );
      expect(taskFailedEvent).toBeDefined();
    });
  });
});

// =============================================================================
// Edge Cases and Error Handling Tests
// =============================================================================

describe('Edge Cases', () => {
  describe('Correlation Store Edge Cases', () => {
    let correlationStore: InMemoryCorrelationStore;

    beforeEach(() => {
      correlationStore = new InMemoryCorrelationStore();
    });

    it('should return null for non-existent correlation', async () => {
      const result = await correlationStore.getActivityCorrelation('non-existent');
      expect(result).toBeNull();
    });

    it('should return null for non-existent data product', async () => {
      const result = await correlationStore.getDataProductMapping('non-existent');
      expect(result).toBeNull();
    });

    it('should handle multiple correlations for same experiment', async () => {
      for (let i = 0; i < 10; i++) {
        await correlationStore.saveActivityCorrelation({
          activityId: `activity-${i}`,
          experimentRunId: 'exp-same',
          controllerId: 'c1',
          activityName: 'test',
          status: 'running' as ActivityStatus,
          startTime: new Date(),
        });
      }

      const activities = await correlationStore.getActivitiesByExperimentRun('exp-same');
      expect(activities.length).toBe(10);
    });

    it('should update status for existing correlation', async () => {
      await correlationStore.saveActivityCorrelation({
        activityId: 'activity-1',
        experimentRunId: 'exp-1',
        controllerId: 'c1',
        activityName: 'test',
        status: 'started' as ActivityStatus,
        startTime: new Date(),
      });

      await correlationStore.updateActivityStatus('activity-1', 'running');
      await correlationStore.updateActivityStatus('activity-1', 'completed');

      const correlation = await correlationStore.getActivityCorrelation('activity-1');
      expect(correlation?.status).toBe('completed');
    });
  });

  describe('Scheduler Edge Cases', () => {
    let scheduler: InMemoryScheduler;

    beforeEach(() => {
      scheduler = new InMemoryScheduler();
    });

    it('should throw when updating non-existent task', async () => {
      await expect(
        scheduler.updateTask('non-existent', { status: 'running' })
      ).rejects.toThrow('Task not found');
    });

    it('should throw when cancelling non-existent task', async () => {
      await expect(
        scheduler.cancelTask('non-existent', 'reason')
      ).rejects.toThrow('Task not found');
    });

    it('should handle empty task queue', async () => {
      const nextTask = await scheduler.getNextTask();
      expect(nextTask).toBeNull();

      const readyTasks = await scheduler.getReadyTasks();
      expect(readyTasks).toEqual([]);
    });

    it('should handle task metadata', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-1',
        campaignId: 'camp-1',
        controllerId: 'c1',
        activityName: 'test',
        activityOptions: [],
        metadata: {
          customField: 'customValue',
          nestedData: { a: 1, b: 2 },
        },
      });

      const retrieved = await scheduler.getTask(task.id);
      expect(retrieved?.metadata?.customField).toBe('customValue');
      expect(retrieved?.metadata?.nestedData.a).toBe(1);
    });
  });

  describe('Event Bridge Edge Cases', () => {
    let correlationStore: InMemoryCorrelationStore;
    let eventBridge: IntersectEventBridge;

    beforeEach(() => {
      correlationStore = new InMemoryCorrelationStore();
      eventBridge = new IntersectEventBridge(correlationStore, { enableLogging: false });
    });

    afterEach(() => {
      eventBridge.stop();
    });

    it('should handle unknown event types gracefully', async () => {
      eventBridge.start();

      // Should not throw - use type assertion to test unknown event type handling
      await eventBridge.handleIncomingEvent({
        eventType: 'unknown.event.type' as any,
        controllerId: 'c1',
        timestamp: new Date(),
        payload: {},
      });
    });

    it('should handle events for non-existent correlations', async () => {
      eventBridge.start();

      // Should not throw even though correlation doesn't exist
      await eventBridge.handleIncomingEvent({
        eventType: 'activity.status_change',
        controllerId: 'c1',
        timestamp: new Date(),
        payload: {
          activityId: 'non-existent',
          activityStatus: 'completed',
        },
      });
    });

    it('should handle multiple subscribers for same event type', async () => {
      const handler1Events: IntersectEvent[] = [];
      const handler2Events: IntersectEvent[] = [];

      eventBridge.subscribe('activity.status_change', async (event) => {
        handler1Events.push(event);
      });

      eventBridge.subscribe('activity.status_change', async (event) => {
        handler2Events.push(event);
      });

      eventBridge.start();

      await eventBridge.handleIncomingEvent({
        eventType: 'activity.status_change',
        controllerId: 'c1',
        timestamp: new Date(),
        payload: { activityId: '1', activityStatus: 'completed' },
      });

      expect(handler1Events.length).toBe(1);
      expect(handler2Events.length).toBe(1);
    });
  });

  describe('Schema Mapper Edge Cases', () => {
    let schemaMapper: DefaultSchemaMapper;

    beforeEach(() => {
      schemaMapper = new DefaultSchemaMapper();
    });

    it('should handle empty parameters', () => {
      const options = schemaMapper.mapAdamStepToActivityOptions(
        { id: 'step-1', name: 'Test', type: 'test', experimentId: 'exp-1', parameters: {} },
        'test'
      );
      expect(options).toBeDefined();
    });

    it('should handle missing optional fields in correlation', () => {
      const correlation = schemaMapper.createCorrelation({
        experimentId: 'exp-1',
        experimentRunId: 'run-1',
        // No campaignId or userId
      });

      expect(correlation.experimentRunId).toBe('run-1');
      expect(correlation.campaignId).toBeUndefined();
    });

    it('should map all activity status types', () => {
      const statuses = ['started', 'running', 'completed', 'failed', 'cancelled'];

      for (const status of statuses) {
        const event: IntersectEvent = {
          eventType: 'activity.status_change',
          controllerId: 'c1',
          timestamp: new Date(),
          payload: {
            activityId: 'activity-1',
            activityName: 'test',
            activityStatus: status,
            correlation: { experimentRunId: 'exp-1' },
          },
        };

        const adamEvent = schemaMapper.mapIntersectEventToAdam(event);
        expect(adamEvent).toBeDefined();
        expect(adamEvent.source).toBe('intersect');
      }
    });
  });

  describe('Concurrent Operations', () => {
    let scheduler: InMemoryScheduler;

    beforeEach(() => {
      scheduler = new InMemoryScheduler();
    });

    it('should handle concurrent task scheduling', async () => {
      const schedulePromises = [];

      for (let i = 0; i < 20; i++) {
        schedulePromises.push(
          scheduler.scheduleTask({
            experimentRunId: `exp-${i}`,
            campaignId: `camp-${i}`,
            controllerId: 'c1',
            activityName: `activity_${i}`,
            activityOptions: [],
          })
        );
      }

      const tasks = await Promise.all(schedulePromises);
      expect(tasks.length).toBe(20);

      // All tasks should have unique IDs
      const ids = new Set(tasks.map((t) => t.id));
      expect(ids.size).toBe(20);
    });

    it('should handle concurrent status updates', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-1',
        campaignId: 'camp-1',
        controllerId: 'c1',
        activityName: 'test',
        activityOptions: [],
      });

      await scheduler.markStarted(task.id, 'activity-1');

      // Simulate concurrent completion and failure - last one wins
      await Promise.all([
        scheduler.updateTask(task.id, { status: 'completed' }),
        scheduler.updateTask(task.id, { status: 'failed', error: 'Error' }),
      ]);

      const finalTask = await scheduler.getTask(task.id);
      // One of the two statuses should be set
      expect(['completed', 'failed']).toContain(finalTask?.status);
    });
  });
});
