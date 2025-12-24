/**
 * INTERSECT Activity Agent
 *
 * Executes scheduled tasks by:
 * - Polling the scheduler for ready tasks
 * - Starting activities on controllers
 * - Tracking execution state
 * - Handling results and errors
 *
 * Part of the Scheduler-Agent-Supervisor pattern for resilient orchestration.
 */

import {
  IScheduler,
  ScheduledTask,
} from './Scheduler';
import {
  ICorrelationStore,
} from '../correlation/CorrelationStore';
import {
  IIntersectGatewayService,
} from '../gateway/IntersectGatewayService';
import {
  IIntersectEventBridge,
} from '../events/IntersectEventBridge';
import {
  IntersectEvent,
  ActivityStatus,
} from '../types';

// ============================================================================
// Types
// ============================================================================

export interface AgentConfig {
  /** How often to poll for tasks (ms) */
  pollIntervalMs: number;

  /** Max concurrent tasks to process */
  maxConcurrent: number;

  /** Agent identifier for logging */
  agentId: string;

  /** Enable verbose logging */
  verbose: boolean;
}

export interface AgentMetrics {
  agentId: string;
  startedAt?: Date;
  tasksProcessed: number;
  tasksSucceeded: number;
  tasksFailed: number;
  currentlyProcessing: number;
  lastPollTime?: Date;
  lastTaskTime?: Date;
  avgProcessingTimeMs?: number;
}

export interface TaskExecution {
  taskId: string;
  activityId?: string;
  startTime: Date;
  status: 'starting' | 'running' | 'waiting' | 'completed' | 'failed';
}

// ============================================================================
// Agent Implementation
// ============================================================================

export class Agent {
  private scheduler: IScheduler;
  private correlationStore: ICorrelationStore;
  private gateway: IIntersectGatewayService;
  private eventBridge: IIntersectEventBridge;
  private config: AgentConfig;
  private metrics: AgentMetrics;
  private running: boolean = false;
  private pollInterval?: NodeJS.Timeout;
  private currentExecutions: Map<string, TaskExecution> = new Map();
  private processingTimes: number[] = [];

