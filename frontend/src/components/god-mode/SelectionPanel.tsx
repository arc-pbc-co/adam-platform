/**
 * SelectionPanel - SC2-style unit/building selection info panel
 *
 * Shows detailed information about the currently selected entity:
 * - Portrait/icon
 * - Name and type
 * - Status indicators
 * - Key metrics/stats
 * - Action buttons
 */

import { motion } from 'framer-motion'
import {
  FlaskConical,
  Activity,
  Cpu,
  Thermometer,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Circle,
} from 'lucide-react'
import type { SelectedEntity } from './GodModeLayout'
import styles from './SelectionPanel.module.css'

interface SelectionPanelProps {
  entity: SelectedEntity | null
}

export function SelectionPanel({ entity }: SelectionPanelProps) {
  if (!entity) {
    return (
      <div className={styles.panel} data-augmented-ui="tl-clip br-clip border">
        <div className={styles.empty}>
          <Circle className={styles.emptyIcon} />
          <span className={styles.emptyText}>No Selection</span>
          <span className={styles.emptyHint}>
            Click on a lab or controller to view details
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.panel} data-augmented-ui="tl-clip br-clip border">
      {/* Header with portrait and name */}
      <div className={styles.header}>
        <div className={styles.portrait}>
          <EntityIcon type={entity.type} status={entity.status} />
        </div>
        <div className={styles.identity}>
          <h3 className={styles.name}>{entity.name}</h3>
          <span className={styles.type}>{entity.type.toUpperCase()}</span>
        </div>
        <StatusBadge status={entity.status} />
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <StatItem
          icon={<Activity size={14} />}
          label="Activities"
          value="3 running"
          color="var(--accent-primary)"
        />
        <StatItem
          icon={<Cpu size={14} />}
          label="CPU"
          value="45%"
          color="var(--accent-secondary)"
        />
        <StatItem
          icon={<Thermometer size={14} />}
          label="Temp"
          value="72°C"
          color="var(--accent-warning)"
        />
        <StatItem
          icon={<Clock size={14} />}
          label="Uptime"
          value="4d 12h"
          color="var(--text-secondary)"
        />
      </div>

      {/* Progress Section */}
      {entity.status === 'running' && (
        <div className={styles.progress}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>Current Activity</span>
            <span className={styles.progressValue}>67%</span>
          </div>
          <div className={styles.progressBar}>
            <motion.div
              className={styles.progressFill}
              initial={{ width: 0 }}
              animate={{ width: '67%' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <span className={styles.progressActivity}>
            Metal sintering process - Layer 45/67
          </span>
        </div>
      )}

      {/* Details List */}
      <div className={styles.details}>
        <DetailRow label="Controller ID" value={entity.id} mono />
        <DetailRow label="Last Ping" value="< 1s ago" />
        <DetailRow label="Queue Depth" value="5 tasks" />
        <DetailRow label="Error Rate" value="0.02%" />
      </div>
    </div>
  )
}

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

interface DetailRowProps {
  label: string
  value: string
  mono?: boolean
}

function DetailRow({ label, value, mono }: DetailRowProps) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={`${styles.detailValue} ${mono ? styles.mono : ''}`}>
        {value}
      </span>
    </div>
  )
}

interface EntityIconProps {
  type: SelectedEntity['type']
  status: SelectedEntity['status']
}

function EntityIcon({ type, status }: EntityIconProps) {
  const statusColor = getStatusColor(status)

  const IconComponent = {
    lab: FlaskConical,
    controller: Cpu,
    activity: Activity,
    experiment: Activity,
  }[type]

  return (
    <div className={styles.entityIcon} style={{ color: statusColor }}>
      <IconComponent size={32} />
    </div>
  )
}

interface StatusBadgeProps {
  status: SelectedEntity['status']
}

function StatusBadge({ status }: StatusBadgeProps) {
  const color = getStatusColor(status)
  const Icon = getStatusIcon(status)

  return (
    <div className={styles.statusBadge} style={{ color, borderColor: color }}>
      <Icon size={12} />
      <span>{status.toUpperCase()}</span>
    </div>
  )
}

function getStatusColor(status: SelectedEntity['status']): string {
  const colors = {
    online: 'var(--accent-secondary)',
    running: 'var(--accent-primary)',
    idle: 'var(--text-muted)',
    offline: 'var(--accent-danger)',
    error: 'var(--accent-danger)',
  }
  return colors[status]
}

function getStatusIcon(status: SelectedEntity['status']) {
  const icons = {
    online: CheckCircle,
    running: Activity,
    idle: Circle,
    offline: XCircle,
    error: AlertCircle,
  }
  return icons[status]
}

export default SelectionPanel
