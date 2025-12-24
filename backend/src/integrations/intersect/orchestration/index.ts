/**
 * INTERSECT Orchestration Module
 *
 * Implements the Scheduler-Agent-Supervisor pattern for resilient
 * activity orchestration across distributed instrument controllers.
 *
 * Components:
 * - Scheduler: Manages task queue with priority, retries, and deadlines
 * - Agent: Executes tasks by starting activities on controllers
 * - Supervisor: Monitors health, detects failures, triggers recovery
 */

// Scheduler
export {
  IScheduler,
  InMemoryScheduler,
  DatabaseScheduler,
  createScheduler,
  ScheduledTask,
  ScheduleTaskParams,
  TaskQuery,
  TaskStats,
  TaskStatus,
  TaskPriority,
} from './Scheduler';

// Agent
export {
  Agent,
  AgentPool,
  createAgent,
  createAgentPool,
  AgentConfig,
  AgentMetrics,
  TaskExecution,
} from './Agent';

// Supervisor
export {
  Supervisor,
  createSupervisor,
  SupervisorConfig,
  SupervisorMetrics,
  EscalationEvent,
  EscalationHandler,
  ControllerHealthStatus,
} from './Supervisor';
