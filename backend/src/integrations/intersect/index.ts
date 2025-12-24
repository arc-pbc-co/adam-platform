/**
 * INTERSECT Integration Module
 *
 * Exports all components needed for ADAM-INTERSECT integration.
 */

// Types
export * from './types';

// Correlation Store
export {
  ICorrelationStore,
  InMemoryCorrelationStore,
  DatabaseCorrelationStore,
  createCorrelationStore,
} from './correlation/CorrelationStore';

// Schema Mapper
export {
  SchemaMapper,
  DefaultSchemaMapper,
  schemaMapper,
  SCHEMA_VERSION,
  DesktopMetalActivities,
  DesktopMetalActions,
} from './mapping/SchemaMapper';

// Gateway Service
export {
  IIntersectGatewayService,
  IntersectGatewayService,
  createGatewayService,
} from './gateway/IntersectGatewayService';

// Event Bridge
export {
  IIntersectEventBridge,
  IntersectEventBridge,
  WorkflowIntegratedEventBridge,
  createEventBridge,
  createWorkflowEventBridge,
  INTERSECT_EVENT_SUBJECTS,
  EventHandler,
  EventBridgeConfig,
} from './events/IntersectEventBridge';

// Orchestration (Scheduler-Agent-Supervisor pattern)
export {
  // Scheduler
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
  // Agent
  Agent,
  AgentPool,
  createAgent,
  createAgentPool,
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

// Re-export key types for convenience
export type {
  Correlation,
  KeyValue,
  ActivityStatus,
  InstrumentController,
  ControllerInfo,
  GatewayConfig,
  ActivityCorrelation,
  DataProductMapping,
  NormalizedAdamEvent,
  InstrumentActivityStatusChange,
  InstrumentActionCompletion,
} from './types';
