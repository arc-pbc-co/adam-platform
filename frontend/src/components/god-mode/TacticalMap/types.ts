/**
 * TacticalMap Types
 * Types for printer units and tactical map state
 */

import type { SelectableItem } from '../../../hooks/useSelection'

export type PrinterStatus = 'idle' | 'working' | 'error' | 'offline' | 'calibrating'

export interface PrinterUnit extends SelectableItem {
  id: string
  name: string
  model: 'Studio System' | 'Shop System' | 'Production System' | 'InnoventX'
  status: PrinterStatus
  position: { x: number; y: number }
  labId: string
  labName: string
  // Job progress (0-100, null if no active job)
  jobProgress: number | null
  jobName: string | null
  // Health metrics
  health: {
    temperature: number // °C
    humidity: number // %
    uptime: number // hours
    errorCount: number
  }
  // Capabilities
  capabilities: {
    canPrint: boolean
    canCalibrate: boolean
    canQueue: boolean
  }
  lastPing: Date
}

export interface TacticalMapProps {
  printers: PrinterUnit[]
  selectedIds: Set<string>
  onSelect: (id: string, additive?: boolean) => void
  onSelectMultiple: (ids: string[]) => void
  onDeselectAll: () => void
  onCommand: (command: PrinterCommand, printerIds: string[]) => void
}

export type PrinterCommand =
  | 'start'
  | 'stop'
  | 'pause'
  | 'resume'
  | 'queue'
  | 'calibrate'
  | 'diagnose'
  | 'restart'
  | 'emergency-stop'

export interface CommandDefinition {
  id: PrinterCommand
  label: string
  icon: string
  hotkey: string
  variant: 'default' | 'primary' | 'danger' | 'warning'
  // Which statuses this command is available for
  availableFor: PrinterStatus[]
  // Required capability
  requires?: keyof PrinterUnit['capabilities']
}

// Status colors matching skill tokens
export const STATUS_COLORS: Record<PrinterStatus, string> = {
  idle: 'var(--text-muted)',
  working: 'var(--accent-primary)',
  error: 'var(--accent-danger)',
  offline: 'var(--text-disabled)',
  calibrating: 'var(--accent-warning)',
}

// Model icons (using emoji for now, can be replaced with custom icons)
export const MODEL_ICONS: Record<PrinterUnit['model'], string> = {
  'Studio System': '🖨️',
  'Shop System': '🏭',
  'Production System': '⚙️',
  'InnoventX': '🔬',
}
