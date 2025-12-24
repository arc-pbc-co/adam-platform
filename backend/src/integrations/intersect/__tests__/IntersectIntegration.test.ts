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
  let gatewayService: IntersectGatewayService;
  let eventBridge: IntersectEventBridge;
  let mockController: MockInstrumentController;

  beforeEach(() => {
    correlationStore = new InMemoryCorrelationStore();
    schemaMapper = new DefaultSchemaMapper();
    mockController = new MockInstrumentController();

    gatewayService = new IntersectGatewayService(
      {
        controllerId: mockController.controllerId,
        endpoint: 'http://localhost:8080',
        healthEndpoint: '/health',
      },
      correlationStore,
      schemaMapper
    );

    // Inject mock controller
    (gatewayService as any).controller = mockController;

    eventBridge = new IntersectEventBridge({
      correlationStore,
    });
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
      expect(receivedEvents[0].payload.activityId).toBe('activity-123');
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
          e.payload.activityStatus === 'completed'
      );
      expect(completionEvents.length).toBe(1);
    });
  });
});
