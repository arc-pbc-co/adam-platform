/**
 * GodModeDashboard - Main dashboard integrating all God Mode components
 *
 * Features:
 * - Tab toggle between GlobalMap (onboarding) and TacticalMap (operations)
 * - Persistent user preferences in localStorage
 * - Scan-line animation overlay
 * - Panel entrance animations
 * - Keyboard shortcuts help modal (? key)
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe,
  Target,
  HelpCircle,
  Settings,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { AdamResourceBar, DEFAULT_ADAM_RESOURCES } from './ResourceBar'
import { EventLog } from './EventLog'
import { GlobalMap } from './GlobalMap'
import { TacticalMap } from './TacticalMap'
import { TacticalCommandPanel } from './TacticalCommandPanel'
import { PrinterSelectionPanel } from './PrinterSelectionPanel'
import { Minimap } from './Minimap/Minimap'
import { ShortcutsHelpModal } from './ShortcutsHelpModal'
import { ScanLineOverlay } from './shared/ScanLineOverlay'
import { useWebSocketContext } from '../../contexts/WebSocketContext'
import { useEventLog } from '../../hooks/useEventLog'
import { useControlGroups } from '../../hooks/useControlGroups'
import type { PrinterUnit, PrinterCommand } from './TacticalMap/types'
import styles from './GodModeDashboard.module.css'

// View modes
type ViewMode = 'global' | 'tactical'

// User preferences stored in localStorage
interface UserPreferences {
  viewMode: ViewMode
  showMinimap: boolean
  showScanlines: boolean
  eventLogExpanded: boolean
}

const DEFAULT_PREFERENCES: UserPreferences = {
  viewMode: 'global',
  showMinimap: true,
  showScanlines: true,
  eventLogExpanded: true,
}

const STORAGE_KEY = 'godmode-preferences'

// Load preferences from localStorage
function loadPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.warn('Failed to load preferences:', e)
  }
  return DEFAULT_PREFERENCES
}

// Save preferences to localStorage
function savePreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch (e) {
    console.warn('Failed to save preferences:', e)
  }
}

export function GodModeDashboard() {
  // User preferences
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences)

  // UI state
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const [selectedPrinterIds, setSelectedPrinterIds] = useState<Set<string>>(new Set())

  // WebSocket connection
  let wsContext: ReturnType<typeof useWebSocketContext> | null = null
  try {
    wsContext = useWebSocketContext()
  } catch {
    // Not in WebSocket provider
  }
  const isConnected = wsContext?.isConnected ?? false

  // Event log - using entries from hook
  const { entries: eventEntries } = useEventLog({ maxEvents: 100 })

  // Control groups for tactical map
  const {
    assignGroup,
    selectGroup,
  } = useControlGroups({
    onGroupSelected: (_groupNumber, agentIds) => {
      // Update selection when group is selected
      setSelectedPrinterIds(new Set(agentIds))
    },
  })

  // Save preferences when they change
  useEffect(() => {
    savePreferences(preferences)
  }, [preferences])

  // Update preference helper
  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferences((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  // Keyboard shortcut handler for ? key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setShowShortcutsModal((prev) => !prev)
      }

      // Tab to switch views
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        setPreferences((prev) => ({
          ...prev,
          viewMode: prev.viewMode === 'global' ? 'tactical' : 'global',
        }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Mock printer data for tactical map - matching PrinterUnit interface exactly
  const mockPrinters: PrinterUnit[] = useMemo(
    () => [
      {
        id: 'x25-001',
        name: 'X25 Pro #1',
        model: 'Studio System' as const,
        status: 'working' as const,
        position: { x: 25, y: 30 },
        labId: 'lab-001',
        labName: 'Lab Alpha',
        jobProgress: 67,
        jobName: 'Bracket Assembly',
        health: { temperature: 185, humidity: 45, uptime: 720, errorCount: 0 },
        capabilities: { canPrint: true, canQueue: true, canCalibrate: true },
        lastPing: new Date(),
      },
      {
        id: 'x25-002',
        name: 'X25 Pro #2',
        model: 'Studio System' as const,
        status: 'idle' as const,
        position: { x: 45, y: 30 },
        labId: 'lab-001',
        labName: 'Lab Alpha',
        jobProgress: null,
        jobName: null,
        health: { temperature: 22, humidity: 50, uptime: 480, errorCount: 1 },
        capabilities: { canPrint: true, canQueue: true, canCalibrate: true },
        lastPing: new Date(),
      },
      {
        id: 'shop-001',
        name: 'Shop System #1',
        model: 'Shop System' as const,
        status: 'working' as const,
        position: { x: 65, y: 30 },
        labId: 'lab-002',
        labName: 'Lab Beta',
        jobProgress: 23,
        jobName: 'Motor Housing',
        health: { temperature: 210, humidity: 40, uptime: 1200, errorCount: 0 },
        capabilities: { canPrint: true, canQueue: true, canCalibrate: true },
        lastPing: new Date(),
      },
      {
        id: 'shop-002',
        name: 'Shop System #2',
        model: 'Shop System' as const,
        status: 'error' as const,
        position: { x: 25, y: 55 },
        labId: 'lab-002',
        labName: 'Lab Beta',
        jobProgress: null,
        jobName: null,
        health: { temperature: 280, humidity: 35, uptime: 24, errorCount: 3 },
        capabilities: { canPrint: false, canQueue: false, canCalibrate: true },
        lastPing: new Date(),
      },
      {
        id: 'prod-001',
        name: 'Production #1',
        model: 'Production System' as const,
        status: 'calibrating' as const,
        position: { x: 45, y: 55 },
        labId: 'lab-003',
        labName: 'Lab Gamma',
        jobProgress: null,
        jobName: null,
        health: { temperature: 150, humidity: 42, uptime: 96, errorCount: 0 },
        capabilities: { canPrint: true, canQueue: true, canCalibrate: true },
        lastPing: new Date(),
      },
      {
        id: 'innx-001',
        name: 'InnoventX #1',
        model: 'InnoventX' as const,
        status: 'offline' as const,
        position: { x: 65, y: 55 },
        labId: 'lab-003',
        labName: 'Lab Gamma',
        jobProgress: null,
        jobName: null,
        health: { temperature: 0, humidity: 0, uptime: 0, errorCount: 0 },
        capabilities: { canPrint: false, canQueue: false, canCalibrate: false },
        lastPing: new Date(Date.now() - 3600000), // 1 hour ago
      },
    ],
    []
  )

  // Get selected printers as array
  const selectedPrinters = useMemo(
    () => mockPrinters.filter((p) => selectedPrinterIds.has(p.id)),
    [mockPrinters, selectedPrinterIds]
  )

  // Resource data with mock values
  const resources = useMemo(() => {
    return DEFAULT_ADAM_RESOURCES.map((r) => ({
      ...r,
      current:
        r.id === 'compute'
          ? 67
          : r.id === 'tokens'
            ? 45200
            : r.id === 'jobs'
              ? mockPrinters.filter((p) => p.status === 'working').length
              : r.id === 'agents'
                ? mockPrinters.filter((p) => p.status !== 'offline').length
                : 42,
    }))
  }, [mockPrinters])

  // Handle single printer selection
  const handlePrinterSelect = useCallback(
    (id: string, additive?: boolean) => {
      setSelectedPrinterIds((prev) => {
        const next = new Set(additive ? prev : [])
        if (prev.has(id) && additive) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    },
    []
  )

  // Handle box selection
  const handleSelectInRect = useCallback(
    (
      rect: { x: number; y: number; width: number; height: number },
      items: PrinterUnit[],
      additive?: boolean
    ) => {
      // Find items within rect
      const inRect = items.filter((item) => {
        return (
          item.position.x >= rect.x &&
          item.position.x <= rect.x + rect.width &&
          item.position.y >= rect.y &&
          item.position.y <= rect.y + rect.height
        )
      })

      setSelectedPrinterIds((prev) => {
        const next = new Set(additive ? prev : [])
        inRect.forEach((item) => next.add(item.id))
        return next
      })
    },
    []
  )

  // Handle deselect all
  const handleDeselectAll = useCallback(() => {
    setSelectedPrinterIds(new Set())
  }, [])

  // Handle commands
  const handleCommand = useCallback(
    (command: PrinterCommand, printerIds: string[]) => {
      console.log(`Executing ${command} on:`, printerIds)
      // Add event log entry - would call addEvent from useEventLog
    },
    []
  )

  // Handle control group callbacks for keyboard shortcuts
  const controlGroupCallbacks = useMemo(
    () => ({
      onSelectGroup: (groupNumber: number) => {
        const agentIds = selectGroup(groupNumber)
        setSelectedPrinterIds(new Set(agentIds))
      },
      onAssignGroup: (groupNumber: number) => {
        assignGroup(groupNumber, Array.from(selectedPrinterIds))
      },
    }),
    [selectGroup, assignGroup, selectedPrinterIds]
  )

  return (
    <div className={styles.dashboard}>
      {/* Scan line overlay */}
      {preferences.showScanlines && <ScanLineOverlay />}

      {/* Header with Resource Bar and View Toggle */}
      <header className={styles.header}>
        <AdamResourceBar resources={resources} />

        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewTab} ${
              preferences.viewMode === 'global' ? styles.active : ''
            }`}
            onClick={() => updatePreference('viewMode', 'global')}
          >
            <Globe size={16} />
            <span>Global Network</span>
          </button>
          <button
            className={`${styles.viewTab} ${
              preferences.viewMode === 'tactical' ? styles.active : ''
            }`}
            onClick={() => updatePreference('viewMode', 'tactical')}
          >
            <Target size={16} />
            <span>Tactical Operations</span>
          </button>
        </div>

        <div className={styles.headerActions}>
          {/* Connection status */}
          <div
            className={`${styles.connectionStatus} ${
              isConnected ? styles.connected : ''
            }`}
          >
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
          </div>

          {/* Help button */}
          <button
            className={styles.iconButton}
            onClick={() => setShowShortcutsModal(true)}
            title="Keyboard Shortcuts (?)"
          >
            <HelpCircle size={18} />
          </button>

          {/* Settings button */}
          <button
            className={styles.iconButton}
            onClick={() =>
              updatePreference('showScanlines', !preferences.showScanlines)
            }
            title="Toggle Scan Lines"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Main Viewport with View Switching */}
        <section className={styles.viewport}>
          <AnimatePresence mode="wait">
            {preferences.viewMode === 'global' ? (
              <motion.div
                key="global"
                className={styles.viewContainer}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <GlobalMap />
              </motion.div>
            ) : (
              <motion.div
                key="tactical"
                className={styles.viewContainer}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <TacticalMap
                  printers={mockPrinters}
                  selectedIds={selectedPrinterIds}
                  onSelect={handlePrinterSelect}
                  onSelectInRect={handleSelectInRect}
                  onDeselectAll={handleDeselectAll}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Sidebar - Only shown in Tactical view */}
        {preferences.viewMode === 'tactical' && (
          <aside className={styles.sidebar}>
            {/* Minimap */}
            {preferences.showMinimap && (
              <motion.div
                className={styles.minimapContainer}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Minimap
                  printers={mockPrinters}
                  selectedIds={selectedPrinterIds}
                  viewportBounds={{ x: 0, y: 0, width: 100, height: 100 }}
                  onNavigate={(pos) => console.log('Navigate to:', pos)}
                />
              </motion.div>
            )}

            {/* Selection Panel */}
            <motion.div
              className={styles.selectionContainer}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <PrinterSelectionPanel
                printers={selectedPrinters}
                onCommand={handleCommand}
              />
            </motion.div>

            {/* Command Panel */}
            <motion.div
              className={styles.commandContainer}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <TacticalCommandPanel
                selectedPrinters={selectedPrinters}
                onCommand={handleCommand}
                controlGroups={controlGroupCallbacks}
                onDeselectAll={handleDeselectAll}
              />
            </motion.div>
          </aside>
        )}
      </main>

      {/* Event Log Footer */}
      <footer className={styles.footer}>
        <EventLog
          entries={eventEntries}
          maxEntries={preferences.eventLogExpanded ? 100 : 20}
        />
      </footer>

      {/* Shortcuts Help Modal */}
      <ShortcutsHelpModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  )
}

export default GodModeDashboard
