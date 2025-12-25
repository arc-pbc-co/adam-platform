/**
 * GodModeLayout - StarCraft 2 / RTS-inspired main layout
 *
 * Grid Structure:
 * ┌─────────────────────────────────────────────────────────┐
 * │                    Resource Bar                          │
 * ├───────────────────────────────────────────┬─────────────┤
 * │                                           │   Minimap   │
 * │                                           ├─────────────┤
 * │            Main Viewport                  │  Selection  │
 * │       (Tactical Map / Network Map)        │    Panel    │
 * │                                           ├─────────────┤
 * │                                           │   Command   │
 * │                                           │    Panel    │
 * ├───────────────────────────────────────────┴─────────────┤
 * │                      Event Log                           │
 * └─────────────────────────────────────────────────────────┘
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ResourceBar } from './ResourceBar'
import { Minimap } from './Minimap'
import { SelectionPanel } from './SelectionPanel'
import { CommandPanel } from './CommandPanel'
import { EventLog } from './EventLog'
import { GlobalNetworkMap } from './GlobalNetworkMap'
import styles from './GodModeLayout.module.css'

// Types for the layout
export interface SelectedEntity {
  id: string
  type: 'controller' | 'activity' | 'experiment' | 'lab'
  name: string
  status: 'online' | 'offline' | 'running' | 'idle' | 'error'
  details?: Record<string, unknown>
}

export interface ResourceMetrics {
  activeLabs: number
  totalLabs: number
  runningExperiments: number
  queuedTasks: number
  systemLoad: number // 0-100
  networkLatency: number // ms
}

export interface LogEntry {
  id: string
  timestamp: Date
  type: 'info' | 'success' | 'warning' | 'error'
  source: string
  message: string
}

export function GodModeLayout() {
  // State for the layout
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>(() => generateMockLogs())
  const [resources] = useState<ResourceMetrics>({
    activeLabs: 3,
    totalLabs: 5,
    runningExperiments: 7,
    queuedTasks: 12,
    systemLoad: 67,
    networkLatency: 24,
  })

  // Handle entity selection from the map or minimap
  const handleEntitySelect = useCallback((entity: SelectedEntity | null) => {
    setSelectedEntity(entity)
    if (entity) {
      // Add a log entry for the selection
      const newLog: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        type: 'info',
        source: 'UI',
        message: `Selected ${entity.type}: ${entity.name}`,
      }
      setLogs(prev => [newLog, ...prev].slice(0, 100))
    }
  }, [])

  // Handle commands from the command panel
  const handleCommand = useCallback((command: string) => {
    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type: 'info',
      source: 'COMMAND',
      message: `Executing: ${command}`,
    }
    setLogs(prev => [newLog, ...prev].slice(0, 100))
  }, [])

  return (
    <div className={`${styles.layout} scan-line`}>
      {/* Scanline overlay for extra SC2 feel */}
      <div className="scanline-overlay" />

      {/* Resource Bar - Top */}
      <header className={styles.resourceBar}>
        <ResourceBar metrics={resources} />
      </header>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {/* Main Viewport - Tactical/Network Map */}
        <section className={styles.viewport}>
          <GlobalNetworkMap
            selectedEntity={selectedEntity}
            onEntitySelect={handleEntitySelect}
          />
        </section>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          {/* Minimap */}
          <div className={styles.minimap}>
            <Minimap
              selectedEntity={selectedEntity}
              onEntitySelect={handleEntitySelect}
            />
          </div>

          {/* Selection Panel */}
          <div className={styles.selectionPanel}>
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedEntity?.id ?? 'empty'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                style={{ height: '100%' }}
              >
                <SelectionPanel entity={selectedEntity} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Command Panel */}
          <div className={styles.commandPanel}>
            <CommandPanel
              entity={selectedEntity}
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

// Generate some mock log entries for demo
function generateMockLogs(): LogEntry[] {
  const types: LogEntry['type'][] = ['info', 'success', 'warning', 'error']
  const sources = ['INTERSECT', 'LAB-01', 'LAB-02', 'SYSTEM', 'NOVA', 'DM-PRINTER']
  const messages = [
    'Controller health check passed',
    'Activity started: Metal sintering process',
    'Experiment run completed successfully',
    'High latency detected on edge connection',
    'New sample queued for analysis',
    'Workflow step completed: powder spreading',
    'Temperature threshold warning',
    'Connection restored to Desktop Metal controller',
  ]

  return Array.from({ length: 15 }, (_, i) => ({
    id: crypto.randomUUID(),
    timestamp: new Date(Date.now() - i * 60000 * Math.random() * 10),
    type: types[Math.floor(Math.random() * types.length)],
    source: sources[Math.floor(Math.random() * sources.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
  }))
}

export default GodModeLayout
