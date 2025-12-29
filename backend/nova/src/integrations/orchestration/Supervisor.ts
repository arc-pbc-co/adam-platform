/**
 * Nova INTERSECT Activity Supervisor
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
} from './Scheduler';
import {
  ICorrelationStore,
  IIntersectGatewayService,
} from '../intersect-types';

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

const DEFAULT_SUPERVISOR_CONFIG: SupervisorConfig = {
  monitorIntervalMs: 30000,
  staleThresholdMs: 600000, // 10 minutes
  activityTimeoutMs: 3600000, // 1 hour
  autoRetryEnabled: true,
  escalationEnabled: true,
  healthCheckIntervalMs: 60000, // 1 minute
};

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
    this.config = { ...DEFAULT_SUPERVISOR_CONFIG, ...config };
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
    console.log('[Supervisor] Starting...');

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

    // Initial runs
    this.runMonitoringCycle();
    this.runHealthChecks();
  }

  stop(): void {
    if (!this.running) return;

    this.running = false;
    console.log('[Supervisor] Stopping...');

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

  getMetrics(): SupervisorMetrics {
    return { ...this.metrics };
  }

  onEscalation(handler: EscalationHandler): void {
    this.escalationHandlers.push(handler);
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
    const now = new Date();

    for (const task of runningTasks) {
      if (!task.lastAttempt) continue;
      const elapsed = now.getTime() - task.lastAttempt.getTime();

      if (elapsed > this.config.staleThresholdMs) {
        console.log(`[Supervisor] Stale activity detected: task ${task.id}`);
        this.metrics.staleActivitiesDetected++;
        await this.reconcileActivity(task);
      }
    }
  }

  private async reconcileActivity(task: ScheduledTask): Promise<void> {
    console.log(`[Supervisor] Reconciling stale activity: ${task.activityId}`);

    try {
      if (!task.activityId) {
        await this.scheduler.markFailed(task.id, 'No activity ID - cannot reconcile');
        return;
      }

      // Query actual status from controller
      const statusResponse = await this.gateway.getActivityStatus(task.controllerId, task.activityId);

      if (statusResponse.activityStatus === 'completed') {
        await this.handleLateCompletion(task);
      } else if (statusResponse.activityStatus === 'failed' || statusResponse.activityStatus === 'cancelled') {
        await this.handleActivityFailure(task, statusResponse.statusMsg || 'Activity failed');
      }
      // If still running, update last attempt time
      else if (statusResponse.activityStatus === 'running') {
        await this.scheduler.updateTask(task.id, { lastAttempt: new Date() });
      }
    } catch (error) {
      console.error(`[Supervisor] Error reconciling activity:`, error);
      await this.handleActivityFailure(task, (error as Error).message);
    }
  }

  private async handleLateCompletion(task: ScheduledTask): Promise<void> {
    console.log(`[Supervisor] Late completion detected for task ${task.id}`);
    await this.scheduler.markCompleted(task.id);
    if (task.activityId) {
      await this.correlationStore.updateStatus(task.activityId, 'completed');
    }
  }

  // ============================================================================
  // Timeout Enforcement
  // ============================================================================

  private async checkTimeouts(): Promise<void> {
    const runningTasks = await this.scheduler.getRunningTasks();
    const now = new Date();

    for (const task of runningTasks) {
      if (!task.startedAt) continue;
      const elapsed = now.getTime() - task.startedAt.getTime();

      if (elapsed > this.config.activityTimeoutMs) {
        await this.handleTimeout(task);
      }
    }
  }

  private async handleTimeout(task: ScheduledTask): Promise<void> {
    console.log(`[Supervisor] Timeout enforced for task ${task.id}`);
    this.metrics.timeoutsEnforced++;

    try {
      if (task.activityId) {
        await this.gateway.cancelActivity(task.controllerId, task.activityId, 'Timeout exceeded');
        await this.correlationStore.updateStatus(task.activityId, 'cancelled');
      }
    } catch (error) {
      console.error(`[Supervisor] Error cancelling timed-out activity:`, error);
    }

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
    if (task.retryCount >= task.maxRetries) return false;
    if (task.deadline && task.deadline < new Date()) return false;

    const nonRetryableErrors = ['invalid_options', 'unknown_activity', 'authorization_failed', 'resource_not_found'];
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
      console.log(`[Supervisor] Scheduled retry ${retriedTask.retryCount}/${retriedTask.maxRetries} for task ${task.id}`);
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
      await this.correlationStore.updateStatus(task.activityId, 'failed');
    }
  }

  // ============================================================================
  // Health Checks
  // ============================================================================

  private async runHealthChecks(): Promise<void> {
    if (!this.running) return;

    try {
      const controllers = await this.gateway.listControllers();
      this.metrics.healthChecksPerformed++;

      let online = 0;
      let offline = 0;

      for (const controller of controllers) {
        const health = await this.gateway.getControllerHealth(controller.controllerId);
        const status: ControllerHealthStatus = {
          controllerId: controller.controllerId,
          healthy: health.healthy,
          lastCheck: new Date(),
          consecutiveFailures: health.healthy ? 0 : (this.controllerHealth.get(controller.controllerId)?.consecutiveFailures || 0) + 1,
          error: health.message,
        };

        this.controllerHealth.set(controller.controllerId, status);

        if (health.healthy) {
          online++;
        } else {
          offline++;
          if (status.consecutiveFailures >= 3) {
            await this.escalate({
              type: 'controller_offline',
              controllerId: controller.controllerId,
              error: health.message,
              timestamp: new Date(),
            });
          }
        }
      }

      this.metrics.controllersOnline = online;
      this.metrics.controllersOffline = offline;
    } catch (error) {
      console.error('[Supervisor] Health check error:', error);
    }
  }

  // ============================================================================
  // Escalation
  // ============================================================================

  private async escalate(event: EscalationEvent): Promise<void> {
    if (!this.config.escalationEnabled) return;

    this.metrics.failuresEscalated++;
    console.log(`[Supervisor] Escalation: ${event.type}`, event);

    for (const handler of this.escalationHandlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error('[Supervisor] Escalation handler error:', error);
      }
    }
  }

  // ============================================================================
  // Manual Operations
  // ============================================================================

  async forceRetry(taskId: string): Promise<ScheduledTask | null> {
    const task = await this.scheduler.getTask(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
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

  getControllerHealth(): Map<string, ControllerHealthStatus> {
    return new Map(this.controllerHealth);
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

