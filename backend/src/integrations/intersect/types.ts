/**
 * INTERSECT Integration Type Definitions
 * Based on INTERSECT Instrument Controller Capability Contract v0.1
 *
 * Re-exports types from the shared types package for backward compatibility.
 * The shared package is now the single source of truth for these types.
 */

// ============================================================================
// Re-export from shared types (primary source)
// ============================================================================

// Correlation types
export type {
  ActivityStatus,
  LegacyActivityStatus,
  Correlation,
  ActivityCorrelation,
  ICorrelationStore,
  DataProductMapping,
} from '../../../shared/types/correlation';

export { normalizeActivityStatus } from '../../../shared/types/correlation';

// INTERSECT types
export type {
  KeyValue,
  ActionStatus,
  IntersectErrorCode,
  IntersectError,
  ComponentHealth,
  HealthStatus,
  OptionDefinition,
  ActionListResponse,
  ActionDescriptionResponse,
  ActionDescription,
  PerformActionRequest,
  PerformActionResponse,
  PerformActionResult,
  ActivityListResponse,
  DataProductSchema,
  ActivityDescriptionResponse,
  ActivityDescription,
  StartActivityRequest,
  StartActivityResponse,
  StartActivityResult,
  ActivityStatusResponse,
  ActivityStatusResult,
  DataProduct,
  ActivityDataResponse,
  ActivityDataResult,
  CancelActivityRequest,
  CancelActivityResponse,
  CancelActivityResult,
  InstrumentActionCompletion,
  InstrumentActivityStatusChange,
  NormalizedAdamEvent,
  IntersectEventType,
  IntersectEvent,
  ActivityProgressPayload,
  ActivityDataReadyPayload,
  ControllerHealthPayload,
  ControllerInfo,
  ControllerEndpoint,
  InstrumentController,
  GatewayConfig,
  EventBridgeConfig,
  EventHandler,
  IIntersectEventBridge,
  IIntersectGatewayService,
  MappingResult,
  WorkOrderToActivityMapping,
  PhaseMapping,
  ExperimentPlanMapping,
} from '../../../shared/types/intersect';

export { IntersectServiceError } from '../../../shared/types/intersect';
