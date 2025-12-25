/**
 * Command Configuration
 *
 * Defines all available commands for ADAM agents/printers.
 * Each command specifies:
 * - Hotkey binding
 * - Applicable agent types
 * - Disabled conditions based on agent status
 * - WebSocket topic for execution
 * - UI styling variant
 */

import type { AgentType, AgentOperationalStatus } from '../hooks/useAgentStatus'

// Command IDs
export type CommandId =
  | 'start'
  | 'stop'
  | 'pause'
  | 'resume'
  | 'queue'
  | 'calibrate'
  | 'analyze'
  | 'diagnose'
  | 'restart'
  | 'abort'
  | 'emergency-stop'

// Command variant for styling
export type CommandVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger'

// Command definition
export interface CommandDefinition {
  id: CommandId
  label: string
  description: string
  icon: string // lucide icon name
  hotkey: string | null
  hotkeyDisplay: string | null // Human readable (e.g., "Esc" instead of "Escape")
  applicableTo: AgentType[]
  variant: CommandVariant
  /** Returns true if command should be disabled for this agent */
  isDisabled: (status: AgentOperationalStatus, capabilities?: string[]) => boolean
  /** WebSocket topic to send command */
  wsTopic: string
  /** Whether command requires confirmation */
  requiresConfirmation: boolean
  /** Priority for display order (lower = higher priority) */
  priority: number
}

// Agent status helpers
const isWorking = (status: AgentOperationalStatus) => status === 'working'
const isIdle = (status: AgentOperationalStatus) => status === 'idle'
const isOffline = (status: AgentOperationalStatus) => status === 'offline'
const isCalibrating = (status: AgentOperationalStatus) => status === 'calibrating'
const isBusy = (status: AgentOperationalStatus) => isWorking(status) || isCalibrating(status)

/**
 * All available commands
 */
