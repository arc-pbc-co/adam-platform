/**
 * Nova INTERSECT Activity Agent
 *
 * Executes scheduled tasks by:
 * - Polling the scheduler for ready tasks
 * - Starting activities on controllers via the gateway
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
  IIntersectGatewayService,
  IIntersectEventBridge,
  ICorrelationStore,
  ActivityCorrelation,
  NormalizedAdamEvent,
} from '../intersect-types';

// ============================================================================
// Types
// ============================================================================

export interface AgentConfig {
  /** How often to poll for tasks (ms) */
  pollIntervalMs: number;
  /** Maximum concurrent task executions */
  maxConcurrent: number;
  /** Unique identifier for this agent */
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
  lastTaskTime?: Date;
  avgProcessingTimeMs?: number;
}

export interface TaskExecution {
  taskId: string;
  activityId?: string;
  startTime: Date;
  status: 'starting' | 'running' | 'waiting' | 'completed' | 'failed';
}

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  pollIntervalMs: 5000,
  maxConcurrent: 10,
  agentId: `nova-agent-${Date.now()}`,
  verbose: false,
};

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
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
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

  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  getCurrentExecutions(): TaskExecution[] {
    return Array.from(this.currentExecutions.values());
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private setupEventHandlers(): void {
    this.eventBridge.subscribe(async (event: NormalizedAdamEvent) => {
      await this.handleIntersectEvent(event);
    });
  }

  private async handleIntersectEvent(event: NormalizedAdamEvent): Promise<void> {
    const activityId = event.data.activityId;
    if (!activityId) return;

    // Find task by activity ID
    const execution = Array.from(this.currentExecutions.values())
      .find(e => e.activityId === activityId);
    if (!execution) return;

    const status = event.data.status;

    if (status === 'completed') {
      await this.handleTaskCompletion(execution.taskId, event);
    } else if (status === 'failed' || status === 'cancelled') {
      await this.handleTaskFailure(execution.taskId, event.data.error || 'Activity failed');
    }
  }

  // ============================================================================
  // Polling
  // ============================================================================

  private async pollForTasks(): Promise<void> {
    if (!this.running) return;

    const availableSlots = this.config.maxConcurrent - this.currentExecutions.size;
    if (availableSlots <= 0) return;

    try {
      const tasks = await this.scheduler.getReadyTasks(availableSlots);

      for (const task of tasks) {
        if (this.currentExecutions.size >= this.config.maxConcurrent) break;
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
        experimentRunId: task.experimentRunId,
        campaignId: task.campaignId,
      });

      // Update task with activity ID
      await this.scheduler.markStarted(task.id, result.activityId);
      execution.activityId = result.activityId;
      execution.status = 'running';

      // Store correlation
      const correlation: ActivityCorrelation = {
        activityId: result.activityId,
        experimentRunId: task.experimentRunId,
        campaignId: task.campaignId,
        controllerId: task.controllerId,
        activityName: task.activityName,
        stepId: task.metadata?.stepId,
        traceId: `trace_${task.experimentRunId}_${Date.now()}`,
        status: 'running',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await this.correlationStore.save(correlation);

      this.log(`Task ${task.id} started activity ${result.activityId}`);
    } catch (error) {
      await this.handleTaskFailure(task.id, (error as Error).message);
    }
  }

  private async handleTaskCompletion(taskId: string, _event: NormalizedAdamEvent): Promise<void> {
    const execution = this.currentExecutions.get(taskId);
    if (!execution) return;

    this.log(`Task ${taskId} completed successfully`);
    execution.status = 'completed';
    this.metrics.tasksSucceeded++;
    this.metrics.currentlyProcessing--;

    const processingTime = Date.now() - execution.startTime.getTime();
    this.recordProcessingTime(processingTime);

    await this.scheduler.markCompleted(taskId);
    if (execution.activityId) {
      await this.correlationStore.updateStatus(execution.activityId, 'completed');
    }

    this.currentExecutions.delete(taskId);
  }

  private async handleTaskFailure(taskId: string, error: string): Promise<void> {
    const execution = this.currentExecutions.get(taskId);
    if (!execution) return;

    this.log(`Task ${taskId} failed: ${error}`);
    execution.status = 'failed';
    this.metrics.tasksFailed++;
    this.metrics.currentlyProcessing--;

    await this.scheduler.markFailed(taskId, error);
    if (execution.activityId) {
      await this.correlationStore.updateStatus(execution.activityId, 'failed');
    }

    this.currentExecutions.delete(taskId);
  }

  private recordProcessingTime(timeMs: number): void {
    this.processingTimes.push(timeMs);
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }
    this.metrics.avgProcessingTimeMs = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[Agent ${this.config.agentId}] ${message}`);
    }
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

