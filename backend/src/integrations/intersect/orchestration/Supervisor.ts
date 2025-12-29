/**
 * INTERSECT Activity Supervisor
 *
 * Monitors running activities and handles:
 * - Stale activity detection
 * - Automatic retry scheduling
 * - Timeout enforcement
 * - Failure escalation
 * - Health monitoring
 *
 * Part of the Scheduler-Agent-Supervisor pattern for resilient orchestration.
 */

import {
  IScheduler,
  ScheduledTask,
  TaskStatus,
} from './Scheduler';
import {
  ICorrelationStore,
} from '../correlation/CorrelationStore';
import {
  IIntersectGatewayService,
} from '../gateway/IntersectGatewayService';
import { ActivityStatus, ActivityCorrelation } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface SupervisorConfig {
  /** How often to run monitoring checks (ms) */
  monitorIntervalMs: number;

  /** Activity is stale if no update for this long (ms) */
  staleThresholdMs: number;

  /** Max time for an activity to complete (ms) */
  activityTimeoutMs: number;

  /** Enable automatic retries */
  autoRetryEnabled: boolean;

  /** Enable escalation notifications */
  escalationEnabled: boolean;

  /** Controller health check interval (ms) */
  healthCheckIntervalMs: number;
}

export interface SupervisorMetrics {
  lastCheckTime?: Date;
  checksPerformed: number;
  staleActivitiesDetected: number;
  timeoutsEnforced: number;
  retriesScheduled: number;
  failuresEscalated: number;
  healthChecksPerformed: number;
  controllersOnline: number;
  controllersOffline: number;
}

export interface EscalationEvent {
  type: 'task_failed' | 'activity_timeout' | 'controller_offline' | 'repeated_failures';
  taskId?: string;
  activityId?: string;
  controllerId?: string;
  experimentRunId?: string;
  error?: string;
  retryCount?: number;
  timestamp: Date;
}

export type EscalationHandler = (event: EscalationEvent) => Promise<void>;

export interface ControllerHealthStatus {
  controllerId: string;
  healthy: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
  error?: string;
}

// ============================================================================
// Supervisor Implementation
// ============================================================================

export class Supervisor {
  private scheduler: IScheduler;
  private correlationStore: ICorrelationStore;
  private gateway: IIntersectGatewayService;
  private config: SupervisorConfig;
  private metrics: SupervisorMetrics;
  private running: boolean = false;
  private monitorInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private escalationHandlers: EscalationHandler[] = [];
  private controllerHealth: Map<string, ControllerHealthStatus> = new Map();

