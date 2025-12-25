/**
 * TacticalMap - Real-time printer monitoring view
 * SC2-style tactical display with selectable units
 */

import { useRef, useCallback, useEffect } from 'react'
import { useDragSelection } from '../../../hooks/useDragSelection'
import { PrinterUnit } from './PrinterUnit'
import { SelectionBox } from './SelectionBox'
import type { PrinterUnit as PrinterUnitType } from './types'
import styles from './TacticalMap.module.css'

interface TacticalMapProps {
  printers: PrinterUnitType[]
  selectedIds: Set<string>
  onSelect: (id: string, additive?: boolean) => void
  onSelectInRect: (
    rect: { x: number; y: number; width: number; height: number },
    items: PrinterUnitType[],
    additive?: boolean
  ) => void
  onDeselectAll: () => void
}

export function TacticalMap({
  printers,
  selectedIds,
  onSelect,
  onSelectInRect,
  onDeselectAll,
}: TacticalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { selectionRect, handlers } = useDragSelection(containerRef)

  // Convert percentage positions to pixel positions for rect selection
  const getPixelPositions = useCallback(() => {
    if (!containerRef.current) return []
    const containerRect = containerRef.current.getBoundingClientRect()

    return printers.map((printer) => ({
      ...printer,
      position: {
        x: (printer.position.x / 100) * containerRect.width,
        y: (printer.position.y / 100) * containerRect.height,
      },
    }))
  }, [printers])

  // Handle mouse up for box selection
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const finalRect = handlers.onMouseUp()
      if (finalRect && finalRect.width > 5 && finalRect.height > 5) {
        // Convert printers to pixel positions for comparison
        const pixelPrinters = getPixelPositions()
        onSelectInRect(
          finalRect,
          pixelPrinters,
          e.shiftKey || e.ctrlKey || e.metaKey
        )
      }
    },
    [handlers, getPixelPositions, onSelectInRect]
  )

  // Handle click on empty space to deselect
  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      // Only deselect if clicking directly on the background
      if (
        e.target === e.currentTarget ||
        (e.target as HTMLElement).classList.contains(styles.grid)
      ) {
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          onDeselectAll()
        }
      }
    },
    [onDeselectAll]
  )

  // Handle printer click
  const handlePrinterClick = useCallback(
    (printerId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      onSelect(printerId, e.shiftKey || e.ctrlKey || e.metaKey)
    },
    [onSelect]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + A to select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        printers.forEach((p) => onSelect(p.id, true))
      }
      // Escape to deselect all
      if (e.key === 'Escape') {
        onDeselectAll()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [printers, onSelect, onDeselectAll])

  // Group printers by lab for visual organization
  const labGroups = printers.reduce(
    (acc, printer) => {
      if (!acc[printer.labId]) {
        acc[printer.labId] = {
          name: printer.labName,
          printers: [],
        }
      }
      acc[printer.labId].printers.push(printer)
      return acc
    },
    {} as Record<string, { name: string; printers: PrinterUnitType[] }>
  )

  const selectedCount = selectedIds.size
  const totalCount = printers.length
  const workingCount = printers.filter((p) => p.status === 'working').length
  const errorCount = printers.filter((p) => p.status === 'error').length

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.title}>
          <h3>TACTICAL OVERVIEW</h3>
          <span className={styles.subtitle}>Real-time Printer Status</span>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{totalCount}</span>
            <span className={styles.statLabel}>Units</span>
          </div>
          <div className={styles.stat}>
            <span className={`${styles.statValue} ${styles.working}`}>
              {workingCount}
            </span>
            <span className={styles.statLabel}>Active</span>
          </div>
          {errorCount > 0 && (
            <div className={styles.stat}>
              <span className={`${styles.statValue} ${styles.error}`}>
                {errorCount}
              </span>
              <span className={styles.statLabel}>Errors</span>
            </div>
          )}
          {selectedCount > 0 && (
            <div className={styles.stat}>
              <span className={`${styles.statValue} ${styles.selected}`}>
                {selectedCount}
              </span>
              <span className={styles.statLabel}>Selected</span>
            </div>
          )}
        </div>
      </div>

      {/* Map area */}
      <div
        ref={containerRef}
        className={styles.mapArea}
        onMouseDown={handlers.onMouseDown}
        onMouseMove={handlers.onMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleBackgroundClick}
      >
        {/* Grid overlay */}
        <div className={styles.grid} />

        {/* Lab zone indicators */}
        {Object.entries(labGroups).map(([labId, lab]) => {
          // Calculate lab zone bounding box
          const xs = lab.printers.map((p) => p.position.x)
          const ys = lab.printers.map((p) => p.position.y)
          const minX = Math.min(...xs) - 5
          const maxX = Math.max(...xs) + 5
          const minY = Math.min(...ys) - 5
          const maxY = Math.max(...ys) + 5

          return (
            <div
              key={labId}
              className={styles.labZone}
              style={{
                left: `${minX}%`,
                top: `${minY}%`,
                width: `${maxX - minX}%`,
                height: `${maxY - minY}%`,
              }}
            >
              <span className={styles.labLabel}>{lab.name}</span>
            </div>
          )
        })}

        {/* Printer units */}
        {printers.map((printer) => (
          <PrinterUnit
            key={printer.id}
            printer={printer}
            isSelected={selectedIds.has(printer.id)}
            onClick={(e) => handlePrinterClick(printer.id, e)}
          />
        ))}

        {/* Selection box */}
        {selectionRect && <SelectionBox rect={selectionRect} />}
      </div>

      {/* Footer with controls hint */}
      <div className={styles.footer}>
        <div className={styles.hint}>
          <kbd>Click</kbd> Select
          <kbd>Shift+Click</kbd> Add to selection
          <kbd>Drag</kbd> Box select
          <kbd>Ctrl+A</kbd> Select all
          <kbd>Esc</kbd> Deselect
        </div>
      </div>
    </div>
  )
}
