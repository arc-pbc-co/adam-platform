/**
 * PrinterUnit - Individual printer unit on the tactical map
 * SC2-style unit with status indicator and progress bar
 */

import { motion } from 'framer-motion'
import { Printer, AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import type { PrinterUnit as PrinterUnitType } from './types'
import { STATUS_COLORS } from './types'
import styles from './PrinterUnit.module.css'

interface PrinterUnitProps {
  printer: PrinterUnitType
  isSelected: boolean
  onClick: (e: React.MouseEvent) => void
}

export function PrinterUnit({ printer, isSelected, onClick }: PrinterUnitProps) {
  const statusColor = STATUS_COLORS[printer.status]
  const isOnline = printer.status !== 'offline'
  const hasJob = printer.jobProgress !== null

  return (
    <motion.div
      data-unit
      className={`${styles.unit} ${styles[printer.status]} ${isSelected ? styles.selected : ''}`}
      style={{
        left: `${printer.position.x}%`,
        top: `${printer.position.y}%`,
      }}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Selection ring */}
      {isSelected && (
        <motion.div
          className={styles.selectionRing}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15 }}
        />
      )}

      {/* Unit body */}
      <div className={styles.body}>
        {/* Icon */}
        <div className={styles.icon}>
          <Printer size={20} />
        </div>

        {/* Status indicator */}
        <div className={styles.statusDot} style={{ background: statusColor }}>
          {printer.status === 'working' && <span className={styles.pulse} />}
        </div>

        {/* Error indicator */}
        {printer.status === 'error' && (
          <div className={styles.errorBadge}>
            <AlertTriangle size={10} />
          </div>
        )}

        {/* Connection indicator */}
        <div className={styles.connectionBadge}>
          {isOnline ? <Wifi size={8} /> : <WifiOff size={8} />}
        </div>
      </div>

      {/* Progress bar (if working) */}
      {hasJob && (
        <div className={styles.progressContainer}>
          <div
            className={styles.progressFill}
            style={{ width: `${printer.jobProgress}%` }}
          />
        </div>
      )}

      {/* Name label */}
      <div className={styles.label}>
        <span className={styles.name}>{printer.name}</span>
        {hasJob && (
          <span className={styles.progress}>{printer.jobProgress}%</span>
        )}
      </div>

      {/* Hover tooltip */}
      <div className={styles.tooltip}>
        <div className={styles.tooltipHeader}>
          <span className={styles.tooltipName}>{printer.name}</span>
          <span
            className={styles.tooltipStatus}
            style={{ color: statusColor }}
          >
            {printer.status.toUpperCase()}
          </span>
        </div>
        <div className={styles.tooltipBody}>
          <div className={styles.tooltipRow}>
            <span>Model:</span>
            <span>{printer.model}</span>
          </div>
          <div className={styles.tooltipRow}>
            <span>Lab:</span>
            <span>{printer.labName}</span>
          </div>
          {hasJob && (
            <div className={styles.tooltipRow}>
              <span>Job:</span>
              <span>{printer.jobName}</span>
            </div>
          )}
          <div className={styles.tooltipRow}>
            <span>Temp:</span>
            <span>{printer.health.temperature}°C</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
