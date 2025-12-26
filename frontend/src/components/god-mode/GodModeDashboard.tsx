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
// Motion temporarily disabled - will re-enable for panel animations
// import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe,
  Target,
  HelpCircle,
  Settings,
  Wifi,
  WifiOff,
  LogOut,
  ArrowLeft,
} from 'lucide-react'
import { AdamResourceBar, DEFAULT_ADAM_RESOURCES } from './ResourceBar'
import { EventLog } from './EventLog'
import { GlobalMap } from './GlobalMap'
import { TacticalView } from './TacticalView'
import { ShortcutsHelpModal } from './ShortcutsHelpModal'
import { ScanLineOverlay } from './shared/ScanLineOverlay'
import { useWebSocketContext } from '../../contexts/WebSocketContext'
import { useEventLog } from '../../hooks/useEventLog'
// Control groups hook - will be re-enabled for tactical view
// import { useControlGroups } from '../../hooks/useControlGroups'
import type { PrinterUnit } from './TacticalMap/types'
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

// Import Site type from GlobalMap
import type { Site } from './GlobalMap/types'
import type { PrinterStatus } from './TacticalMap/types'

// Convert product line to printer model
function productLineToModel(productLine: string): PrinterUnit['model'] {
  switch (productLine) {
    case 'Shop':
      return 'Shop System'
    case 'Studio':
      return 'Studio System'
    case 'InnX':
      return 'InnoventX'
    default:
      return 'Studio System'
  }
}

// Get random simulated status
function getSimulatedStatus(): PrinterStatus {
  const statuses: PrinterStatus[] = ['idle', 'working', 'idle', 'working', 'calibrating', 'offline', 'error']
  return statuses[Math.floor(Math.random() * statuses.length)]
}

// Convert sites to PrinterUnits for TacticalView
function sitesToPrinterUnits(sites: Site[]): PrinterUnit[] {
  const printers: PrinterUnit[] = []

  sites.forEach((site) => {
    if (!site.printers) return

    site.printers.forEach((printer) => {
      const status = getSimulatedStatus()
      const isWorking = status === 'working'

      printers.push({
        id: printer.serialNumber,
        name: `${printer.productLine} ${printer.serialNumber}`,
        model: productLineToModel(printer.productLine),
        status,
        position: {
          // Position will be calculated by TacticalMap based on site grouping
          x: 0,
          y: 0
        },
        labId: site.id,
        labName: site.name,
        jobProgress: isWorking ? Math.floor(Math.random() * 100) : null,
        jobName: isWorking ? 'Active Job' : null,
        health: {
          temperature: status === 'offline' ? 0 : 150 + Math.floor(Math.random() * 100),
          humidity: status === 'offline' ? 0 : 40 + Math.floor(Math.random() * 20),
          uptime: Math.floor(Math.random() * 2000),
          errorCount: status === 'error' ? Math.floor(Math.random() * 5) + 1 : 0,
        },
        capabilities: {
          canPrint: status !== 'offline' && status !== 'error',
          canQueue: status !== 'offline',
          canCalibrate: status !== 'offline',
        },
        lastPing: status === 'offline'
          ? new Date(Date.now() - 3600000)
          : new Date(),
      })
    })
  })

  return printers
}

interface GodModeDashboardProps {
  onOnboardComplete?: (sites: Site[]) => void
  onBack?: () => void
  onLogout?: () => void
}

export function GodModeDashboard({
  onOnboardComplete,
  onBack,
  onLogout,
}: GodModeDashboardProps = {}) {
  // User preferences
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences)

  // UI state
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)

  // Shared selection state (received from GlobalMap via callback)
  const [selectedSites, setSelectedSites] = useState<Site[]>([])

  // Convert selected sites to printer units for TacticalView
  const sitePrinters = useMemo(() => {
    if (selectedSites.length === 0) return []
    return sitesToPrinterUnits(selectedSites)
  }, [selectedSites])

  // Callback when GlobalMap updates selection
  const handleSelectionChange = useCallback((_ids: Set<string>, sites: Site[]) => {
    setSelectedSites(sites)
  }, [])

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

  // Control groups for tactical map (currently unused, will be enabled with tactical view)
  // const { assignGroup, selectGroup } = useControlGroups({
  //   onGroupSelected: (_groupNumber, agentIds) => {
  //     // Update selection when group is selected
  //   },
  // })

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

  return (
    <div className="god-mode-view" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      background: '#050810',
      overflow: 'hidden'
    }}>
      {/* Scan line overlay */}
      {preferences.showScanlines && <ScanLineOverlay />}

      {/* Header with Resource Bar and View Toggle */}
      <header className={styles.header}>
        {/* Logo and Back/Logout buttons */}
        <div className={styles.headerNav}>
          <img src="/arc-logo.png" alt="Arc" className={styles.headerLogo} />
          {onBack && (
            <button
              className={styles.navButton}
              onClick={onBack}
              title="Back to Home"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          {onLogout && (
            <button
              className={styles.navButton}
              onClick={onLogout}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
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

      {/* Main Content - flex: 1 to fill remaining space */}
      <main style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        minHeight: 0
      }}>
        {preferences.viewMode === 'global' ? (
          <GlobalMap
            onOnboardComplete={onOnboardComplete}
            onSelectionChange={handleSelectionChange}
          />
        ) : (
          <TacticalView sitePrinters={sitePrinters} />
        )}
      </main>

      {/* Event Log Footer - only show for global view since TacticalView has its own */}
      {preferences.viewMode === 'global' && (
        <footer className={styles.footer}>
          <EventLog
            entries={eventEntries}
            maxEntries={preferences.eventLogExpanded ? 100 : 20}
          />
        </footer>
      )}

      {/* Shortcuts Help Modal */}
      <ShortcutsHelpModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  )
}

export default GodModeDashboard
