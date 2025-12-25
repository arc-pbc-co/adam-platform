/**
 * CommandPanel - SC2-style command card/action buttons
 *
 * Provides contextual actions for the selected entity:
 * - Quick action buttons in a grid
 * - Keyboard shortcuts displayed
 * - Hotkey support
 */

import { useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Settings,
  Terminal,
  FileText,
  AlertTriangle,
  Zap,
} from 'lucide-react'
import type { SelectedEntity } from './GodModeLayout'
import styles from './CommandPanel.module.css'

interface CommandPanelProps {
  entity: SelectedEntity | null
  onCommand: (command: string) => void
}

interface CommandDef {
  id: string
  label: string
  icon: React.ReactNode
  hotkey: string
  disabled?: boolean
  variant?: 'default' | 'primary' | 'danger'
}

export function CommandPanel({ entity, onCommand }: CommandPanelProps) {
  // Get available commands based on entity
  const commands = getCommandsForEntity(entity)

  // Handle hotkey presses
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const command = commands.find(
        (cmd) => cmd.hotkey.toLowerCase() === e.key.toLowerCase() && !cmd.disabled
      )

      if (command) {
        e.preventDefault()
        onCommand(command.id)
      }
    },
    [commands, onCommand]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className={styles.panel} data-augmented-ui="tl-clip br-clip border">
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>COMMANDS</span>
        {entity && (
          <span className={styles.context}>{entity.name}</span>
        )}
      </div>

      {/* Command Grid */}
      <div className={styles.grid}>
        {commands.map((cmd) => (
          <CommandButton
            key={cmd.id}
            command={cmd}
            onClick={() => onCommand(cmd.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface CommandButtonProps {
  command: CommandDef
  onClick: () => void
}

function CommandButton({ command, onClick }: CommandButtonProps) {
  return (
    <motion.button
      className={`${styles.button} ${styles[command.variant ?? 'default']} ${
        command.disabled ? styles.disabled : ''
      }`}
      onClick={onClick}
      disabled={command.disabled}
      whileHover={command.disabled ? {} : { scale: 1.05 }}
      whileTap={command.disabled ? {} : { scale: 0.95 }}
    >
      <span className={styles.buttonIcon}>{command.icon}</span>
      <span className={styles.buttonLabel}>{command.label}</span>
      <span className={styles.hotkey}>{command.hotkey}</span>
    </motion.button>
  )
}

function getCommandsForEntity(entity: SelectedEntity | null): CommandDef[] {
  // Base commands available when nothing is selected
  if (!entity) {
    return [
      { id: 'refresh', label: 'Refresh', icon: <RefreshCw size={16} />, hotkey: 'R' },
      { id: 'settings', label: 'Settings', icon: <Settings size={16} />, hotkey: 'S' },
      { id: 'logs', label: 'View Logs', icon: <FileText size={16} />, hotkey: 'L' },
      { id: 'terminal', label: 'Terminal', icon: <Terminal size={16} />, hotkey: 'T' },
    ]
  }

  // Commands vary based on entity type and status
  const baseCommands: CommandDef[] = []

  if (entity.status === 'running') {
    baseCommands.push(
      { id: 'pause', label: 'Pause', icon: <Pause size={16} />, hotkey: 'P' },
      { id: 'stop', label: 'Stop', icon: <Square size={16} />, hotkey: 'X', variant: 'danger' }
    )
  } else if (entity.status === 'idle' || entity.status === 'online') {
    baseCommands.push(
      { id: 'start', label: 'Start', icon: <Play size={16} />, hotkey: 'P', variant: 'primary' }
    )
  }

  if (entity.status === 'offline' || entity.status === 'error') {
    baseCommands.push(
      { id: 'reconnect', label: 'Reconnect', icon: <RefreshCw size={16} />, hotkey: 'R' }
    )
  }

  // Always available
  baseCommands.push(
    { id: 'inspect', label: 'Inspect', icon: <FileText size={16} />, hotkey: 'I' },
    { id: 'configure', label: 'Configure', icon: <Settings size={16} />, hotkey: 'C' }
  )

  if (entity.type === 'lab' || entity.type === 'controller') {
    baseCommands.push(
      { id: 'diagnostics', label: 'Diagnostics', icon: <Zap size={16} />, hotkey: 'D' }
    )
  }

  if (entity.status === 'error') {
    baseCommands.push(
      { id: 'clear-error', label: 'Clear Error', icon: <AlertTriangle size={16} />, hotkey: 'E', variant: 'danger' }
    )
  }

  // Pad to fill grid if needed
  while (baseCommands.length < 6) {
    baseCommands.push({
      id: `empty-${baseCommands.length}`,
      label: '',
      icon: null,
      hotkey: '',
      disabled: true,
    })
  }

  return baseCommands.slice(0, 6)
}

export default CommandPanel
