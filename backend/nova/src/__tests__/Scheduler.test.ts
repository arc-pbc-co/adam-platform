import { createScheduler, ScheduledTask, TaskStatus, TaskPriority } from '../integrations/orchestration/Scheduler';

describe('Scheduler', () => {
  let scheduler: ReturnType<typeof createScheduler>;

  beforeEach(() => {
    scheduler = createScheduler({
      defaultMaxRetries: 3,
      baseRetryDelayMs: 1000,
      maxRetryDelayMs: 60000,
    });
  });

  describe('scheduleTask', () => {
    it('should create a new task with default values', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        controllerId: 'ctrl-1',
        activityName: 'print_sample',
        activityOptions: [{ key: 'temperature', value: '200' }],
      });

      expect(task.id).toBeDefined();
      expect(task.experimentRunId).toBe('exp-123');
      expect(task.controllerId).toBe('ctrl-1');
      expect(task.activityName).toBe('print_sample');
      expect(task.status).toBe('pending' as TaskStatus);
      expect(task.priority).toBe('normal' as TaskPriority);
      expect(task.retryCount).toBe(0);
    });

    it('should create a task with custom priority', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        controllerId: 'ctrl-1',
        activityName: 'emergency_stop',
        activityOptions: [],
        priority: 'critical',
      });

      expect(task.priority).toBe('critical' as TaskPriority);
    });

    it('should create a task with metadata', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        controllerId: 'ctrl-1',
        activityName: 'step_1',
        activityOptions: [],
        metadata: { stepIndex: 0, totalSteps: 3 },
      });

      expect(task.metadata).toBeDefined();
      expect(task.metadata?.stepIndex).toBe(0);
    });
  });

  describe('getTask', () => {
    it('should retrieve an existing task', async () => {
      const created = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        controllerId: 'ctrl-1',
        activityName: 'test',
        activityOptions: [],
      });

      const retrieved = await scheduler.getTask(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent task', async () => {
      const task = await scheduler.getTask('non-existent-id');
      expect(task).toBeNull();
    });
  });

  describe('updateTask', () => {
    it('should update task properties', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        controllerId: 'ctrl-1',
        activityName: 'test',
        activityOptions: [],
      });

      const updated = await scheduler.updateTask(task.id, {
        priority: 'high',
      });

      expect(updated.priority).toBe('high' as TaskPriority);
    });
  });

  describe('cancelTask', () => {
    it('should cancel a pending task', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        controllerId: 'ctrl-1',
        activityName: 'test',
        activityOptions: [],
      });

      const cancelled = await scheduler.cancelTask(task.id, 'User requested');
      expect(cancelled.status).toBe('cancelled' as TaskStatus);
      expect(cancelled.error).toBe('User requested');
    });
  });

  describe('getNextTask', () => {
    it('should return highest priority task first', async () => {
      await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        controllerId: 'ctrl-1',
        activityName: 'low_priority',
        activityOptions: [],
        priority: 'low',
      });

      const highPriorityTask = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        controllerId: 'ctrl-1',
        activityName: 'high_priority',
        activityOptions: [],
        priority: 'high',
      });

      const next = await scheduler.getNextTask();
      expect(next?.id).toBe(highPriorityTask.id);
    });

    it('should return tasks in order', async () => {
      const task1 = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        controllerId: 'ctrl-1',
        activityName: 'step_1',
        activityOptions: [],
        priority: 'normal',
      });

      await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        controllerId: 'ctrl-1',
        activityName: 'step_2',
        activityOptions: [],
        priority: 'critical',
      });

      // Critical priority should be returned first
      const next = await scheduler.getNextTask();
      expect(next?.activityName).toBe('step_2');
    });
  });

  describe('task lifecycle', () => {
    it('should transition through task states', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        controllerId: 'ctrl-1',
        activityName: 'lifecycle_test',
        activityOptions: [],
      });

      // Initial state
      expect(task.status).toBe('pending' as TaskStatus);

      // Start task
      const started = await scheduler.markStarted(task.id, 'activity-123');
      expect(started.status).toBe('running' as TaskStatus);
      expect(started.activityId).toBe('activity-123');
      expect(started.startedAt).toBeDefined();

      // Complete task
      const completed = await scheduler.markCompleted(task.id);
      expect(completed.status).toBe('completed' as TaskStatus);
      expect(completed.completedAt).toBeDefined();
    });

    it('should handle task failure', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        controllerId: 'ctrl-1',
        activityName: 'failing_task',
        activityOptions: [],
      });

      await scheduler.markStarted(task.id, 'activity-123');
      const failed = await scheduler.markFailed(task.id, 'Network timeout');

      expect(failed.status).toBe('failed' as TaskStatus);
      expect(failed.error).toBe('Network timeout');
    });
  });

  describe('retry scheduling', () => {
    it('should schedule retry with exponential backoff', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        controllerId: 'ctrl-1',
        activityName: 'retry_test',
        activityOptions: [],
        maxRetries: 3,
      });

      await scheduler.markStarted(task.id, 'activity-1');
      await scheduler.markFailed(task.id, 'Error');

      const retried = await scheduler.scheduleRetry(task.id);
      expect(retried).toBeDefined();
      expect(retried?.retryCount).toBe(1);
      // Task is set to 'scheduled' with nextRetry date
      expect(retried?.status).toBe('scheduled' as TaskStatus);
      expect(retried?.nextRetry).toBeDefined();
    });

    it('should not retry when max retries exceeded', async () => {
      const task = await scheduler.scheduleTask({
        experimentRunId: 'exp-123',
        controllerId: 'ctrl-1',
        activityName: 'no_retry',
        activityOptions: [],
        maxRetries: 0,
      });

      await scheduler.markStarted(task.id, 'activity-1');
      await scheduler.markFailed(task.id, 'Error');

      const retried = await scheduler.scheduleRetry(task.id);
      expect(retried).toBeNull();
    });
  });

  describe('query tasks', () => {
    beforeEach(async () => {
      // Set up tasks in various states
      const t1 = await scheduler.scheduleTask({
        experimentRunId: 'exp-1',
        controllerId: 'ctrl-1',
        activityName: 'task1',
        activityOptions: [],
      });
      const t2 = await scheduler.scheduleTask({
        experimentRunId: 'exp-1',
        controllerId: 'ctrl-2',
        activityName: 'task2',
        activityOptions: [],
      });
      await scheduler.scheduleTask({
        experimentRunId: 'exp-2',
        controllerId: 'ctrl-1',
        activityName: 'task3',
        activityOptions: [],
      });

      await scheduler.markStarted(t1.id, 'act-1');
      await scheduler.markStarted(t2.id, 'act-2');
      await scheduler.markCompleted(t2.id);
    });

    it('should query by experiment run', async () => {
      const tasks = await scheduler.queryTasks({ experimentRunId: 'exp-1' });
      expect(tasks.length).toBe(2);
    });

    it('should query by controller', async () => {
      const tasks = await scheduler.queryTasks({ controllerId: 'ctrl-1' });
      expect(tasks.length).toBe(2);
    });

    it('should query by status', async () => {
      const running = await scheduler.getRunningTasks();
      expect(running.length).toBe(1);
      expect(running[0].activityName).toBe('task1');
    });
  });

  describe('getTaskStats', () => {
    it('should return task statistics', async () => {
      await scheduler.scheduleTask({
        experimentRunId: 'exp-1',
        controllerId: 'ctrl-1',
        activityName: 'stat_task',
        activityOptions: [],
      });

      const stats = await scheduler.getTaskStats();
      expect(stats.pending).toBeGreaterThanOrEqual(1);
      expect(stats.total).toBeGreaterThanOrEqual(1);
    });
  });
});

