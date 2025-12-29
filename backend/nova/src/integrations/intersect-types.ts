/**
 * INTERSECT Types for Nova Integration
 *
 * Re-exports types from the shared types package for use within Nova.
 * This maintains backward compatibility while consolidating type definitions.
 *
 * For Docker builds where the shared package isn't available,
 * these types are copied inline below the re-exports.
 */

// ============================================================================
// Re-export from shared types (primary source)
// ============================================================================

// Try to import from shared types package
// If not available (e.g., Docker build), the inline definitions below will be used

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
