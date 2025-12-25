/**
 * PrinterSelectionPanel - SC2-style unit selection panel for printers
 *
 * Displays information about selected printer units:
 * - Empty state when nothing selected
 * - Single UnitCard for one selection with full details
 * - Summary grid for multi-selection with aggregate stats
 *
 * Uses augmented-ui with green glow border for selected state.
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Printer,
  Factory,
  Cog,
  Microscope,
  Circle,
  Play,
  Pause,
  Square,
  RefreshCw,
  Activity,
  Thermometer,
  Droplets,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react'
import type { PrinterUnit, PrinterStatus, PrinterCommand } from './TacticalMap/types'
import styles from './PrinterSelectionPanel.module.css'

interface PrinterSelectionPanelProps {
  printers: PrinterUnit[]
  onCommand?: (command: PrinterCommand, printerIds: string[]) => void
}

/**
 * Main selection panel component
 */
export function PrinterSelectionPanel({
  printers,
  onCommand,
}: PrinterSelectionPanelProps) {
  if (printers.length === 0) {
    return <EmptyState />
  }

  if (printers.length === 1) {
    return <SinglePrinterView printer={printers[0]} onCommand={onCommand} />
  }

  return <MultiPrinterView printers={printers} onCommand={onCommand} />
}

/**
 * Empty state when no printers are selected
 */
function EmptyState() {
  return (
    <div
      className={styles.panel}
      data-augmented-ui="tl-clip br-clip border"
    >
      <div className={styles.emptyState}>
        <Circle className={styles.emptyIcon} />
        <span className={styles.emptyTitle}>No Selection</span>
        <span className={styles.emptyHint}>
          Click or drag to select printers
        </span>
      </div>
    </div>
  )
}

/**
 * Single printer view with full UnitCard
 */
interface SinglePrinterViewProps {
  printer: PrinterUnit
  onCommand?: (command: PrinterCommand, printerIds: string[]) => void
}

