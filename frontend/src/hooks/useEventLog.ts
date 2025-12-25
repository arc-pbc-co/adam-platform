/**
 * useEventLog - Hook for managing event log state with WebSocket support
 *
 * Features:
 * - Manages event log entries with automatic pruning
 * - WebSocket subscription for real-time events (topic: adam/events)
 * - Simulated event generation for demo/testing
 * - Event adding/clearing utilities
 *
 * Connects to ADAM WebSocket gateway for real-time events
 * from Nova, printers, campaigns, and system infrastructure.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  EventLogEntry,
  EventLevel,
  EventSource,
} from '../components/god-mode/EventLog'
import { generateMockEvents } from '../components/god-mode/EventLog'
import { useWebSocketContext } from '../contexts/WebSocketContext'
import type { ConnectionStatus } from '../contexts/WebSocketContext'

export interface UseEventLogOptions {
  /** Maximum number of events to keep (default: 100) */
  maxEvents?: number
  /** Initial events to populate the log */
  initialEvents?: EventLogEntry[]
  /** Enable simulated events for demo (default: true) */
  simulateEvents?: boolean
  /** Interval for simulated events in ms (default: 5000) */
  simulateInterval?: number
  /** Enable WebSocket subscription (default: true when provider available) */
  useWebSocket?: boolean
}

export interface UseEventLogReturn {
  /** Current log entries */
  entries: EventLogEntry[]
  /** Add a new event */
  addEvent: (
    type: EventLevel,
    source: EventSource,
    message: string
  ) => void
  /** Add a batch of events */
  addEvents: (events: EventLogEntry[]) => void
  /** Clear all events */
  clearEvents: () => void
  /** Connection status for WebSocket */
  isConnected: boolean
  /** WebSocket connection status */
  connectionStatus: ConnectionStatus
  /** Any connection error */
  error: Error | null
  /** Whether receiving real-time events */
  isRealTime: boolean
}

// WebSocket topic for events
const EVENTS_TOPIC = 'adam/events'

// Type for incoming WebSocket event
interface WSEventPayload {
  id?: string
  type: EventLevel
  source: EventSource
  message: string
  timestamp?: string
  metadata?: Record<string, unknown>
}

/**
 * Hook for managing event log state with WebSocket support
 */
export function useEventLog(
  options: UseEventLogOptions = {}
): UseEventLogReturn {
  const {
    maxEvents = 100,
    initialEvents,
    simulateEvents = true,
    simulateInterval = 5000,
    useWebSocket: enableWebSocket = true,
  } = options

  // Initialize with provided events or generate mock data
  const [entries, setEntries] = useState<EventLogEntry[]>(() => {
    if (initialEvents) return initialEvents.slice(0, maxEvents)
    return generateMockEvents(15)
  })

  const [isRealTime, setIsRealTime] = useState(false)
  // Error state for future WebSocket connection errors
  const [error] = useState<Error | null>(null)

  // Track if component is mounted for cleanup
  const mountedRef = useRef(true)

  // Try to get WebSocket context (may not be available)
  let wsContext: ReturnType<typeof useWebSocketContext> | null = null
  try {
    wsContext = useWebSocketContext()
  } catch {
    // WebSocket provider not available, fallback to simulation
  }

  const connectionStatus: ConnectionStatus = wsContext?.status ?? 'disconnected'
  const isConnected = connectionStatus === 'connected'

  // Add a single event
  const addEvent = useCallback(
    (type: EventLevel, source: EventSource, message: string) => {
      const newEvent: EventLogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        type,
        source,
        message,
      }

      setEntries((prev) => [newEvent, ...prev].slice(0, maxEvents))
    },
    [maxEvents]
  )

  // Add multiple events at once
  const addEvents = useCallback(
    (newEvents: EventLogEntry[]) => {
      setEntries((prev) => {
        const combined = [...newEvents, ...prev]
        // Sort by timestamp descending
        combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        return combined.slice(0, maxEvents)
      })
    },
    [maxEvents]
  )

  // Clear all events
  const clearEvents = useCallback(() => {
    setEntries([])
  }, [])

  // Handle WebSocket events
  const handleWebSocketEvent = useCallback(
    (payload: unknown) => {
      const event = payload as WSEventPayload

      const newEntry: EventLogEntry = {
        id: event.id ?? crypto.randomUUID(),
        timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
        type: event.type,
        source: event.source,
        message: event.message,
      }

      setEntries((prev) => [newEntry, ...prev].slice(0, maxEvents))
      setIsRealTime(true)
    },
    [maxEvents]
  )

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!wsContext || !enableWebSocket) return

    const unsubscribe = wsContext.subscribe(EVENTS_TOPIC, handleWebSocketEvent)

    return unsubscribe
  }, [wsContext, enableWebSocket, handleWebSocketEvent])

  // Update real-time status based on connection
  useEffect(() => {
    if (connectionStatus !== 'connected') {
      setIsRealTime(false)
    }
  }, [connectionStatus])

  // Simulate events for demo (only when not receiving real-time data)
  useEffect(() => {
    if (!simulateEvents || isRealTime) return

    const generateRandomEvent = (): EventLogEntry => {
      const templates = getEventTemplates()
      const template = templates[Math.floor(Math.random() * templates.length)]
      const message =
        template.messages[Math.floor(Math.random() * template.messages.length)]

      return {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        type: template.type,
        source: template.source,
        message,
      }
    }

    const interval = setInterval(() => {
      if (mountedRef.current) {
        const newEvent = generateRandomEvent()
        setEntries((prev) => [newEvent, ...prev].slice(0, maxEvents))
      }
    }, simulateInterval)

    return () => {
      clearInterval(interval)
    }
  }, [simulateEvents, isRealTime, simulateInterval, maxEvents])

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  return {
    entries,
    addEvent,
    addEvents,
    clearEvents,
    isConnected,
    connectionStatus,
    error,
    isRealTime,
  }
}

