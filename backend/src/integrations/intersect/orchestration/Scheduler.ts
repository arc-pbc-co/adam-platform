/**
 * INTERSECT Activity Scheduler
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
import {
  ActivityStatus,
  Correlation,
  KeyValue,
} from '../types';

// ============================================================================
// Types
// ============================================================================

export type TaskStatus = 'pending' | 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface ScheduledTask {
  id: string;
  experimentRunId: string;
  campaignId: string;
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
  campaignId: string;
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

// ============================================================================
// In-Memory Scheduler (for development/testing)
// ============================================================================

export class InMemoryScheduler implements IScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private defaultMaxRetries: number;
  private baseRetryDelayMs: number;
  private maxRetryDelayMs: number;

  constructor(config: {
    defaultMaxRetries?: number;
    baseRetryDelayMs?: number;
    maxRetryDelayMs?: number;
  } = {}) {
    this.defaultMaxRetries = config.defaultMaxRetries ?? 3;
    this.baseRetryDelayMs = config.baseRetryDelayMs ?? 1000;
    this.maxRetryDelayMs = config.maxRetryDelayMs ?? 300000; // 5 minutes
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
      maxRetries: params.maxRetries ?? this.defaultMaxRetries,
      createdAt: new Date(),
      scheduledAt: new Date(),
      deadline: params.deadline,
      metadata: params.metadata,
    };

    this.tasks.set(task.id, task);
    return task;
  }

  async getTask(taskId: string): Promise<ScheduledTask | null> {
    return this.tasks.get(taskId) || null;
  }

  async updateTask(taskId: string, updates: Partial<ScheduledTask>): Promise<ScheduledTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const updated = { ...task, ...updates };
    this.tasks.set(taskId, updated);
    return updated;
  }

  async cancelTask(taskId: string, reason: string): Promise<ScheduledTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.status === 'completed') {
      throw new Error(`Cannot cancel completed task: ${taskId}`);
    }

    const updated: ScheduledTask = {
      ...task,
      status: 'cancelled',
      error: reason,
      completedAt: new Date(),
    };

    this.tasks.set(taskId, updated);
    return updated;
  }

  async getNextTask(): Promise<ScheduledTask | null> {
    const readyTasks = await this.getReadyTasks(1);
    return readyTasks[0] || null;
  }

  async getReadyTasks(limit: number = 10): Promise<ScheduledTask[]> {
    const now = new Date();
    const tasks = Array.from(this.tasks.values())
      .filter(t => {
        // Must be pending or scheduled for retry
        if (t.status !== 'pending' && t.status !== 'scheduled') return false;

        // Check if retry time has passed
        if (t.nextRetry && t.nextRetry > now) return false;

        // Check deadline
        if (t.deadline && t.deadline < now) return false;

        return true;
      })
      .sort((a, b) => {
        // Sort by priority first
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Then by scheduled time
        const aTime = a.scheduledAt?.getTime() ?? a.createdAt.getTime();
        const bTime = b.scheduledAt?.getTime() ?? b.createdAt.getTime();
        return aTime - bTime;
      });

    return tasks.slice(0, limit);
  }

  async getPendingTasks(): Promise<ScheduledTask[]> {
    return Array.from(this.tasks.values())
      .filter(t => t.status === 'pending' || t.status === 'scheduled');
  }

  async getRunningTasks(): Promise<ScheduledTask[]> {
    return Array.from(this.tasks.values())
      .filter(t => t.status === 'running');
  }

  async getFailedTasks(): Promise<ScheduledTask[]> {
    return Array.from(this.tasks.values())
      .filter(t => t.status === 'failed');
  }

  async queryTasks(query: TaskQuery): Promise<ScheduledTask[]> {
    let tasks = Array.from(this.tasks.values());

    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      tasks = tasks.filter(t => statuses.includes(t.status));
    }

    if (query.experimentRunId) {
      tasks = tasks.filter(t => t.experimentRunId === query.experimentRunId);
    }

    if (query.campaignId) {
      tasks = tasks.filter(t => t.campaignId === query.campaignId);
    }

    if (query.controllerId) {
      tasks = tasks.filter(t => t.controllerId === query.controllerId);
    }

    if (query.priority) {
      tasks = tasks.filter(t => t.priority === query.priority);
    }

    // Sort by creation time descending
    tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 100;

    return tasks.slice(offset, offset + limit);
  }

  async getTaskStats(): Promise<TaskStats> {
    const tasks = Array.from(this.tasks.values());

    const stats: TaskStats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      scheduled: tasks.filter(t => t.status === 'scheduled').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
      timeout: tasks.filter(t => t.status === 'timeout').length,
    };

    // Calculate average completion time
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.startedAt && t.completedAt);
    if (completedTasks.length > 0) {
      const totalTime = completedTasks.reduce((sum, t) => {
        return sum + (t.completedAt!.getTime() - t.startedAt!.getTime());
      }, 0);
      stats.avgCompletionTimeMs = totalTime / completedTasks.length;
    }

    // Calculate average retry count
    const retriedTasks = tasks.filter(t => t.retryCount > 0);
    if (retriedTasks.length > 0) {
      stats.avgRetryCount = retriedTasks.reduce((sum, t) => sum + t.retryCount, 0) / retriedTasks.length;
    }

    return stats;
  }

  async markStarted(taskId: string, activityId: string): Promise<ScheduledTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const updated: ScheduledTask = {
      ...task,
      status: 'running',
      activityId,
      startedAt: new Date(),
      lastAttempt: new Date(),
    };

    this.tasks.set(taskId, updated);
    return updated;
  }

  async markCompleted(taskId: string): Promise<ScheduledTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const updated: ScheduledTask = {
      ...task,
      status: 'completed',
      completedAt: new Date(),
    };

    this.tasks.set(taskId, updated);
    return updated;
  }

  async markFailed(taskId: string, error: string): Promise<ScheduledTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const updated: ScheduledTask = {
      ...task,
      status: 'failed',
      error,
      lastAttempt: new Date(),
    };

    this.tasks.set(taskId, updated);
    return updated;
  }

  async scheduleRetry(taskId: string): Promise<ScheduledTask | null> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.retryCount >= task.maxRetries) {
      return null; // No more retries allowed
    }

    const newRetryCount = task.retryCount + 1;
    const delay = this.calculateBackoff(newRetryCount);
    const nextRetry = new Date(Date.now() + delay);

    const updated: ScheduledTask = {
      ...task,
      status: 'scheduled',
      retryCount: newRetryCount,
      nextRetry,
      error: undefined, // Clear previous error
    };

    this.tasks.set(taskId, updated);
    return updated;
  }

  private calculateBackoff(retryCount: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = Math.pow(2, retryCount) * this.baseRetryDelayMs;
    const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
    const delay = Math.min(exponentialDelay + jitter, this.maxRetryDelayMs);
    return Math.floor(delay);
  }

  // Utility methods for testing
  clear(): void {
    this.tasks.clear();
  }

  getAll(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }
}

// ============================================================================
// Database-backed Scheduler (for production)
// ============================================================================

export interface DatabasePool {
  query(sql: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }>;
}

export class DatabaseScheduler implements IScheduler {
  private db: DatabasePool;
  private defaultMaxRetries: number;
  private baseRetryDelayMs: number;
  private maxRetryDelayMs: number;

  constructor(
    db: DatabasePool,
    config: {
      defaultMaxRetries?: number;
      baseRetryDelayMs?: number;
      maxRetryDelayMs?: number;
    } = {}
  ) {
    this.db = db;
    this.defaultMaxRetries = config.defaultMaxRetries ?? 3;
    this.baseRetryDelayMs = config.baseRetryDelayMs ?? 1000;
    this.maxRetryDelayMs = config.maxRetryDelayMs ?? 300000;
  }

  async scheduleTask(params: ScheduleTaskParams): Promise<ScheduledTask> {
    const id = uuidv4();
    const now = new Date();

    const result = await this.db.query(
      `INSERT INTO intersect_scheduled_tasks
       (id, experiment_run_id, campaign_id, controller_id, activity_name, activity_options,
        status, priority, retry_count, max_retries, created_at, scheduled_at, deadline, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        id,
        params.experimentRunId,
        params.campaignId,
        params.controllerId,
        params.activityName,
        JSON.stringify(params.activityOptions),
        'pending',
        params.priority ?? 'normal',
        0,
        params.maxRetries ?? this.defaultMaxRetries,
        now,
        now,
        params.deadline,
        params.metadata ? JSON.stringify(params.metadata) : null,
      ]
    );

    return this.rowToTask(result.rows[0]);
  }

  async getTask(taskId: string): Promise<ScheduledTask | null> {
    const result = await this.db.query(
      `SELECT * FROM intersect_scheduled_tasks WHERE id = $1`,
      [taskId]
    );

    return result.rows[0] ? this.rowToTask(result.rows[0]) : null;
  }

  async updateTask(taskId: string, updates: Partial<ScheduledTask>): Promise<ScheduledTask> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      status: 'status',
      priority: 'priority',
      retryCount: 'retry_count',
      activityId: 'activity_id',
      startedAt: 'started_at',
      completedAt: 'completed_at',
      lastAttempt: 'last_attempt',
      nextRetry: 'next_retry',
      error: 'error',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (key in updates) {
        setClauses.push(`${dbField} = $${paramIndex}`);
        values.push((updates as any)[key]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      const existing = await this.getTask(taskId);
      if (!existing) throw new Error(`Task not found: ${taskId}`);
      return existing;
    }

    values.push(taskId);
    const result = await this.db.query(
      `UPDATE intersect_scheduled_tasks
       SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return this.rowToTask(result.rows[0]);
  }

  async cancelTask(taskId: string, reason: string): Promise<ScheduledTask> {
    const result = await this.db.query(
      `UPDATE intersect_scheduled_tasks
       SET status = 'cancelled', error = $1, completed_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND status NOT IN ('completed', 'cancelled')
       RETURNING *`,
      [reason, taskId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Task not found or already completed: ${taskId}`);
    }

    return this.rowToTask(result.rows[0]);
  }

  async getNextTask(): Promise<ScheduledTask | null> {
    const result = await this.db.query(
      `SELECT * FROM intersect_scheduled_tasks
       WHERE status IN ('pending', 'scheduled')
       AND (next_retry IS NULL OR next_retry <= NOW())
       AND (deadline IS NULL OR deadline > NOW())
       ORDER BY
         CASE priority
           WHEN 'critical' THEN 0
           WHEN 'high' THEN 1
           WHEN 'normal' THEN 2
           WHEN 'low' THEN 3
         END,
         scheduled_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`
    );

    return result.rows[0] ? this.rowToTask(result.rows[0]) : null;
  }

  async getReadyTasks(limit: number = 10): Promise<ScheduledTask[]> {
    const result = await this.db.query(
      `SELECT * FROM intersect_scheduled_tasks
       WHERE status IN ('pending', 'scheduled')
       AND (next_retry IS NULL OR next_retry <= NOW())
       AND (deadline IS NULL OR deadline > NOW())
       ORDER BY
         CASE priority
           WHEN 'critical' THEN 0
           WHEN 'high' THEN 1
           WHEN 'normal' THEN 2
           WHEN 'low' THEN 3
         END,
         scheduled_at ASC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => this.rowToTask(row));
  }

  async getPendingTasks(): Promise<ScheduledTask[]> {
    const result = await this.db.query(
      `SELECT * FROM intersect_scheduled_tasks
       WHERE status IN ('pending', 'scheduled')
       ORDER BY created_at ASC`
    );

    return result.rows.map(row => this.rowToTask(row));
  }

  async getRunningTasks(): Promise<ScheduledTask[]> {
    const result = await this.db.query(
      `SELECT * FROM intersect_scheduled_tasks
       WHERE status = 'running'
       ORDER BY started_at ASC`
    );

    return result.rows.map(row => this.rowToTask(row));
  }

  async getFailedTasks(): Promise<ScheduledTask[]> {
    const result = await this.db.query(
      `SELECT * FROM intersect_scheduled_tasks
       WHERE status = 'failed'
       ORDER BY last_attempt DESC`
    );

    return result.rows.map(row => this.rowToTask(row));
  }

  async queryTasks(query: TaskQuery): Promise<ScheduledTask[]> {
    const conditions: string[] = ['1=1'];
    const values: any[] = [];
    let paramIndex = 1;

    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      conditions.push(`status = ANY($${paramIndex})`);
      values.push(statuses);
      paramIndex++;
    }

    if (query.experimentRunId) {
      conditions.push(`experiment_run_id = $${paramIndex}`);
      values.push(query.experimentRunId);
      paramIndex++;
    }

    if (query.campaignId) {
      conditions.push(`campaign_id = $${paramIndex}`);
      values.push(query.campaignId);
      paramIndex++;
    }

    if (query.controllerId) {
      conditions.push(`controller_id = $${paramIndex}`);
      values.push(query.controllerId);
      paramIndex++;
    }

    if (query.priority) {
      conditions.push(`priority = $${paramIndex}`);
      values.push(query.priority);
      paramIndex++;
    }

    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;

    values.push(limit, offset);

    const result = await this.db.query(
      `SELECT * FROM intersect_scheduled_tasks
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      values
    );

    return result.rows.map(row => this.rowToTask(row));
  }

  async getTaskStats(): Promise<TaskStats> {
    const result = await this.db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
        COUNT(*) FILTER (WHERE status = 'running') as running,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'timeout') as timeout,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)
          FILTER (WHERE status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL)
          as avg_completion_time_ms,
        AVG(retry_count) FILTER (WHERE retry_count > 0) as avg_retry_count
      FROM intersect_scheduled_tasks
    `);

    const row = result.rows[0];
    return {
      total: parseInt(row.total, 10),
      pending: parseInt(row.pending, 10),
      scheduled: parseInt(row.scheduled, 10),
      running: parseInt(row.running, 10),
      completed: parseInt(row.completed, 10),
      failed: parseInt(row.failed, 10),
      cancelled: parseInt(row.cancelled, 10),
      timeout: parseInt(row.timeout, 10),
      avgCompletionTimeMs: row.avg_completion_time_ms ? parseFloat(row.avg_completion_time_ms) : undefined,
      avgRetryCount: row.avg_retry_count ? parseFloat(row.avg_retry_count) : undefined,
    };
  }

  async markStarted(taskId: string, activityId: string): Promise<ScheduledTask> {
    const result = await this.db.query(
      `UPDATE intersect_scheduled_tasks
       SET status = 'running', activity_id = $1, started_at = NOW(), last_attempt = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [activityId, taskId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return this.rowToTask(result.rows[0]);
  }

  async markCompleted(taskId: string): Promise<ScheduledTask> {
    const result = await this.db.query(
      `UPDATE intersect_scheduled_tasks
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [taskId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return this.rowToTask(result.rows[0]);
  }

  async markFailed(taskId: string, error: string): Promise<ScheduledTask> {
    const result = await this.db.query(
      `UPDATE intersect_scheduled_tasks
       SET status = 'failed', error = $1, last_attempt = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [error, taskId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return this.rowToTask(result.rows[0]);
  }

  async scheduleRetry(taskId: string): Promise<ScheduledTask | null> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.retryCount >= task.maxRetries) {
      return null;
    }

    const newRetryCount = task.retryCount + 1;
    const delay = this.calculateBackoff(newRetryCount);
    const nextRetry = new Date(Date.now() + delay);

    const result = await this.db.query(
      `UPDATE intersect_scheduled_tasks
       SET status = 'scheduled', retry_count = $1, next_retry = $2, error = NULL, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [newRetryCount, nextRetry, taskId]
    );

    return this.rowToTask(result.rows[0]);
  }

  private calculateBackoff(retryCount: number): number {
    const exponentialDelay = Math.pow(2, retryCount) * this.baseRetryDelayMs;
    const jitter = Math.random() * 0.3 * exponentialDelay;
    const delay = Math.min(exponentialDelay + jitter, this.maxRetryDelayMs);
    return Math.floor(delay);
  }

  private rowToTask(row: any): ScheduledTask {
    return {
      id: row.id,
      experimentRunId: row.experiment_run_id,
      campaignId: row.campaign_id,
      controllerId: row.controller_id,
      activityName: row.activity_name,
      activityOptions: typeof row.activity_options === 'string'
        ? JSON.parse(row.activity_options)
        : row.activity_options,
      status: row.status,
      priority: row.priority,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      createdAt: new Date(row.created_at),
      scheduledAt: row.scheduled_at ? new Date(row.scheduled_at) : undefined,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      lastAttempt: row.last_attempt ? new Date(row.last_attempt) : undefined,
      nextRetry: row.next_retry ? new Date(row.next_retry) : undefined,
      deadline: row.deadline ? new Date(row.deadline) : undefined,
      activityId: row.activity_id,
      error: row.error,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : undefined,
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createScheduler(
  db?: DatabasePool,
  config?: {
    defaultMaxRetries?: number;
    baseRetryDelayMs?: number;
    maxRetryDelayMs?: number;
  }
): IScheduler {
  if (db) {
    return new DatabaseScheduler(db, config);
  }
  return new InMemoryScheduler(config);
}