  constructor(
    scheduler: IScheduler,
    correlationStore: ICorrelationStore,
    gateway: IIntersectGatewayService,
    config: Partial<SupervisorConfig> = {}
  ) {
    this.scheduler = scheduler;
    this.correlationStore = correlationStore;
    this.gateway = gateway;
    this.config = {
      monitorIntervalMs: config.monitorIntervalMs ?? 30000,
      staleThresholdMs: config.staleThresholdMs ?? 600000, // 10 minutes
      activityTimeoutMs: config.activityTimeoutMs ?? 3600000, // 1 hour
      autoRetryEnabled: config.autoRetryEnabled ?? true,
      escalationEnabled: config.escalationEnabled ?? true,
      healthCheckIntervalMs: config.healthCheckIntervalMs ?? 60000, // 1 minute
    };
    this.metrics = {
      checksPerformed: 0,
      staleActivitiesDetected: 0,
      timeoutsEnforced: 0,
      retriesScheduled: 0,
      failuresEscalated: 0,
      healthChecksPerformed: 0,
      controllersOnline: 0,
      controllersOffline: 0,
    };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  start(): void {
    if (this.running) return;

    this.running = true;
    console.log('[Supervisor] Starting monitoring...');

    // Start monitoring loop
    this.monitorInterval = setInterval(
      () => this.runMonitoringCycle(),
      this.config.monitorIntervalMs
    );

    // Start health check loop
    this.healthCheckInterval = setInterval(
      () => this.runHealthChecks(),
      this.config.healthCheckIntervalMs
    );

    // Run initial checks
    this.runMonitoringCycle();
    this.runHealthChecks();
  }

  stop(): void {
    if (!this.running) return;

    this.running = false;
    console.log('[Supervisor] Stopping monitoring...');

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  // ============================================================================
  // Escalation Handlers
  // ============================================================================

  onEscalation(handler: EscalationHandler): void {
    this.escalationHandlers.push(handler);
  }

  private async escalate(event: EscalationEvent): Promise<void> {
    if (!this.config.escalationEnabled) return;

    console.log(`[Supervisor] Escalation: ${event.type}`, event);
    this.metrics.failuresEscalated++;

    for (const handler of this.escalationHandlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error('[Supervisor] Escalation handler error:', error);
      }
    }
  }

  // ============================================================================
  // Monitoring Cycle
  // ============================================================================

  private async runMonitoringCycle(): Promise<void> {
    if (!this.running) return;

    try {
      this.metrics.lastCheckTime = new Date();
      this.metrics.checksPerformed++;

      await Promise.all([
        this.checkStaleActivities(),
        this.checkTimeouts(),
        this.processFailedTasks(),
        this.checkDeadlines(),
      ]);
    } catch (error) {
      console.error('[Supervisor] Monitoring cycle error:', error);
    }
  }

  // ============================================================================
  // Stale Activity Detection
  // ============================================================================

  private async checkStaleActivities(): Promise<void> {
    const runningTasks = await this.scheduler.getRunningTasks();
    const staleThreshold = new Date(Date.now() - this.config.staleThresholdMs);

    for (const task of runningTasks) {
      if (!task.activityId) continue;

      try {
        // Check if activity has had recent updates
        const correlation = await this.correlationStore.getActivityCorrelation(task.activityId);

        if (!correlation) continue;

        // If no recent update, query controller directly
        if (correlation.updatedAt && correlation.updatedAt < staleThreshold) {
          this.metrics.staleActivitiesDetected++;
          await this.reconcileActivity(task, correlation);
        }
      } catch (error) {
        console.error(`[Supervisor] Error checking stale activity ${task.activityId}:`, error);
      }
    }
  }

  private async reconcileActivity(task: ScheduledTask, correlation: ActivityCorrelation): Promise<void> {
    console.log(`[Supervisor] Reconciling stale activity: ${task.activityId}`);

    try {
      // Query actual status from controller
      const status = await this.gateway.getActivityStatus(task.controllerId, task.activityId!);

      if (status.activityStatus === 'completed') {
        await this.handleLateCompletion(task, { status: status.activityStatus, dataProducts: [] });
      } else if (status.activityStatus === 'failed') {
        await this.handleActivityFailure(task, status.statusMsg || 'Activity failed');
      } else if (status.activityStatus === 'cancelled') {
        await this.scheduler.cancelTask(task.id, 'Activity was cancelled');
        await this.correlationStore.updateActivityStatus(task.activityId!, 'cancelled');
      } else {
        // Still running - update correlation timestamp
        await this.correlationStore.updateActivityStatus(
          task.activityId!,
          status.activityStatus as ActivityStatus
        );
      }
    } catch (error) {
      // Controller unreachable - check if should escalate
      const controllerHealth = this.controllerHealth.get(task.controllerId);
      if (controllerHealth && !controllerHealth.healthy) {
        await this.escalate({
          type: 'controller_offline',
          taskId: task.id,
          activityId: task.activityId,
          controllerId: task.controllerId,
          experimentRunId: task.experimentRunId,
          error: `Controller ${task.controllerId} is offline`,
          timestamp: new Date(),
        });
      }
    }
  }

  private async handleLateCompletion(
    task: ScheduledTask,
    status: { status: string; dataProducts?: any[] }
  ): Promise<void> {
    console.log(`[Supervisor] Late completion detected for task ${task.id}`);

    // Mark task as completed
    await this.scheduler.markCompleted(task.id);

    // Update correlation
    await this.correlationStore.updateActivityStatus(task.activityId!, 'completed');

    // Store any data products
    if (status.dataProducts) {
      for (const product of status.dataProducts) {
        await this.correlationStore.saveDataProductMapping({
          productUuid: product.productUuid,
          activityId: task.activityId!,
          experimentRunId: task.experimentRunId,
          productName: product.productName,
          contentType: product.contentType,
          createdAt: new Date(),
        });
      }
    }
  }

  // ============================================================================
  // Timeout Enforcement
  // ============================================================================

  private async checkTimeouts(): Promise<void> {
    const runningTasks = await this.scheduler.getRunningTasks();
    const timeoutThreshold = new Date(Date.now() - this.config.activityTimeoutMs);

    for (const task of runningTasks) {
      if (task.startedAt && task.startedAt < timeoutThreshold) {
        this.metrics.timeoutsEnforced++;
        await this.handleTimeout(task);
      }
    }
  }

  private async handleTimeout(task: ScheduledTask): Promise<void> {
    console.log(`[Supervisor] Timeout enforced for task ${task.id}`);

    try {
      // Attempt to cancel the activity
      if (task.activityId) {
        await this.gateway.cancelActivity(task.controllerId, task.activityId, 'Timeout exceeded');
        await this.correlationStore.updateActivityStatus(task.activityId, 'cancelled');
      }
    } catch (error) {
      console.error(`[Supervisor] Error cancelling timed-out activity:`, error);
    }

    // Mark task as timed out
    await this.scheduler.updateTask(task.id, {
      status: 'timeout',
      error: 'Activity exceeded maximum execution time',
    });

    await this.escalate({
      type: 'activity_timeout',
      taskId: task.id,
      activityId: task.activityId,
      controllerId: task.controllerId,
      experimentRunId: task.experimentRunId,
      timestamp: new Date(),
    });
  }

  // ============================================================================
  // Failed Task Processing
  // ============================================================================

  private async processFailedTasks(): Promise<void> {
    if (!this.config.autoRetryEnabled) return;

    const failedTasks = await this.scheduler.getFailedTasks();

    for (const task of failedTasks) {
      try {
        if (this.shouldRetry(task)) {
          await this.scheduleRetry(task);
        } else {
          await this.escalateFailure(task);
        }
      } catch (error) {
        console.error(`[Supervisor] Error processing failed task ${task.id}:`, error);
      }
    }
  }

  private shouldRetry(task: ScheduledTask): boolean {
    // Don't retry if max retries exceeded
    if (task.retryCount >= task.maxRetries) return false;

    // Don't retry if deadline passed
    if (task.deadline && task.deadline < new Date()) return false;

    // Check if error is retryable
    const nonRetryableErrors = [
      'invalid_options',
      'unknown_activity',
      'authorization_failed',
      'resource_not_found',
    ];

    if (task.error) {
      for (const errorType of nonRetryableErrors) {
        if (task.error.includes(errorType)) return false;
      }
    }

    return true;
  }

  private async scheduleRetry(task: ScheduledTask): Promise<void> {
    const retriedTask = await this.scheduler.scheduleRetry(task.id);

    if (retriedTask) {
      this.metrics.retriesScheduled++;
      console.log(
        `[Supervisor] Scheduled retry ${retriedTask.retryCount}/${retriedTask.maxRetries} for task ${task.id}`
      );
    }
  }

  private async escalateFailure(task: ScheduledTask): Promise<void> {
    console.log(`[Supervisor] Escalating failure for task ${task.id}`);

    await this.escalate({
      type: task.retryCount >= task.maxRetries ? 'repeated_failures' : 'task_failed',
      taskId: task.id,
      activityId: task.activityId,
      controllerId: task.controllerId,
      experimentRunId: task.experimentRunId,
      error: task.error,
      retryCount: task.retryCount,
      timestamp: new Date(),
    });
  }

  private async handleActivityFailure(task: ScheduledTask, error: string): Promise<void> {
    await this.scheduler.markFailed(task.id, error);

    if (task.activityId) {
      await this.correlationStore.updateActivityStatus(task.activityId, 'failed');
    }
  }

  // ============================================================================
  // Deadline Checking
  // ============================================================================

  private async checkDeadlines(): Promise<void> {
    const pendingTasks = await this.scheduler.getPendingTasks();
    const now = new Date();

    for (const task of pendingTasks) {
      if (task.deadline && task.deadline < now) {
        console.log(`[Supervisor] Task ${task.id} missed deadline`);
        await this.scheduler.cancelTask(task.id, 'Deadline exceeded before execution');
      }
    }
  }

  // ============================================================================
  // Controller Health Monitoring
  // ============================================================================

  private async runHealthChecks(): Promise<void> {
    if (!this.running) return;

    this.metrics.healthChecksPerformed++;

    try {
      const controllers = await this.gateway.listControllers();
      let online = 0;
      let offline = 0;

      for (const controller of controllers) {
        try {
          const health = await this.gateway.getControllerHealth(controller.controllerId);

          const status: ControllerHealthStatus = {
            controllerId: controller.controllerId,
            healthy: health.healthy,
            lastCheck: new Date(),
            consecutiveFailures: health.healthy ? 0 : (
              (this.controllerHealth.get(controller.controllerId)?.consecutiveFailures ?? 0) + 1
            ),
          };

          this.controllerHealth.set(controller.controllerId, status);

          if (health.healthy) {
            online++;
          } else {
            offline++;

            // Escalate if controller has been down for multiple checks
            if (status.consecutiveFailures >= 3) {
              await this.escalate({
                type: 'controller_offline',
                controllerId: controller.controllerId,
                error: `Controller has failed ${status.consecutiveFailures} consecutive health checks`,
                timestamp: new Date(),
              });
            }
          }
        } catch (error) {
          offline++;
          const existing = this.controllerHealth.get(controller.controllerId);
          this.controllerHealth.set(controller.controllerId, {
            controllerId: controller.controllerId,
            healthy: false,
            lastCheck: new Date(),
            consecutiveFailures: (existing?.consecutiveFailures ?? 0) + 1,
            error: (error as Error).message,
          });
        }
      }

      this.metrics.controllersOnline = online;
      this.metrics.controllersOffline = offline;
    } catch (error) {
      console.error('[Supervisor] Error during health checks:', error);
    }
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  getMetrics(): SupervisorMetrics {
    return { ...this.metrics };
  }

  getControllerHealth(): ControllerHealthStatus[] {
    return Array.from(this.controllerHealth.values());
  }

  // ============================================================================
  // Manual Operations
  // ============================================================================

  async forceRetry(taskId: string): Promise<ScheduledTask | null> {
    const task = await this.scheduler.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Reset retry count and schedule
    await this.scheduler.updateTask(taskId, {
      status: 'pending',
      retryCount: 0,
      error: undefined,
      nextRetry: undefined,
    });

    return this.scheduler.getTask(taskId);
  }

  async cancelAllPending(experimentRunId: string, reason: string): Promise<number> {
    const tasks = await this.scheduler.queryTasks({
      experimentRunId,
      status: ['pending', 'scheduled'],
    });

    let cancelled = 0;
    for (const task of tasks) {
      try {
        await this.scheduler.cancelTask(task.id, reason);
        cancelled++;
      } catch (error) {
        console.error(`[Supervisor] Error cancelling task ${task.id}:`, error);
      }
    }

    return cancelled;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createSupervisor(
  scheduler: IScheduler,
  correlationStore: ICorrelationStore,
  gateway: IIntersectGatewayService,
  config?: Partial<SupervisorConfig>
): Supervisor {
  return new Supervisor(scheduler, correlationStore, gateway, config);
}