// Event templates for simulation
function getEventTemplates(): Array<{
  source: EventSource
  type: EventLevel
  messages: string[]
}> {
  return [
    // Nova (AI orchestrator) events
    {
      source: 'nova',
      type: 'info',
      messages: [
        'Analyzing experiment results from batch #2847',
        'Optimizing print parameters for next run',
        'Scheduling material characterization workflow',
        'Correlating sensor data with print quality metrics',
        'Generating build strategy recommendations',
        'Processing thermal imaging data',
        'Updating process model with new observations',
      ],
    },
    {
      source: 'nova',
      type: 'success',
      messages: [
        'Model training completed: 97.3% accuracy',
        'Defect classification model updated',
        'Powder flow optimization achieved target metrics',
        'Autonomous parameter adjustment successful',
        'Quality prediction validated against actual results',
      ],
    },
    {
      source: 'nova',
      type: 'warning',
      messages: [
        'Anomaly detected in layer 127 thermal signature',
        'Recommending parameter recalibration',
        'Powder moisture content approaching threshold',
        'Unusual vibration pattern detected',
      ],
    },
    // Printer events
    {
      source: 'x25-pro',
      type: 'info',
      messages: [
        'Starting print job: Part_A7_Rev3',
        'Layer 45 of 312 completed',
        'Recoater pass complete',
        'Heating bed to operating temperature',
        'Powder bed preheating in progress',
      ],
    },
    {
      source: 'shop-system',
      type: 'success',
      messages: [
        'Print job completed successfully',
        'Debind cycle finished',
        'Sinter cycle completed: 99.2% density achieved',
        'Part extraction complete',
      ],
    },
    {
      source: 'studio-system',
      type: 'warning',
      messages: [
        'Material level low: 15% remaining',
        'Scheduled maintenance due in 48 hours',
        'Print head temperature variance detected',
        'Build chamber humidity elevated',
      ],
    },
    {
      source: 'innovent-x',
      type: 'error',
      messages: [
        'Laser power calibration failed',
        'Emergency stop triggered: safety interlock',
        'Communication timeout with controller',
      ],
    },
    // Campaign events
    {
      source: 'campaign',
      type: 'info',
      messages: [
        'Experiment EXP-2024-0847 started',
        'Workflow step 3 of 7: Sintering',
        'Sample collection scheduled for 14:30',
        'QC inspection queued',
        'Material characterization in progress',
      ],
    },
    {
      source: 'campaign',
      type: 'success',
      messages: [
        'Experiment EXP-2024-0846 passed all QC checks',
        'Batch #2847 completed: 12/12 parts accepted',
        'Material qualification campaign finished',
        'Tensile test results within spec',
      ],
    },
    // System events
    {
      source: 'system',
      type: 'info',
      messages: [
        'WebSocket connection established',
        'Controller heartbeat received',
        'Database backup completed',
        'Metrics sync completed',
        'Health check passed',
      ],
    },
    {
      source: 'system',
      type: 'warning',
      messages: [
        'High latency detected: 250ms',
        'Storage usage at 78%',
        'Rate limit approaching for API endpoint',
        'Memory usage elevated',
      ],
    },
  ]
}

export default useEventLog
