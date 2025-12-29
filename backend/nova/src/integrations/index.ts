/**
 * Nova INTERSECT Integration Module
 *
 * Exports all components needed for Nova-INTERSECT integration.
 */

// Types
export * from './intersect-types';

// Correlation Store
export {
  InMemoryCorrelationStore,
  DatabaseCorrelationStore,
  createCorrelationStore,
} from './IntersectCorrelationStore';

// Gateway Service
export {
  NovaIntersectGateway,
  createGatewayService,
} from './IntersectGateway';

// Event Bridge
export {
  NovaIntersectEventBridge,
  StandaloneEventBridge,
  createEventBridge,
} from './IntersectEventBridge';

// Workflow Adapter
export {
  IntersectWorkflowAdapter,
  createWorkflowAdapter,
  WorkflowAdapterConfig,
  StepExecutionResult,
  ActivityCompleteCallback,
  ActivityFailedCallback,
  ActivityProgressCallback,
} from './IntersectWorkflowAdapter';

// Orchestration (Scheduler-Agent-Supervisor pattern)
export {
  // Scheduler
  IScheduler,
  InMemoryScheduler,
  createScheduler,
  ScheduledTask,
  ScheduleTaskParams,
  TaskQuery,
  TaskStats,
  TaskStatus,
  TaskPriority,
  SchedulerConfig,
  // Agent
  Agent,
  createAgent,
  AgentConfig,
  AgentMetrics,
  TaskExecution,
  // Supervisor
  Supervisor,
  createSupervisor,
  SupervisorConfig,
  SupervisorMetrics,
  EscalationEvent,
  EscalationHandler,
  ControllerHealthStatus,
} from './orchestration';

