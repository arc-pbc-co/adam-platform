/**
 * TacticalCommandPanel - Context-sensitive command panel for printer operations
 *
 * Uses the command system hooks to:
 * - Show available commands based on selected agent types and status
 * - Execute commands via WebSocket
 * - Track pending command acknowledgments
 * - Handle keyboard shortcuts
 */

import { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  AlertTriangle,
  Power,
  ListPlus,
  Target,
  Activity,
  Brain,
  PlayCircle,
  Thermometer,
  Zap,
  Loader2,
} from 'lucide-react'
import type { PrinterUnit, PrinterCommand, PrinterStatus } from './TacticalMap/types'
import { useCommands, type EvaluatedCommand, type CommandableAgent } from '../../hooks/useCommands'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import type { CommandId } from '../../config/commands'
import styles from './TacticalCommandPanel.module.css'

interface TacticalCommandPanelProps {
  selectedPrinters: PrinterUnit[]
  onCommand: (command: PrinterCommand, printerIds: string[]) => void
  /** Optional: Control group callbacks for keyboard shortcuts */
  controlGroups?: {
    onSelectGroup: (groupNumber: number) => void
    onAssignGroup: (groupNumber: number) => void
  }
  /** Optional: Deselect all callback */
  onDeselectAll?: () => void
}

// Map lucide icon names to components
const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  Play,
  Pause,
  Square,
  RefreshCw,
  AlertTriangle,
  Power,
  ListPlus,
  Target,
  Activity,
  Brain,
  PlayCircle,
}

// Get icon component by name
function getIcon(iconName: string, size = 16) {
  const Icon = ICON_MAP[iconName]
  return Icon ? <Icon size={size} /> : <Activity size={size} />
}

