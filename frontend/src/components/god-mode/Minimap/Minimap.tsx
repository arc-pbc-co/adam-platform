/**
 * Minimap - Tactical overview of all printers/agents
 *
 * Features:
 * - Simplified view of all agents
 * - Click-to-navigate to agent
 * - Viewport rectangle showing current view
 * - Status color coding
 */

import { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { PrinterUnit } from '../TacticalMap/types'
import styles from './Minimap.module.css'

interface ViewportBounds {
  x: number
  y: number
  width: number
  height: number
}

interface MinimapProps {
  printers: PrinterUnit[]
  selectedIds: Set<string>
  viewportBounds: ViewportBounds
  onNavigate: (position: { x: number; y: number }) => void
  onPrinterSelect?: (printerId: string) => void
}

// Status to color mapping
const STATUS_COLORS: Record<string, string> = {
  working: 'var(--accent-secondary)',
  idle: 'var(--accent-primary)',
  calibrating: 'var(--accent-warning)',
  error: 'var(--accent-danger)',
  offline: 'var(--text-muted)',
}

export function Minimap({
  printers,
  selectedIds,
  viewportBounds,
  onNavigate,
  onPrinterSelect,
}: MinimapProps) {
  // Handle click on minimap to navigate
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      onNavigate({ x, y })
    },
    [onNavigate]
  )

  // Count by status for legend
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    printers.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1
    })
    return counts
  }, [printers])

  return (
    <div
      className={styles.minimap}
      data-augmented-ui="tl-clip br-clip border"
    >
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>TACTICAL</span>
        <span className={styles.count}>{printers.length}</span>
      </div>

      {/* Map Area */}
      <div className={styles.mapArea} onClick={handleClick}>
        {/* Grid overlay */}
        <div className={styles.grid} />

        {/* Printer markers */}
        {printers.map((printer) => {
          const isSelected = selectedIds.has(printer.id)
          return (
            <motion.button
              key={printer.id}
              className={`${styles.marker} ${isSelected ? styles.selected : ''}`}
              style={{
                left: `${printer.position.x}%`,
                top: `${printer.position.y}%`,
                backgroundColor: isSelected
                  ? 'var(--accent-secondary)'
                  : STATUS_COLORS[printer.status],
              }}
              onClick={(e) => {
                e.stopPropagation()
                onPrinterSelect?.(printer.id)
              }}
              whileHover={{ scale: 1.5 }}
              whileTap={{ scale: 0.9 }}
              title={`${printer.name} (${printer.status})`}
            >
              {/* Pulse for working printers */}
              {printer.status === 'working' && !isSelected && (
                <span className={styles.pulse} />
              )}
              {/* Selection ring */}
              {isSelected && <span className={styles.selectionRing} />}
            </motion.button>
          )
        })}

        {/* Viewport rectangle */}
        <div
          className={styles.viewport}
          style={{
            left: `${viewportBounds.x}%`,
            top: `${viewportBounds.y}%`,
            width: `${viewportBounds.width}%`,
            height: `${viewportBounds.height}%`,
          }}
        />
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        {statusCounts.working && (
          <div className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ backgroundColor: STATUS_COLORS.working }}
            />
            <span>{statusCounts.working}</span>
          </div>
        )}
        {statusCounts.idle && (
          <div className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ backgroundColor: STATUS_COLORS.idle }}
            />
            <span>{statusCounts.idle}</span>
          </div>
        )}
        {statusCounts.error && (
          <div className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ backgroundColor: STATUS_COLORS.error }}
            />
            <span>{statusCounts.error}</span>
          </div>
        )}
        {statusCounts.offline && (
          <div className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ backgroundColor: STATUS_COLORS.offline }}
            />
            <span>{statusCounts.offline}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default Minimap
