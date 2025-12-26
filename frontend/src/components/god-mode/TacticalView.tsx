/**
 * TacticalView - Combined tactical map and command panel
 * Main view for real-time printer monitoring
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSelection, useEventLog } from '../../hooks'
import { TacticalMap, MOCK_PRINTERS } from './TacticalMap'
import { TacticalCommandPanel } from './TacticalCommandPanel'
import { PrinterSelectionPanel } from './PrinterSelectionPanel'
import { Minimap } from './Minimap'
import { EventLog } from './EventLog'
import type { PrinterUnit, PrinterCommand } from './TacticalMap/types'
import type { SelectedEntity } from './GodModeLayout'
import styles from './TacticalView.module.css'

export function TacticalView() {
  // Printer selection state
  const [printers] = useState<PrinterUnit[]>(MOCK_PRINTERS)
  const selection = useSelection(printers)

  // Minimap entity selection (for showing on minimap)
  const [minimapEntity, setMinimapEntity] = useState<SelectedEntity | null>(null)

  // Event logs using the new hook
  const { entries: logs, addEvent } = useEventLog({
    simulateEvents: true,
    simulateInterval: 4000,
    maxEvents: 100,
  })

  // Handle commands from the command panel
  const handleCommand = useCallback(
    (command: PrinterCommand, printerIds: string[]) => {
      const printerNames = printerIds
        .map((id) => printers.find((p) => p.id === id)?.name)
        .filter(Boolean)
        .join(', ')

      const commandLabels: Record<PrinterCommand, string> = {
        start: 'Starting',
        stop: 'Stopping',
        pause: 'Pausing',
        resume: 'Resuming',
        queue: 'Queuing job for',
        calibrate: 'Calibrating',
        diagnose: 'Running diagnostics on',
        restart: 'Restarting',
        'emergency-stop': 'EMERGENCY STOP',
      }

      addEvent(
        command === 'emergency-stop' ? 'warning' : 'info',
        'system',
        `${commandLabels[command]} ${printerNames}`
      )

      // Simulate command execution feedback
      setTimeout(() => {
        if (command === 'start') {
          addEvent('success', 'system', `Job started on ${printerNames}`)
        } else if (command === 'stop') {
          addEvent('warning', 'system', `Job stopped on ${printerNames}`)
        } else if (command === 'emergency-stop') {
          addEvent('error', 'system', `Emergency stop executed on ${printerNames}`)
        }
      }, 500)
    },
    [printers, addEvent]
  )

  // Handle minimap entity selection
  const handleMinimapSelect = useCallback((entity: SelectedEntity | null) => {
    setMinimapEntity(entity)
    // Could also zoom/pan the tactical map to focus on the selected lab
  }, [])

  // Selected printer details for the selection panel
  const selectedPrinters = selection.selectedItems

  return (
    <div className={styles.layout}>
      {/* Main Content Area - Resource bar handled by parent GodModeDashboard */}
      <main className={styles.mainContent}>
        {/* Main Viewport - Tactical Map */}
        <section className={styles.viewport}>
          <TacticalMap
            printers={printers}
            selectedIds={selection.selectedIds}
            onSelect={selection.select}
            onSelectInRect={selection.selectInRect}
            onDeselectAll={selection.deselectAll}
          />
        </section>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          {/* Minimap */}
          <div className={styles.minimap}>
            <Minimap
              selectedEntity={minimapEntity}
              onEntitySelect={handleMinimapSelect}
            />
          </div>

          {/* Selection Info Panel */}
          <div className={styles.selectionPanel}>
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedPrinters.length > 0 ? 'selected' : 'empty'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                style={{ height: '100%' }}
              >
                <PrinterSelectionPanel
                  printers={selectedPrinters}
                  onCommand={handleCommand}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Command Panel */}
          <div className={styles.commandPanel}>
            <TacticalCommandPanel
              selectedPrinters={selectedPrinters}
              onCommand={handleCommand}
            />
          </div>
        </aside>
      </main>

      {/* Event Log - Bottom */}
      <footer className={styles.eventLog}>
        <EventLog entries={logs} />
      </footer>
    </div>
  )
}

export default TacticalView
