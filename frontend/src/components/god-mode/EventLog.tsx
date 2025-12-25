/**
 * EventLog - SC2-style scrolling event/message log
 *
 * Displays real-time events with:
 * - Timestamp
 * - Event type (color-coded: info, success, warning, error)
 * - Source (nova=purple, printers, campaign, system)
 * - Message
 * - Filter toggles to show/hide event types
 * - Auto-scroll to bottom when new events arrive
 *
 * Uses augmented-ui with tl-clip border styling.
 */

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import styles from './EventLog.module.css'

// Event types
export type EventLevel = 'info' | 'success' | 'warning' | 'error'

// Event sources
export type EventSource =
  | 'nova'
  | 'x25-pro'
  | 'shop-system'
  | 'studio-system'
  | 'innovent-x'
  | 'campaign'
  | 'system'
  | string

// Extended log entry with source typing
export interface EventLogEntry {
  id: string
  timestamp: Date
  type: EventLevel
  source: EventSource
  message: string
}

// Filter state type
export interface EventFilters {
  info: boolean
  success: boolean
  warning: boolean
  error: boolean
}

interface EventLogProps {
  entries: EventLogEntry[]
  maxEntries?: number
  showFilters?: boolean
  autoScroll?: boolean
}

const DEFAULT_FILTERS: EventFilters = {
  info: true,
  success: true,
  warning: true,
  error: true,
}

/**
 * EventLog component with filtering and auto-scroll
 */