  constructor(
    scheduler: IScheduler,
    correlationStore: ICorrelationStore,
    gateway: IIntersectGatewayService,
    eventBridge: IIntersectEventBridge,
    config: Partial<AgentConfig> = {}
  ) {
    this.scheduler = scheduler;
    this.correlationStore = correlationStore;
    this.gateway = gateway;
    this.eventBridge = eventBridge;
    this.config = {
      pollIntervalMs: config.pollIntervalMs ?? 5000,
      maxConcurrent: config.maxConcurrent ?? 10,
      agentId: config.agentId ?? `agent-${Date.now()}`,
      verbose: config.verbose ?? false,
    };
    this.metrics = {
      agentId: this.config.agentId,
      tasksProcessed: 0,
      tasksSucceeded: 0,
      tasksFailed: 0,
      currentlyProcessing: 0,
    };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  start(): void {
    if (this.running) return;

    this.running = true;
    this.metrics.startedAt = new Date();
    this.log('Starting agent...');

    // Subscribe to activity completion events
    this.setupEventHandlers();

    // Start polling loop
    this.pollInterval = setInterval(
      () => this.pollForTasks(),
      this.config.pollIntervalMs
    );

    // Initial poll
    this.pollForTasks();
  }

  stop(): void {
    if (!this.running) return;

    this.running = false;
    this.log('Stopping agent...');

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private setupEventHandlers(): void {
    // Listen for activity status changes
    this.eventBridge.subscribe('activity.status_change', async (event) => {
      await this.handleActivityStatusChange(event);
    });
  }

  private async handleActivityStatusChange(event: IntersectEvent): Promise<void> {
    const { activityId, activityStatus } = event.payload;

    // Find execution for this activity
    const execution = Array.from(this.currentExecutions.values())
      .find(e => e.activityId === activityId);

    if (!execution) return;

    this.log(`Activity ${activityId} status changed to ${activityStatus}`);

    if (activityStatus === 'completed') {
      await this.handleTaskCompletion(execution.taskId, event);
    } else if (activityStatus === 'failed') {
      await this.handleTaskFailure(execution.taskId, event.payload.statusMsg || 'Activity failed');
    } else if (activityStatus === 'cancelled') {
      await this.handleTaskCancellation(execution.taskId, 'Activity was cancelled');
    }
  }

  // ============================================================================
  // Task Polling
  // ============================================================================

  private async pollForTasks(): Promise<void> {
    if (!this.running) return;

    this.metrics.lastPollTime = new Date();

    // Check capacity
    const availableSlots = this.config.maxConcurrent - this.currentExecutions.size;
    if (availableSlots <= 0) {
      this.log('At max capacity, skipping poll');
      return;
    }

    try {
      // Get ready tasks
      const tasks = await this.scheduler.getReadyTasks(availableSlots);

      for (const task of tasks) {
        // Double-check we have capacity
        if (this.currentExecutions.size >= this.config.maxConcurrent) break;

        // Start processing
        this.processTask(task).catch(error => {
          console.error(`[Agent ${this.config.agentId}] Error processing task ${task.id}:`, error);
        });
      }
    } catch (error) {
      console.error(`[Agent ${this.config.agentId}] Error polling for tasks:`, error);
    }
  }

  // ============================================================================
  // Task Processing
  // ============================================================================

  private async processTask(task: ScheduledTask): Promise<void> {
    this.log(`Processing task ${task.id}: ${task.activityName}`);
    this.metrics.tasksProcessed++;
    this.metrics.currentlyProcessing++;
    this.metrics.lastTaskTime = new Date();

    const execution: TaskExecution = {
      taskId: task.id,
      startTime: new Date(),
      status: 'starting',
    };
    this.currentExecutions.set(task.id, execution);

    try {
      // Start the activity via gateway
      const result = await this.gateway.startActivity({
        controllerId: task.controllerId,
        activityName: task.activityName,
        activityOptions: task.activityOptions,
        deadline: task.deadline,
        correlation: {
          experimentRunId: task.experimentRunId,
          campaignId: task.campaignId,
        },
      });

      // Update execution state
      execution.activityId = result.activityId;
      execution.status = 'running';

      // Mark task as started in scheduler
      await this.scheduler.markStarted(task.id, result.activityId);

      // Save correlation
      await this.correlationStore.saveActivityCorrelation({
        activityId: result.activityId,
        experimentRunId: task.experimentRunId,
        campaignId: task.campaignId,
        controllerId: task.controllerId,
        activityName: task.activityName,
        status: 'running',
        startTime: new Date(),
      });

      this.log(`Task ${task.id} started activity ${result.activityId}`);

      // Set execution to waiting for completion event
      execution.status = 'waiting';

    } catch (error) {
      this.log(`Task ${task.id} failed to start: ${(error as Error).message}`);
      await this.handleTaskFailure(task.id, (error as Error).message);
    }
  }

  // ============================================================================
  // Task Completion Handling
  // ============================================================================

  private async handleTaskCompletion(taskId: string, event: IntersectEvent): Promise<void> {
    const execution = this.currentExecutions.get(taskId);
    if (!execution) return;

    this.log(`Task ${taskId} completed successfully`);

    execution.status = 'completed';
    this.metrics.tasksSucceeded++;
    this.metrics.currentlyProcessing--;

    // Record processing time
    const processingTime = Date.now() - execution.startTime.getTime();
    this.recordProcessingTime(processingTime);

    // Mark task complete
    await this.scheduler.markCompleted(taskId);

    // Update correlation
    if (execution.activityId) {
      await this.correlationStore.updateActivityStatus(execution.activityId, 'completed');

      // Save data products if present
      if (event.payload.dataProducts) {
        for (const product of event.payload.dataProducts) {
          await this.correlationStore.saveDataProductMapping({
            productUuid: product.productUuid,
            activityId: execution.activityId,
            experimentRunId: event.payload.correlation?.experimentRunId || '',
            productName: product.productName,
            contentType: product.contentType,
            createdAt: new Date(),
          });
        }
      }
    }

    // Cleanup
    this.currentExecutions.delete(taskId);
  }

  private async handleTaskFailure(taskId: string, error: string): Promise<void> {
    const execution = this.currentExecutions.get(taskId);
    if (execution) {
      execution.status = 'failed';
      this.metrics.currentlyProcessing--;
    }

    this.metrics.tasksFailed++;
    this.log(`Task ${taskId} failed: ${error}`);

    // Mark task as failed
    await this.scheduler.markFailed(taskId, error);

    // Update correlation if we have an activity
    if (execution?.activityId) {
      await this.correlationStore.updateActivityStatus(execution.activityId, 'failed');
    }

    // Cleanup
    this.currentExecutions.delete(taskId);
  }

  private async handleTaskCancellation(taskId: string, reason: string): Promise<void> {
    const execution = this.currentExecutions.get(taskId);
    if (execution) {
      this.metrics.currentlyProcessing--;
    }

    this.log(`Task ${taskId} cancelled: ${reason}`);

    // Update correlation if we have an activity
    if (execution?.activityId) {
      await this.correlationStore.updateActivityStatus(execution.activityId, 'cancelled');
    }

    // Cleanup
    this.currentExecutions.delete(taskId);
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  private recordProcessingTime(timeMs: number): void {
    this.processingTimes.push(timeMs);

    // Keep only last 100 samples
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }

    // Calculate average
    if (this.processingTimes.length > 0) {
      this.metrics.avgProcessingTimeMs =
        this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
    }
  }

  getMetrics(): AgentMetrics {
    return {
      ...this.metrics,
      currentlyProcessing: this.currentExecutions.size,
    };
  }

  getCurrentExecutions(): TaskExecution[] {
    return Array.from(this.currentExecutions.values());
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[Agent ${this.config.agentId}] ${message}`);
    }
  }
}

// ============================================================================
// Agent Pool
// ============================================================================

export class AgentPool {
  private agents: Agent[] = [];
  private scheduler: IScheduler;
  private correlationStore: ICorrelationStore;
  private gateway: IIntersectGatewayService;
  private eventBridge: IIntersectEventBridge;
  private poolSize: number;

  constructor(
    scheduler: IScheduler,
    correlationStore: ICorrelationStore,
    gateway: IIntersectGatewayService,
    eventBridge: IIntersectEventBridge,
    poolSize: number = 3
  ) {
    this.scheduler = scheduler;
    this.correlationStore = correlationStore;
    this.gateway = gateway;
    this.eventBridge = eventBridge;
    this.poolSize = poolSize;
  }

  start(): void {
    console.log(`[AgentPool] Starting ${this.poolSize} agents...`);

    for (let i = 0; i < this.poolSize; i++) {
      const agent = new Agent(
        this.scheduler,
        this.correlationStore,
        this.gateway,
        this.eventBridge,
        {
          agentId: `agent-${i + 1}`,
          maxConcurrent: 5,
          pollIntervalMs: 5000 + (i * 1000), // Stagger polling
          verbose: true,
        }
      );
      agent.start();
      this.agents.push(agent);
    }
  }

  stop(): void {
    console.log('[AgentPool] Stopping all agents...');
    for (const agent of this.agents) {
      agent.stop();
    }
    this.agents = [];
  }

  getMetrics(): AgentMetrics[] {
    return this.agents.map(agent => agent.getMetrics());
  }

  getPoolStats(): {
    totalAgents: number;
    runningAgents: number;
    totalTasksProcessed: number;
    totalTasksSucceeded: number;
    totalTasksFailed: number;
    totalCurrentlyProcessing: number;
  } {
    const metrics = this.getMetrics();

    return {
      totalAgents: this.agents.length,
      runningAgents: this.agents.filter(a => a.isRunning()).length,
      totalTasksProcessed: metrics.reduce((sum, m) => sum + m.tasksProcessed, 0),
      totalTasksSucceeded: metrics.reduce((sum, m) => sum + m.tasksSucceeded, 0),
      totalTasksFailed: metrics.reduce((sum, m) => sum + m.tasksFailed, 0),
      totalCurrentlyProcessing: metrics.reduce((sum, m) => sum + m.currentlyProcessing, 0),
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createAgent(
  scheduler: IScheduler,
  correlationStore: ICorrelationStore,
  gateway: IIntersectGatewayService,
  eventBridge: IIntersectEventBridge,
  config?: Partial<AgentConfig>
): Agent {
  return new Agent(scheduler, correlationStore, gateway, eventBridge, config);
}

export function createAgentPool(
  scheduler: IScheduler,
  correlationStore: ICorrelationStore,
  gateway: IIntersectGatewayService,
  eventBridge: IIntersectEventBridge,
  poolSize?: number
): AgentPool {
  return new AgentPool(scheduler, correlationStore, gateway, eventBridge, poolSize);
}
