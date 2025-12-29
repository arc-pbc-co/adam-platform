/**
 * Nova INTERSECT Activity Scheduler
 *
 * Manages scheduling of INTERSECT activities with:
 * - Durable task persistence
 * - Retry logic with exponential backoff
 * - Priority queuing
 * - Deadline management
 *
 * Part of the Scheduler-Agent-Supervisor pattern for resilient orchestration.
 */

import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';
import { KeyValue } from '../intersect-types';

// ============================================================================
// Types
// ============================================================================

export type TaskStatus = 'pending' | 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface ScheduledTask {
  id: string;
  experimentRunId: string;
  campaignId?: string;
  controllerId: string;
  activityName: string;
  activityOptions: KeyValue[];
  status: TaskStatus;
  priority: TaskPriority;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  lastAttempt?: Date;
  nextRetry?: Date;
  deadline?: Date;
  activityId?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ScheduleTaskParams {
  experimentRunId: string;
  campaignId?: string;
  controllerId: string;
  activityName: string;
  activityOptions: KeyValue[];
  priority?: TaskPriority;
  maxRetries?: number;
  deadline?: Date;
  metadata?: Record<string, any>;
}

export interface TaskQuery {
  status?: TaskStatus | TaskStatus[];
  experimentRunId?: string;
  campaignId?: string;
  controllerId?: string;
  priority?: TaskPriority;
  limit?: number;
  offset?: number;
}

export interface TaskStats {
  total: number;
  pending: number;
  scheduled: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  timeout: number;
  avgCompletionTimeMs?: number;
  avgRetryCount?: number;
}

// ============================================================================
// Scheduler Interface
// ============================================================================

export interface IScheduler {
  // Task management
  scheduleTask(params: ScheduleTaskParams): Promise<ScheduledTask>;
  getTask(taskId: string): Promise<ScheduledTask | null>;
  updateTask(taskId: string, updates: Partial<ScheduledTask>): Promise<ScheduledTask>;
  cancelTask(taskId: string, reason: string): Promise<ScheduledTask>;

  // Queue operations
  getNextTask(): Promise<ScheduledTask | null>;
  getReadyTasks(limit?: number): Promise<ScheduledTask[]>;
  getPendingTasks(): Promise<ScheduledTask[]>;
  getRunningTasks(): Promise<ScheduledTask[]>;
  getFailedTasks(): Promise<ScheduledTask[]>;

  // Query
  queryTasks(query: TaskQuery): Promise<ScheduledTask[]>;
  getTaskStats(): Promise<TaskStats>;

  // Lifecycle
  markStarted(taskId: string, activityId: string): Promise<ScheduledTask>;
  markCompleted(taskId: string): Promise<ScheduledTask>;
  markFailed(taskId: string, error: string): Promise<ScheduledTask>;
  scheduleRetry(taskId: string): Promise<ScheduledTask | null>;
}

export interface SchedulerConfig {
  defaultMaxRetries: number;
  baseRetryDelayMs: number;
  maxRetryDelayMs: number;
}

const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  defaultMaxRetries: 3,
  baseRetryDelayMs: 1000,
  maxRetryDelayMs: 300000, // 5 minutes
};

// ============================================================================
// In-Memory Scheduler
// ============================================================================

