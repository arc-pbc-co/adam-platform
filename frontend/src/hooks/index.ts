/**
 * Custom Hooks
 */

export { useSelection } from './useSelection'
export type { SelectableItem, Rect, SelectionState } from './useSelection'

export { useDragSelection } from './useDragSelection'
export type { Rect as DragRect } from './useDragSelection'

export { useAdamResources } from './useAdamResources'
export type {
  AdamResourceValues,
  AdamResourceConfig,
  UseAdamResourcesOptions,
  UseAdamResourcesReturn,
} from './useAdamResources'

export { useEventLog } from './useEventLog'
export type { UseEventLogOptions, UseEventLogReturn } from './useEventLog'

export { useWebSocket, useMultiWebSocket, useWebSocketCommand } from './useWebSocket'
export type { UseWebSocketOptions, UseWebSocketReturn } from './useWebSocket'

export { useAgentStatus } from './useAgentStatus'
export type {
  AgentType,
  AgentOperationalStatus,
  AgentStatusPayload,
  TrackedAgent,
  UseAgentStatusOptions,
  AgentStats,
  UseAgentStatusReturn,
} from './useAgentStatus'

export { useCampaignStatus } from './useCampaignStatus'
export type {
  CampaignStatus,
  ExperimentStatus,
  WorkflowStep,
  Experiment,
  CampaignPayload,
  CampaignEvent,
  TrackedCampaign,
  UseCampaignStatusOptions,
  CampaignStats,
  UseCampaignStatusReturn,
} from './useCampaignStatus'

export { useCommands } from './useCommands'
export type {
  CommandableAgent,
  EvaluatedCommand,
  PendingCommand,
  UseCommandsOptions,
  UseCommandsReturn,
} from './useCommands'

export { useKeyboardShortcuts, formatShortcut } from './useKeyboardShortcuts'
export type {
  ShortcutDefinition,
  ControlGroupCallbacks,
  NavigationCallbacks,
  UseKeyboardShortcutsOptions,
  UseKeyboardShortcutsReturn,
} from './useKeyboardShortcuts'

export { useControlGroups } from './useControlGroups'
export type {
  ControlGroup,
  UseControlGroupsOptions,
  UseControlGroupsReturn,
} from './useControlGroups'

export { useOnboarding } from './useOnboarding'
export type {
  UseOnboardingOptions,
  UseOnboardingReturn,
} from './useOnboarding'