export const COMMANDS: CommandDefinition[] = [
  // Start - Begin a print job or operation
  {
    id: 'start',
    label: 'Start',
    description: 'Start a print job on selected printers',
    icon: 'Play',
    hotkey: 's',
    hotkeyDisplay: 'S',
    applicableTo: ['printer'],
    variant: 'primary',
    isDisabled: (status) => !isIdle(status),
    wsTopic: 'adam/commands/start',
    requiresConfirmation: false,
    priority: 1,
  },

  // Stop - Stop current operation
  {
    id: 'stop',
    label: 'Stop',
    description: 'Stop current operation on selected agents',
    icon: 'Square',
    hotkey: 'x',
    hotkeyDisplay: 'X',
    applicableTo: ['printer', 'worker'],
    variant: 'danger',
    isDisabled: (status) => !isWorking(status),
    wsTopic: 'adam/commands/stop',
    requiresConfirmation: true,
    priority: 2,
  },

  // Pause - Pause current operation
  {
    id: 'pause',
    label: 'Pause',
    description: 'Pause current operation',
    icon: 'Pause',
    hotkey: 'p',
    hotkeyDisplay: 'P',
    applicableTo: ['printer'],
    variant: 'warning',
    isDisabled: (status) => !isWorking(status),
    wsTopic: 'adam/commands/pause',
    requiresConfirmation: false,
    priority: 3,
  },

  // Resume - Resume paused operation
  {
    id: 'resume',
    label: 'Resume',
    description: 'Resume paused operation',
    icon: 'PlayCircle',
    hotkey: 'r',
    hotkeyDisplay: 'R',
    applicableTo: ['printer'],
    variant: 'success',
    isDisabled: (status) => !isIdle(status), // Would need 'paused' status
    wsTopic: 'adam/commands/resume',
    requiresConfirmation: false,
    priority: 4,
  },

  // Queue - Open job queue modal
  {
    id: 'queue',
    label: 'Queue Job',
    description: 'Add a job to the print queue',
    icon: 'ListPlus',
    hotkey: 'q',
    hotkeyDisplay: 'Q',
    applicableTo: ['printer'],
    variant: 'default',
    isDisabled: (status, capabilities) => {
      if (isOffline(status)) return true
      return !capabilities?.includes('canQueue')
    },
    wsTopic: 'adam/commands/queue',
    requiresConfirmation: false,
    priority: 5,
  },

  // Calibrate - Run calibration routine
  {
    id: 'calibrate',
    label: 'Calibrate',
    description: 'Run calibration routine',
    icon: 'Target',
    hotkey: 'c',
    hotkeyDisplay: 'C',
    applicableTo: ['printer'],
    variant: 'default',
    isDisabled: (status, capabilities) => {
      if (isBusy(status) || isOffline(status)) return true
      return !capabilities?.includes('canCalibrate')
    },
    wsTopic: 'adam/commands/calibrate',
    requiresConfirmation: false,
    priority: 6,
  },

  // Analyze - Request Nova AI analysis
  {
    id: 'analyze',
    label: 'AI Analyze',
    description: 'Request Nova AI analysis of selected agents',
    icon: 'Brain',
    hotkey: 'a',
    hotkeyDisplay: 'A',
    applicableTo: ['printer', 'campaign'],
    variant: 'default',
    isDisabled: (status) => isOffline(status),
    wsTopic: 'adam/nova/analyze',
    requiresConfirmation: false,
    priority: 7,
  },

  // Diagnose - Run diagnostics
  {
    id: 'diagnose',
    label: 'Diagnose',
    description: 'Run diagnostic checks',
    icon: 'Activity',
    hotkey: 'd',
    hotkeyDisplay: 'D',
    applicableTo: ['printer'],
    variant: 'default',
    isDisabled: (status) => isOffline(status),
    wsTopic: 'adam/commands/diagnose',
    requiresConfirmation: false,
    priority: 8,
  },

  // Restart - Restart agent
  {
    id: 'restart',
    label: 'Restart',
    description: 'Restart selected agents',
    icon: 'RefreshCw',
    hotkey: null,
    hotkeyDisplay: null,
    applicableTo: ['printer', 'worker'],
    variant: 'warning',
    isDisabled: (status) => isOffline(status),
    wsTopic: 'adam/commands/restart',
    requiresConfirmation: true,
    priority: 9,
  },

  // Abort - Emergency abort (requires confirmation)
  {
    id: 'abort',
    label: 'Abort',
    description: 'Abort all operations on selected agents',
    icon: 'AlertTriangle',
    hotkey: 'Escape',
    hotkeyDisplay: 'Esc',
    applicableTo: ['printer', 'campaign'],
    variant: 'danger',
    isDisabled: (status) => isOffline(status) || isIdle(status),
    wsTopic: 'adam/commands/abort',
    requiresConfirmation: true,
    priority: 10,
  },

  // Emergency Stop - Immediate halt
  {
    id: 'emergency-stop',
    label: 'E-STOP',
    description: 'Emergency stop - immediate halt of all operations',
    icon: 'Power',
    hotkey: 'e',
    hotkeyDisplay: 'E',
    applicableTo: ['printer'],
    variant: 'danger',
    isDisabled: (status) => isOffline(status),
    wsTopic: 'adam/commands/emergency-stop',
    requiresConfirmation: false, // E-stop should be immediate
    priority: 11,
  },
]

/**
 * Get command by ID
 */
export function getCommand(id: CommandId): CommandDefinition | undefined {
  return COMMANDS.find((cmd) => cmd.id === id)
}

/**
 * Get commands applicable to given agent types
 */
export function getCommandsForAgentTypes(types: AgentType[]): CommandDefinition[] {
  return COMMANDS.filter((cmd) =>
    cmd.applicableTo.some((type) => types.includes(type))
  ).sort((a, b) => a.priority - b.priority)
}

/**
 * Get command by hotkey
 */
export function getCommandByHotkey(hotkey: string): CommandDefinition | undefined {
  return COMMANDS.find(
    (cmd) => cmd.hotkey?.toLowerCase() === hotkey.toLowerCase()
  )
}

/**
 * Command payload for WebSocket
 */
export interface CommandPayload {
  commandId: CommandId
  agentIds: string[]
  timestamp: string
  params?: Record<string, unknown>
}

/**
 * Command acknowledgment from server
 */
export interface CommandAck {
  commandId: CommandId
  agentId: string
  status: 'accepted' | 'rejected' | 'completed' | 'failed'
  message?: string
  timestamp: string
}

export default COMMANDS
