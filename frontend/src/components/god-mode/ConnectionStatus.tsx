/**
 * ConnectionStatus - WebSocket connection health indicator
 *
 * Displays the current WebSocket connection status with:
 * - Color-coded status indicator (dot + glow)
 * - Status label with reconnection info
 * - Click to manually reconnect
 *
 * Designed to fit in the ResourceBar alongside resource gauges.
 */

import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, RefreshCw, Loader2 } from 'lucide-react'
import { useWebSocketContext, type ConnectionStatus as ConnectionStatusType } from '../../contexts/WebSocketContext'
import styles from './ConnectionStatus.module.css'

export interface ConnectionStatusProps {
  /** Show label text (default: true) */
  showLabel?: boolean
  /** Compact mode for smaller displays (default: false) */
  compact?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Connection status indicator component
 */
export function ConnectionStatus({
  showLabel = true,
  compact = false,
  className = '',
}: ConnectionStatusProps) {
  const { status, reconnectAttempts, reconnect, error, lastMessageTime } = useWebSocketContext()

  const handleClick = useCallback(() => {
    if (status === 'disconnected' || status === 'reconnecting') {
      reconnect()
    }
  }, [status, reconnect])

  const isClickable = status === 'disconnected' || status === 'reconnecting'

  return (
    <div
      className={`${styles.container} ${compact ? styles.compact : ''} ${className}`}
      onClick={isClickable ? handleClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      title={getTooltip(status, reconnectAttempts, error, lastMessageTime)}
    >
      <StatusDot status={status} />

      {showLabel && (
        <AnimatePresence mode="wait">
          <motion.span
            key={status}
            className={`${styles.label} ${styles[status]}`}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 5 }}
            transition={{ duration: 0.15 }}
          >
            {getStatusLabel(status, reconnectAttempts)}
          </motion.span>
        </AnimatePresence>
      )}

      {isClickable && (
        <RefreshCw className={styles.reconnectIcon} size={10} />
      )}
    </div>
  )
}

/**
 * Animated status dot
 */
interface StatusDotProps {
  status: ConnectionStatusType
}

function StatusDot({ status }: StatusDotProps) {
  const Icon = getStatusIcon(status)
  const isAnimating = status === 'connecting' || status === 'reconnecting'

  return (
    <div className={`${styles.dot} ${styles[status]}`}>
      <motion.div
        className={styles.dotInner}
        animate={isAnimating ? { rotate: 360 } : { rotate: 0 }}
        transition={isAnimating ? { duration: 1.5, repeat: Infinity, ease: 'linear' } : {}}
      >
        <Icon size={12} />
      </motion.div>

      {/* Pulse effect for connected state */}
      {status === 'connected' && (
        <motion.div
          className={styles.pulse}
          animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Glow effect */}
      <div className={styles.glow} />
    </div>
  )
}

// Helper functions
function getStatusIcon(status: ConnectionStatusType) {
  switch (status) {
    case 'connected':
      return Wifi
    case 'connecting':
    case 'reconnecting':
      return Loader2
    case 'disconnected':
    default:
      return WifiOff
  }
}

function getStatusLabel(status: ConnectionStatusType, reconnectAttempts: number): string {
  switch (status) {
    case 'connected':
      return 'LIVE'
    case 'connecting':
      return 'CONNECTING'
    case 'reconnecting':
      return `RETRY ${reconnectAttempts}`
    case 'disconnected':
    default:
      return 'OFFLINE'
  }
}

function getTooltip(
  status: ConnectionStatusType,
  reconnectAttempts: number,
  error: Error | null,
  lastMessageTime: Date | null
): string {
  const lines: string[] = []

  switch (status) {
    case 'connected':
      lines.push('WebSocket connected - receiving real-time data')
      if (lastMessageTime) {
        const ago = Math.round((Date.now() - lastMessageTime.getTime()) / 1000)
        lines.push(`Last message: ${ago}s ago`)
      }
      break
    case 'connecting':
      lines.push('Establishing WebSocket connection...')
      break
    case 'reconnecting':
      lines.push(`Reconnecting... (attempt ${reconnectAttempts})`)
      lines.push('Click to retry now')
      break
    case 'disconnected':
      lines.push('WebSocket disconnected')
      lines.push('Click to reconnect')
      break
  }

  if (error) {
    lines.push(`Error: ${error.message}`)
  }

  return lines.join('\n')
}

export default ConnectionStatus