export function EventLog({
  entries,
  maxEntries = 100,
  showFilters = true,
  autoScroll = true,
}: EventLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [userScrolled, setUserScrolled] = useState(false)

  // Filter entries based on current filter state
  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) => filters[entry.type])
      .slice(0, maxEntries)
  }, [entries, filters, maxEntries])

  // Count entries by type for filter badges
  const typeCounts = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        acc[entry.type] = (acc[entry.type] || 0) + 1
        return acc
      },
      { info: 0, success: 0, warning: 0, error: 0 } as Record<EventLevel, number>
    )
  }, [entries])

  // Toggle a specific filter
  const toggleFilter = useCallback((type: EventLevel) => {
    setFilters((prev) => ({ ...prev, [type]: !prev[type] }))
  }, [])

  // Track if user has manually scrolled
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    // User is considered "scrolled away" if not at bottom
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
    setUserScrolled(!isAtBottom)
  }, [])

  // Auto-scroll to bottom when new entries arrive (if enabled and user hasn't scrolled away)
  useEffect(() => {
    if (autoScroll && !userScrolled && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [filteredEntries, autoScroll, userScrolled])

  // Scroll to bottom button handler
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      setUserScrolled(false)
    }
  }, [])

  return (
    <div
      className={styles.log}
      data-augmented-ui="tl-clip border"
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>EVENT LOG</span>
          <span className={styles.count}>
            {filteredEntries.length}
            {filteredEntries.length !== entries.length && ` / ${entries.length}`}
          </span>
        </div>

        <div className={styles.headerRight}>
          {/* Quick filter indicators */}
          {showFilters && (
            <div className={styles.quickFilters}>
              {(['error', 'warning', 'success', 'info'] as EventLevel[]).map((type) => (
                <button
                  key={type}
                  className={`${styles.quickFilter} ${styles[type]} ${
                    !filters[type] ? styles.disabled : ''
                  }`}
                  onClick={() => toggleFilter(type)}
                  title={`${filters[type] ? 'Hide' : 'Show'} ${type} events`}
                >
                  <TypeIcon type={type} />
                  <span className={styles.filterCount}>{typeCounts[type]}</span>
                </button>
              ))}
            </div>
          )}

          {/* Expand filters button */}
          {showFilters && (
            <button
              className={styles.filterToggle}
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              title="Toggle filter panel"
            >
              <Filter size={12} />
              {filtersExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded filter panel */}
      <AnimatePresence>
        {filtersExpanded && (
          <motion.div
            className={styles.filterPanel}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className={styles.filterOptions}>
              {(['info', 'success', 'warning', 'error'] as EventLevel[]).map((type) => (
                <label key={type} className={styles.filterOption}>
                  <input
                    type="checkbox"
                    checked={filters[type]}
                    onChange={() => toggleFilter(type)}
                    className={styles.filterCheckbox}
                  />
                  <span className={`${styles.filterLabel} ${styles[type]}`}>
                    <TypeIcon type={type} />
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </span>
                  <span className={styles.filterBadge}>{typeCounts[type]}</span>
                </label>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log entries */}
      <div
        className={styles.entries}
        ref={scrollRef}
        onScroll={handleScroll}
      >
        <AnimatePresence initial={false}>
          {filteredEntries.map((entry) => (
            <EventEntry key={entry.id} entry={entry} />
          ))}
        </AnimatePresence>

        {filteredEntries.length === 0 && (
          <div className={styles.emptyState}>
            {entries.length === 0
              ? 'No events yet'
              : 'No events match current filters'}
          </div>
        )}
      </div>

      {/* Scroll to bottom indicator */}
      {userScrolled && (
        <button
          className={styles.scrollIndicator}
          onClick={scrollToBottom}
          title="Scroll to latest"
        >
          <ChevronDown size={14} />
          <span>New events</span>
        </button>
      )}
    </div>
  )
}

interface EventEntryProps {
  entry: EventLogEntry
}

function EventEntry({ entry }: EventEntryProps) {
  // Determine source category for styling
  const sourceCategory = getSourceCategory(entry.source)

  return (
    <motion.div
      className={`${styles.entry} ${styles[`source--${sourceCategory}`]}`}
      initial={{ opacity: 0, x: -20, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ duration: 0.15 }}
    >
      <span className={styles.time}>{formatTime(entry.timestamp)}</span>
      <span className={`${styles.type} ${styles[entry.type]}`}>
        <TypeIcon type={entry.type} />
        {entry.type.toUpperCase()}
      </span>
      <span className={`${styles.source} ${styles[`source--${sourceCategory}`]}`}>
        [{entry.source.toUpperCase()}]
      </span>
      <span className={styles.message}>{entry.message}</span>
    </motion.div>
  )
}

function TypeIcon({ type }: { type: EventLevel }) {
  const icons = {
    info: <Info size={10} />,
    success: <CheckCircle size={10} />,
    warning: <AlertTriangle size={10} />,
    error: <XCircle size={10} />,
  }
  return <span className={styles.typeIcon}>{icons[type]}</span>
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// Get source category for styling
function getSourceCategory(
  source: EventSource
): 'nova' | 'printer' | 'campaign' | 'system' {
  const sourceLower = source.toLowerCase()
  if (sourceLower === 'nova') return 'nova'
  if (sourceLower === 'campaign') return 'campaign'
  if (sourceLower === 'system') return 'system'
  // Printer-related sources
  if (
    sourceLower.includes('x25') ||
    sourceLower.includes('shop') ||
    sourceLower.includes('studio') ||
    sourceLower.includes('innovent') ||
    sourceLower.includes('dm-') ||
    sourceLower.includes('printer')
  ) {
    return 'printer'
  }
  return 'system'
}

/**
 * Generate realistic mock events for testing
 */
export function generateMockEvents(count: number = 20): EventLogEntry[] {
  const eventTemplates: Array<{
    source: EventSource
    type: EventLevel
    messages: string[]
  }> = [
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
      ],
    },
    {
      source: 'nova',
      type: 'warning',
      messages: [
        'Anomaly detected in layer 127 thermal signature',
        'Recommending parameter recalibration',
        'Powder moisture content approaching threshold',
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
      ],
    },
    {
      source: 'shop-system',
      type: 'success',
      messages: [
        'Print job completed successfully',
        'Debind cycle finished',
        'Sinter cycle completed: 99.2% density achieved',
      ],
    },
    {
      source: 'studio-system',
      type: 'warning',
      messages: [
        'Material level low: 15% remaining',
        'Scheduled maintenance due in 48 hours',
        'Print head temperature variance detected',
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
      ],
    },
    {
      source: 'campaign',
      type: 'success',
      messages: [
        'Experiment EXP-2024-0846 passed all QC checks',
        'Batch #2847 completed: 12/12 parts accepted',
        'Material qualification campaign finished',
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
      ],
    },
    {
      source: 'system',
      type: 'warning',
      messages: [
        'High latency detected: 250ms',
        'Storage usage at 78%',
        'Rate limit approaching for API endpoint',
      ],
    },
    {
      source: 'system',
      type: 'error',
      messages: [
        'Failed to connect to INTERSECT broker',
        'Database connection pool exhausted',
        'Authentication service timeout',
      ],
    },
  ]

  const events: EventLogEntry[] = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)]
    const message = template.messages[Math.floor(Math.random() * template.messages.length)]

    events.push({
      id: crypto.randomUUID(),
      timestamp: new Date(now - i * 60000 * Math.random() * 5),
      type: template.type,
      source: template.source,
      message,
    })
  }

  // Sort by timestamp descending (newest first)
  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

export default EventLog