export function TacticalCommandPanel({
  selectedPrinters,
  onCommand,
  controlGroups,
  onDeselectAll,
}: TacticalCommandPanelProps) {
  // Convert PrinterUnit to CommandableAgent
  const agents: CommandableAgent[] = useMemo(() => {
    return selectedPrinters.map((printer) => ({
      id: printer.id,
      type: 'printer' as const,
      status: printer.status as CommandableAgent['status'],
      capabilities: Object.entries(printer.capabilities)
        .filter(([, v]) => v)
        .map(([k]) => k),
    }))
  }, [selectedPrinters])

  // Use commands hook
  const {
    commands,
    executeCommand,
    pendingCommands,
    isCommandPending,
    canSendCommands,
  } = useCommands({
    agents,
    onCommandExecuted: (commandId, agentIds) => {
      // Bridge to legacy onCommand callback
      onCommand(commandId as PrinterCommand, agentIds)
    },
  })

  // Execute command wrapper
  const handleExecuteCommand = useCallback(
    (commandId: CommandId): boolean => {
      return executeCommand(commandId)
    },
    [executeCommand]
  )

  // Use keyboard shortcuts
  useKeyboardShortcuts({
    executeCommand: handleExecuteCommand,
    controlGroups,
    navigation: {
      onEscape: onDeselectAll,
    },
    enabled: true,
  })

  // Filter commands to show (max 8 for grid)
  const displayCommands = useMemo(() => {
    // Get enabled commands first, then disabled
    const enabled = commands.filter((cmd) => !cmd.disabled)
    const disabled = commands.filter((cmd) => cmd.disabled)

    // Prioritize specific commands for display
    const priorityOrder: CommandId[] = [
      'start',
      'stop',
      'pause',
      'queue',
      'calibrate',
      'analyze',
      'diagnose',
      'emergency-stop',
    ]

    const sorted = [...enabled, ...disabled].sort((a, b) => {
      const aIdx = priorityOrder.indexOf(a.id)
      const bIdx = priorityOrder.indexOf(b.id)
      if (aIdx === -1 && bIdx === -1) return 0
      if (aIdx === -1) return 1
      if (bIdx === -1) return -1
      return aIdx - bIdx
    })

    return sorted.slice(0, 8)
  }, [commands])

  // Pad commands to fill grid
  const paddedCommands = useMemo((): (EvaluatedCommand | null)[] => {
    const result: (EvaluatedCommand | null)[] = [...displayCommands]
    while (result.length < 8) {
      result.push(null)
    }
    return result
  }, [displayCommands])

  // Selection analysis for status display
  const analysis = useMemo(() => {
    if (selectedPrinters.length === 0) {
      return {
        count: 0,
        statuses: new Set<PrinterStatus>(),
        hasErrors: false,
      }
    }

    const statuses = new Set(selectedPrinters.map((p) => p.status))

    return {
      count: selectedPrinters.length,
      statuses,
      hasErrors: statuses.has('error'),
    }
  }, [selectedPrinters])

  // Selection summary text
  const summaryText = useMemo(() => {
    if (analysis.count === 0) return 'No printers selected'
    if (analysis.count === 1) return selectedPrinters[0].name
    return `${analysis.count} printers selected`
  }, [analysis.count, selectedPrinters])

  // Status summary text
  const statusSummary = useMemo(() => {
    if (analysis.count === 0) return ''
    const parts: string[] = []
    if (analysis.statuses.has('working'))
      parts.push(
        `${selectedPrinters.filter((p) => p.status === 'working').length} working`
      )
    if (analysis.statuses.has('idle'))
      parts.push(
        `${selectedPrinters.filter((p) => p.status === 'idle').length} idle`
      )
    if (analysis.statuses.has('error'))
      parts.push(
        `${selectedPrinters.filter((p) => p.status === 'error').length} error`
      )
    if (analysis.statuses.has('offline'))
      parts.push(
        `${selectedPrinters.filter((p) => p.status === 'offline').length} offline`
      )
    return parts.join(' | ')
  }, [analysis, selectedPrinters])

  // Check if any commands are pending
  const hasPendingCommands = pendingCommands.some((c) => c.status === 'pending')

  return (
    <div
      className={styles.panel}
      data-augmented-ui="tl-clip br-clip border"
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>COMMANDS</span>
          {analysis.hasErrors && (
            <AlertTriangle size={12} className={styles.errorIcon} />
          )}
          {hasPendingCommands && (
            <Loader2 size={12} className={styles.pendingIcon} />
          )}
        </div>
        <div className={styles.headerRight}>
          <span className={styles.selection}>{summaryText}</span>
        </div>
      </div>

      {/* Status summary */}
      {statusSummary && (
        <div className={styles.statusBar}>
          <span className={styles.statusText}>{statusSummary}</span>
          {!canSendCommands && (
            <span className={styles.offlineIndicator}>OFFLINE</span>
          )}
        </div>
      )}

      {/* Command Grid */}
      <div className={styles.grid}>
        {paddedCommands.map((cmd, index) =>
          cmd ? (
            <CommandButton
              key={cmd.id}
              command={cmd}
              isPending={isCommandPending(cmd.id)}
              onClick={() => executeCommand(cmd.id)}
            />
          ) : (
            <div key={`empty-${index}`} className={styles.emptySlot} />
          )
        )}
      </div>

      {/* Quick stats when printers selected */}
      {analysis.count > 0 && (
        <div className={styles.quickStats}>
          <div className={styles.quickStat}>
            <Thermometer size={12} />
            <span>
              Avg Temp:{' '}
              {Math.round(
                selectedPrinters.reduce(
                  (sum, p) => sum + p.health.temperature,
                  0
                ) / selectedPrinters.length
              )}
              °C
            </span>
          </div>
          <div className={styles.quickStat}>
            <Zap size={12} />
            <span>
              Errors:{' '}
              {selectedPrinters.reduce(
                (sum, p) => sum + p.health.errorCount,
                0
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

interface CommandButtonProps {
  command: EvaluatedCommand
  isPending: boolean
  onClick: () => void
}

function CommandButton({ command, isPending, onClick }: CommandButtonProps) {
  const variant = command.variant || 'default'

  return (
    <motion.button
      className={`${styles.button} ${styles[variant]} ${
        command.disabled ? styles.disabled : ''
      } ${isPending ? styles.pending : ''}`}
      onClick={onClick}
      disabled={command.disabled || isPending}
      whileHover={command.disabled ? {} : { scale: 1.05 }}
      whileTap={command.disabled ? {} : { scale: 0.95 }}
      title={command.disabled ? command.disabledReason : command.description}
    >
      <span className={styles.buttonIcon}>
        {isPending ? <Loader2 size={16} className={styles.spinner} /> : getIcon(command.icon)}
      </span>
      <span className={styles.buttonLabel}>{command.label}</span>
      {command.hotkeyDisplay && (
        <span className={styles.hotkey}>{command.hotkeyDisplay}</span>
      )}
      {command.applicableCount > 0 && command.applicableCount < 10 && (
        <span className={styles.count}>{command.applicableCount}</span>
      )}
    </motion.button>
  )
}

export default TacticalCommandPanel
