/**
 * God Mode UI Components
 *
 * StarCraft 2 / RTS-inspired UI for the ADAM Platform
 */

// Main Dashboard
export { GodModeDashboard } from './GodModeDashboard'

// Legacy Layout (deprecated)
export { GodModeLayout } from './GodModeLayout'

// Core Components
export { ResourceBar } from './ResourceBar'
export { EventLog } from './EventLog'

// Selection & Commands
export { SelectionPanel } from './SelectionPanel'
export { CommandPanel } from './CommandPanel'
export { PrinterSelectionPanel } from './PrinterSelectionPanel'
export { TacticalCommandPanel } from './TacticalCommandPanel'

// Maps
export { GlobalNetworkMap } from './GlobalNetworkMap'
export { GlobalMap } from './GlobalMap'
export * from './GlobalMap'

// Tactical Map
export { TacticalMap } from './TacticalMap'
export * from './TacticalMap'

// Minimap
export { Minimap } from './Minimap'

// Modals
export { ShortcutsHelpModal } from './ShortcutsHelpModal'

// Shared Components
export { ScanLineOverlay, LoadingSpinner } from './shared'

// Re-export types
export type {
  SelectedEntity,
  ResourceMetrics,
  LogEntry,
} from './GodModeLayout'