function SinglePrinterView({ printer, onCommand }: SinglePrinterViewProps) {
  const statusColor = getStatusColor(printer.status)
  const StatusIcon = getStatusIcon(printer.status)
  const ModelIcon = getModelIcon(printer.model)

  const handleCommand = (command: PrinterCommand) => {
    onCommand?.(command, [printer.id])
  }

  // Calculate health percentage (simple average)
  const healthPercentage = useMemo(() => {
    const tempHealth = Math.max(0, 100 - Math.abs(printer.health.temperature - 25) * 2)
    const humidityHealth = Math.max(0, 100 - Math.abs(printer.health.humidity - 45) * 2)
    const errorHealth = Math.max(0, 100 - printer.health.errorCount * 10)
    return Math.round((tempHealth + humidityHealth + errorHealth) / 3)
  }, [printer.health])

  // Format uptime
  const uptimeFormatted = useMemo(() => {
    const days = Math.floor(printer.health.uptime / 24)
    const hours = printer.health.uptime % 24
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`
  }, [printer.health.uptime])

  return (
    <div
      className={`${styles.panel} ${styles.selected}`}
      data-augmented-ui="tl-clip br-clip border"
    >
      {/* Header with portrait and identity */}
      <div className={styles.header}>
        <div className={styles.portrait} style={{ borderColor: statusColor }}>
          <ModelIcon size={28} style={{ color: statusColor }} />
        </div>
        <div className={styles.identity}>
          <h3 className={styles.name}>{printer.name}</h3>
          <span className={styles.model}>{printer.model}</span>
        </div>
        <div className={styles.statusBadge} style={{ color: statusColor, borderColor: statusColor }}>
          <StatusIcon size={10} />
          <span>{printer.status.toUpperCase()}</span>
        </div>
      </div>

      {/* Lab info */}
      <div className={styles.labInfo}>
        <span className={styles.labLabel}>Lab:</span>
        <span className={styles.labName}>{printer.labName}</span>
      </div>

      {/* Current job progress */}
      {printer.jobProgress !== null && printer.jobName && (
        <div className={styles.jobSection}>
          <div className={styles.jobHeader}>
            <span className={styles.jobLabel}>Current Job</span>
            <span className={styles.jobProgress}>{printer.jobProgress}%</span>
          </div>
          <div className={styles.jobBar}>
            <motion.div
              className={styles.jobFill}
              initial={{ width: 0 }}
              animate={{ width: `${printer.jobProgress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <span className={styles.jobName}>{printer.jobName}</span>
        </div>
      )}

      {/* Health stats grid */}
      <div className={styles.statsGrid}>
        <StatItem
          icon={<Thermometer size={14} />}
          label="Temp"
          value={`${printer.health.temperature}°C`}
          color={printer.health.temperature > 80 ? 'var(--accent-danger)' : 'var(--accent-secondary)'}
        />
        <StatItem
          icon={<Droplets size={14} />}
          label="Humidity"
          value={`${printer.health.humidity}%`}
          color="var(--accent-primary)"
        />
        <StatItem
          icon={<Clock size={14} />}
          label="Uptime"
          value={uptimeFormatted}
          color="var(--text-secondary)"
        />
        <StatItem
          icon={<Activity size={14} />}
          label="Health"
          value={`${healthPercentage}%`}
          color={healthPercentage > 70 ? 'var(--accent-secondary)' : 'var(--accent-warning)'}
        />
      </div>

      {/* Error count warning */}
      {printer.health.errorCount > 0 && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={14} />
          <span>{printer.health.errorCount} error{printer.health.errorCount > 1 ? 's' : ''} recorded</span>
        </div>
      )}

      {/* Quick actions */}
      <div className={styles.quickActions}>
        {printer.status === 'idle' && printer.capabilities.canPrint && (
          <QuickActionButton
            icon={<Play size={14} />}
            label="Start"
            variant="primary"
            onClick={() => handleCommand('start')}
          />
        )}
        {printer.status === 'working' && (
          <>
            <QuickActionButton
              icon={<Pause size={14} />}
              label="Pause"
              variant="warning"
              onClick={() => handleCommand('pause')}
            />
            <QuickActionButton
              icon={<Square size={14} />}
              label="Stop"
              variant="danger"
              onClick={() => handleCommand('stop')}
            />
          </>
        )}
        {printer.capabilities.canCalibrate && printer.status !== 'working' && (
          <QuickActionButton
            icon={<RefreshCw size={14} />}
            label="Calibrate"
            variant="default"
            onClick={() => handleCommand('calibrate')}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Multi-printer view with summary grid
 */
interface MultiPrinterViewProps {
  printers: PrinterUnit[]
  onCommand?: (command: PrinterCommand, printerIds: string[]) => void
}

function MultiPrinterView({ printers }: MultiPrinterViewProps) {
  // Aggregate stats
  const stats = useMemo(() => {
    const working = printers.filter((p) => p.status === 'working').length
    const idle = printers.filter((p) => p.status === 'idle').length
    const errors = printers.filter((p) => p.status === 'error').length
    const offline = printers.filter((p) => p.status === 'offline').length

    const totalProgress = printers
      .filter((p) => p.jobProgress !== null)
      .reduce((sum, p) => sum + (p.jobProgress ?? 0), 0)
    const avgProgress = printers.filter((p) => p.jobProgress !== null).length > 0
      ? Math.round(totalProgress / printers.filter((p) => p.jobProgress !== null).length)
      : null

    const totalErrors = printers.reduce((sum, p) => sum + p.health.errorCount, 0)
    const avgTemp = Math.round(
      printers.reduce((sum, p) => sum + p.health.temperature, 0) / printers.length
    )

    return { working, idle, errors, offline, avgProgress, totalErrors, avgTemp }
  }, [printers])

  return (
    <div
      className={`${styles.panel} ${styles.selected}`}
      data-augmented-ui="tl-clip br-clip border"
    >
      {/* Header */}
      <div className={styles.multiHeader}>
        <h3 className={styles.multiTitle}>{printers.length} Printers Selected</h3>
        <div className={styles.statusSummary}>
          {stats.working > 0 && (
            <span className={styles.statusCount} style={{ color: 'var(--accent-primary)' }}>
              {stats.working} working
            </span>
          )}
          {stats.idle > 0 && (
            <span className={styles.statusCount} style={{ color: 'var(--text-muted)' }}>
              {stats.idle} idle
            </span>
          )}
          {stats.errors > 0 && (
            <span className={styles.statusCount} style={{ color: 'var(--accent-danger)' }}>
              {stats.errors} error
            </span>
          )}
          {stats.offline > 0 && (
            <span className={styles.statusCount} style={{ color: 'var(--text-disabled)' }}>
              {stats.offline} offline
            </span>
          )}
        </div>
      </div>

      {/* Aggregate stats */}
      <div className={styles.aggregateStats}>
        {stats.avgProgress !== null && (
          <div className={styles.aggregateStat}>
            <span className={styles.aggregateLabel}>Avg Progress</span>
            <span className={styles.aggregateValue}>{stats.avgProgress}%</span>
          </div>
        )}
        <div className={styles.aggregateStat}>
          <span className={styles.aggregateLabel}>Avg Temp</span>
          <span className={styles.aggregateValue}>{stats.avgTemp}°C</span>
        </div>
        {stats.totalErrors > 0 && (
          <div className={`${styles.aggregateStat} ${styles.errorStat}`}>
            <span className={styles.aggregateLabel}>Total Errors</span>
            <span className={styles.aggregateValue}>{stats.totalErrors}</span>
          </div>
        )}
      </div>

      {/* Printer grid */}
      <div className={styles.printerGrid}>
        {printers.slice(0, 8).map((printer) => (
          <MiniPrinterCard key={printer.id} printer={printer} />
        ))}
        {printers.length > 8 && (
          <div className={styles.moreIndicator}>
            +{printers.length - 8} more
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Mini printer card for multi-selection grid
 */
interface MiniPrinterCardProps {
  printer: PrinterUnit
}

function MiniPrinterCard({ printer }: MiniPrinterCardProps) {
  const statusColor = getStatusColor(printer.status)
  const ModelIcon = getModelIcon(printer.model)

  return (
    <div className={styles.miniCard} style={{ borderColor: statusColor }}>
      <ModelIcon size={16} style={{ color: statusColor }} />
      <span className={styles.miniName}>{printer.name}</span>
      {printer.jobProgress !== null && (
        <span className={styles.miniProgress}>{printer.jobProgress}%</span>
      )}
    </div>
  )
}

/**
 * Stat item component
 */
interface StatItemProps {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}

function StatItem({ icon, label, value, color }: StatItemProps) {
  return (
    <div className={styles.statItem}>
      <span className={styles.statIcon} style={{ color }}>
        {icon}
      </span>
      <div className={styles.statContent}>
        <span className={styles.statValue} style={{ color }}>
          {value}
        </span>
        <span className={styles.statLabel}>{label}</span>
      </div>
    </div>
  )
}

/**
 * Quick action button
 */
interface QuickActionButtonProps {
  icon: React.ReactNode
  label: string
  variant: 'default' | 'primary' | 'warning' | 'danger'
  onClick: () => void
}

function QuickActionButton({ icon, label, variant, onClick }: QuickActionButtonProps) {
  return (
    <button
      className={`${styles.quickAction} ${styles[`quickAction--${variant}`]}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

// Utility functions
function getStatusColor(status: PrinterStatus): string {
  const colors: Record<PrinterStatus, string> = {
    idle: 'var(--text-muted)',
    working: 'var(--accent-primary)',
    error: 'var(--accent-danger)',
    offline: 'var(--text-disabled)',
    calibrating: 'var(--accent-warning)',
  }
  return colors[status]
}

function getStatusIcon(status: PrinterStatus) {
  const icons: Record<PrinterStatus, typeof CheckCircle> = {
    idle: Circle,
    working: Activity,
    error: XCircle,
    offline: XCircle,
    calibrating: Loader2,
  }
  return icons[status]
}

function getModelIcon(model: PrinterUnit['model']) {
  const icons: Record<PrinterUnit['model'], typeof Printer> = {
    'Studio System': Printer,
    'Shop System': Factory,
    'Production System': Cog,
    'InnoventX': Microscope,
  }
  return icons[model]
}

export default PrinterSelectionPanel