export class InMemoryScheduler implements IScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private config: SchedulerConfig;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...config };
  }

  async scheduleTask(params: ScheduleTaskParams): Promise<ScheduledTask> {
    const task: ScheduledTask = {
      id: uuidv4(),
      experimentRunId: params.experimentRunId,
      campaignId: params.campaignId,
      controllerId: params.controllerId,
      activityName: params.activityName,
      activityOptions: params.activityOptions,
      status: 'pending',
      priority: params.priority ?? 'normal',
      retryCount: 0,
      maxRetries: params.maxRetries ?? this.config.defaultMaxRetries,
      createdAt: new Date(),
      scheduledAt: new Date(),
      deadline: params.deadline,
      metadata: params.metadata,
    };

    this.tasks.set(task.id, task);
    console.log(`[Scheduler] Task scheduled: ${task.id} - ${task.activityName}`);
    return task;
  }

  async getTask(taskId: string): Promise<ScheduledTask | null> {
    return this.tasks.get(taskId) || null;
  }

  async updateTask(taskId: string, updates: Partial<ScheduledTask>): Promise<ScheduledTask> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    const updated = { ...task, ...updates };
    this.tasks.set(taskId, updated);
    return updated;
  }

  async cancelTask(taskId: string, reason: string): Promise<ScheduledTask> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    if (task.status === 'completed') throw new Error(`Cannot cancel completed task: ${taskId}`);
    const updated: ScheduledTask = { ...task, status: 'cancelled', error: reason, completedAt: new Date() };
    this.tasks.set(taskId, updated);
    return updated;
  }

  async getNextTask(): Promise<ScheduledTask | null> {
    const readyTasks = await this.getReadyTasks(1);
    return readyTasks[0] || null;
  }

  async getReadyTasks(limit: number = 10): Promise<ScheduledTask[]> {
    const now = new Date();
    return Array.from(this.tasks.values())
      .filter(t => {
        if (t.status !== 'pending' && t.status !== 'scheduled') return false;
        if (t.nextRetry && t.nextRetry > now) return false;
        if (t.deadline && t.deadline < now) return false;
        return true;
      })
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return (a.scheduledAt?.getTime() ?? a.createdAt.getTime()) - (b.scheduledAt?.getTime() ?? b.createdAt.getTime());
      })
      .slice(0, limit);
  }

  async getPendingTasks(): Promise<ScheduledTask[]> {
    return Array.from(this.tasks.values()).filter(t => t.status === 'pending' || t.status === 'scheduled');
  }

  async getRunningTasks(): Promise<ScheduledTask[]> {
    return Array.from(this.tasks.values()).filter(t => t.status === 'running');
  }

  async getFailedTasks(): Promise<ScheduledTask[]> {
    return Array.from(this.tasks.values()).filter(t => t.status === 'failed');
  }

  async queryTasks(query: TaskQuery): Promise<ScheduledTask[]> {
    let tasks = Array.from(this.tasks.values());
    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      tasks = tasks.filter(t => statuses.includes(t.status));
    }
    if (query.experimentRunId) tasks = tasks.filter(t => t.experimentRunId === query.experimentRunId);
    if (query.campaignId) tasks = tasks.filter(t => t.campaignId === query.campaignId);
    if (query.controllerId) tasks = tasks.filter(t => t.controllerId === query.controllerId);
    if (query.priority) tasks = tasks.filter(t => t.priority === query.priority);
    tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return tasks.slice(query.offset ?? 0, (query.offset ?? 0) + (query.limit ?? 100));
  }

  async getTaskStats(): Promise<TaskStats> {
    const tasks = Array.from(this.tasks.values());
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.startedAt && t.completedAt);
    const retriedTasks = tasks.filter(t => t.retryCount > 0);
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      scheduled: tasks.filter(t => t.status === 'scheduled').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
      timeout: tasks.filter(t => t.status === 'timeout').length,
      avgCompletionTimeMs: completedTasks.length > 0
        ? completedTasks.reduce((sum, t) => sum + (t.completedAt!.getTime() - t.startedAt!.getTime()), 0) / completedTasks.length
        : undefined,
      avgRetryCount: retriedTasks.length > 0
        ? retriedTasks.reduce((sum, t) => sum + t.retryCount, 0) / retriedTasks.length
        : undefined,
    };
  }

  async markStarted(taskId: string, activityId: string): Promise<ScheduledTask> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    const updated: ScheduledTask = { ...task, status: 'running', activityId, startedAt: new Date(), lastAttempt: new Date() };
    this.tasks.set(taskId, updated);
    return updated;
  }

  async markCompleted(taskId: string): Promise<ScheduledTask> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    const updated: ScheduledTask = { ...task, status: 'completed', completedAt: new Date() };
    this.tasks.set(taskId, updated);
    return updated;
  }

  async markFailed(taskId: string, error: string): Promise<ScheduledTask> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    const updated: ScheduledTask = { ...task, status: 'failed', error, lastAttempt: new Date() };
    this.tasks.set(taskId, updated);
    return updated;
  }

  async scheduleRetry(taskId: string): Promise<ScheduledTask | null> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    if (task.retryCount >= task.maxRetries) return null;
    const newRetryCount = task.retryCount + 1;
    const delay = this.calculateBackoff(newRetryCount);
    const updated: ScheduledTask = {
      ...task,
      status: 'scheduled',
      retryCount: newRetryCount,
      nextRetry: new Date(Date.now() + delay),
      error: undefined,
    };
    this.tasks.set(taskId, updated);
    return updated;
  }

  private calculateBackoff(retryCount: number): number {
    const exponentialDelay = Math.pow(2, retryCount) * this.config.baseRetryDelayMs;
    const jitter = Math.random() * 0.3 * exponentialDelay;
    return Math.min(Math.floor(exponentialDelay + jitter), this.config.maxRetryDelayMs);
  }

  clear(): void {
    this.tasks.clear();
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createScheduler(config?: Partial<SchedulerConfig>): IScheduler {
  return new InMemoryScheduler(config);
}

