# Orchestration Patterns

ADAM implements the **Scheduler-Agent-Supervisor** pattern for resilient orchestration of long-running activities across distributed instrument controllers.

## Pattern Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                  Scheduler-Agent-Supervisor                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐         ┌─────────────┐                        │
│  │  Scheduler  │────────►│   Agent     │                        │
│  │             │  Tasks  │   Pool      │                        │
│  └──────┬──────┘         └──────┬──────┘                        │
│         │                       │                                │
│         │ Queue                 │ Execute                        │
│         │                       │                                │
│         │                       ▼                                │
│         │              ┌─────────────┐                          │
│         │              │ Controllers │                          │
│         │              └──────┬──────┘                          │
│         │                     │                                  │
│         │                     │ Status                           │
│         ▼                     ▼                                  │
│  ┌─────────────────────────────────────┐                        │
│  │           Supervisor                 │                        │
│  │  • Monitor health                    │                        │
│  │  • Detect failures                   │                        │
│  │  • Trigger recovery                  │                        │
│  └─────────────────────────────────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Scheduler

The Scheduler manages a priority queue of tasks:

### Task Structure

```typescript
interface ScheduledTask {
  id: string;
  type: string;
  priority: TaskPriority;  // 'low' | 'normal' | 'high' | 'critical'
  status: TaskStatus;
  payload: any;
  
  // Scheduling
  scheduledAt: Date;
  deadline?: Date;
  
  // Retry configuration
  retryCount: number;
  maxRetries: number;
  
  // Tracking
  activityId?: string;
  workOrderId?: string;
  experimentId?: string;
}
```

### Scheduling Tasks

```typescript
const scheduler = createScheduler({
  maxConcurrentTasks: 10,
  defaultPriority: 'normal',
  defaultMaxRetries: 3
});

// Schedule a task
const task = await scheduler.scheduleTask({
  type: 'execute_activity',
  payload: {
    controllerId: 'desktop-metal-x25',
    activityName: 'print_job',
    options: [...]
  },
  priority: 'high',
  deadline: new Date(Date.now() + 3600000)  // 1 hour
});
```

### Priority Handling

| Priority | Use Case | Preemption |
|----------|----------|------------|
| `critical` | Safety operations | Immediate |
| `high` | Time-sensitive experiments | Next slot |
| `normal` | Standard operations | FIFO |
| `low` | Background tasks | When idle |

### Task Queries

```typescript
// Get task status
const task = await scheduler.getTask(taskId);

// Query tasks
const pendingTasks = await scheduler.queryTasks({
  status: 'pending',
  controllerId: 'desktop-metal-x25'
});

// Get statistics
const stats = await scheduler.getStats();
// { pending: 5, running: 3, completed: 150, failed: 2 }
```

## Agent

Agents execute tasks by starting activities on controllers:

### Agent Configuration

```typescript
const agent = createAgent({
  agentId: 'agent-001',
  scheduler,
  gateway,
  correlationStore,
  maxConcurrentExecutions: 5,
  pollIntervalMs: 1000
});
```

### Execution Flow

```typescript
// Agent claims and executes tasks
agent.start();

// Internal execution flow:
// 1. Poll scheduler for next task
// 2. Start activity on controller via gateway
// 3. Create correlation record
// 4. Wait for completion event
// 5. Update task status
// 6. Repeat
```

### Task Execution

```typescript
interface TaskExecution {
  taskId: string;
  agentId: string;
  activityId: string;
  startedAt: Date;
  status: 'executing' | 'completed' | 'failed';
  result?: any;
  error?: string;
}
```

### Metrics

```typescript
const metrics = agent.getMetrics();
// {
//   tasksExecuted: 150,
//   tasksSucceeded: 145,
//   tasksFailed: 5,
//   avgExecutionTimeMs: 125000,
//   currentExecutions: 3
// }
```

## Supervisor

The Supervisor monitors system health and handles failures:

### Configuration

```typescript
const supervisor = createSupervisor({
  scheduler,
  gateway,
  correlationStore,
  eventBridge,
  monitorIntervalMs: 30000,
  staleThresholdMs: 600000,     // 10 minutes
  activityTimeoutMs: 3600000,   // 1 hour
  autoRetryEnabled: true,
  escalationEnabled: true,
  healthCheckIntervalMs: 60000
});
```

### Monitoring Functions

```typescript
// Start monitoring
supervisor.start();

// Supervisor performs:
// 1. Check controller health periodically
// 2. Detect stale activities (no updates)
// 3. Reconcile activity states with controllers
// 4. Retry failed tasks (if retries remaining)
// 5. Escalate persistent failures
```

### Failure Detection

| Detection | Trigger | Action |
|-----------|---------|--------|
| Controller unhealthy | Health check fails 3x | Pause tasks, alert |
| Activity stale | No progress in threshold | Query controller |
| Activity timeout | Exceeded deadline | Cancel, retry |
| Repeated failures | Max retries exceeded | Escalate |

### Escalation

```typescript
interface EscalationEvent {
  type: 'task_failed' | 'controller_unhealthy' | 'activity_timeout';
  taskId?: string;
  controllerId: string;
  reason: string;
  retryCount: number;
  timestamp: Date;
}

// Register escalation handler
supervisor.onEscalation(async (event) => {
  await notifyOperators(event);
  await createIncident(event);
});
```

### Recovery Actions

```typescript
// Manual recovery options
await supervisor.retryTask(taskId);
await supervisor.cancelTask(taskId);
await supervisor.reconcileController(controllerId);
```

## Complete Integration

```typescript
// Initialize orchestration
const scheduler = createScheduler(schedulerConfig);
const agents = Array.from({ length: 3 }, (_, i) => 
  createAgent({ agentId: `agent-${i}`, scheduler, gateway, correlationStore })
);
const supervisor = createSupervisor({
  scheduler, gateway, correlationStore, eventBridge
});

// Start orchestration
await Promise.all([
  ...agents.map(a => a.start()),
  supervisor.start()
]);

// Schedule work
await scheduler.scheduleTask({
  type: 'execute_activity',
  payload: workOrder,
  priority: 'normal'
});
```

---

*Next: [System-of-Systems](../system/system-of-systems.md) - Component architecture*

