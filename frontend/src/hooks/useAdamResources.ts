/**
 * useAdamResources - Hook for fetching ADAM system resource metrics
 *
 * Returns current values for:
 * - Compute usage (percentage)
 * - Token usage (current/max)
 * - Active jobs (count)
 * - Agents online (connected printers)
 * - Experiments today (count toward daily target)
 *
 * Supports both WebSocket real-time updates (topic: adam/metrics)
 * and simulated updates for demo/testing.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { AdamResource } from '../components/god-mode/ResourceBar'
import { useWebSocketContext } from '../contexts/WebSocketContext'
import type { ConnectionStatus } from '../contexts/WebSocketContext'

export interface AdamResourceValues {
  compute: number
  tokens: number
  jobs: number
  agents: number
  experiments: number
}

export interface AdamResourceConfig {
  compute: { max: number }
  tokens: { max: number }
  jobs: { max: number }
  agents: { max: number }
  experiments: { max: number; unit?: string }
}

export interface UseAdamResourcesOptions {
  /** Polling interval in ms (default: 5000) */
  pollInterval?: number
  /** Enable simulated updates for demo (default: true) */
  simulateUpdates?: boolean
  /** Custom configuration for resource max values */
  config?: Partial<AdamResourceConfig>
  /** Enable WebSocket subscription (default: true when provider available) */
  useWebSocket?: boolean
}

export interface UseAdamResourcesReturn {
  resources: AdamResource[]
  values: AdamResourceValues
  isLoading: boolean
  error: Error | null
  refresh: () => void
  /** WebSocket connection status */
  connectionStatus: ConnectionStatus
  /** Whether real-time data is connected */
  isRealTime: boolean
}

// Default configuration
const DEFAULT_CONFIG: AdamResourceConfig = {
  compute: { max: 100 },
  tokens: { max: 100000 },
  jobs: { max: 50 },
  agents: { max: 20 },
  experiments: { max: 200, unit: 'today' },
}

// Default initial values
const DEFAULT_VALUES: AdamResourceValues = {
  compute: 54,
  tokens: 23500,
  jobs: 7,
  agents: 8,
  experiments: 42,
}

// WebSocket topic for metrics
const METRICS_TOPIC = 'adam/metrics'

// Format number with K suffix for thousands
function formatWithK(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toString()
}

/**
 * Hook to manage ADAM resource metrics with WebSocket support
 */
export function useAdamResources(
  options: UseAdamResourcesOptions = {}
): UseAdamResourcesReturn {
  const {
    pollInterval = 5000,
    simulateUpdates = true,
    config: customConfig,
    useWebSocket: enableWebSocket = true,
  } = options

  const config = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...customConfig }),
    [customConfig]
  )

  const [values, setValues] = useState<AdamResourceValues>(DEFAULT_VALUES)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isRealTime, setIsRealTime] = useState(false)

  // Try to get WebSocket context (may not be available)
  let wsContext: ReturnType<typeof useWebSocketContext> | null = null
  try {
    wsContext = useWebSocketContext()
  } catch {
    // WebSocket provider not available, fallback to simulation
  }

  const connectionStatus: ConnectionStatus = wsContext?.status ?? 'disconnected'

  // Handle WebSocket messages
  const handleMetricsMessage = useCallback(
    (payload: unknown) => {
      const metrics = payload as Partial<AdamResourceValues>
      setValues((prev) => ({
        compute: metrics.compute ?? prev.compute,
        tokens: metrics.tokens ?? prev.tokens,
        jobs: metrics.jobs ?? prev.jobs,
        agents: metrics.agents ?? prev.agents,
        experiments: metrics.experiments ?? prev.experiments,
      }))
      setIsRealTime(true)
    },
    []
  )

  // Subscribe to WebSocket topic
  useEffect(() => {
    if (!wsContext || !enableWebSocket) return

    const unsubscribe = wsContext.subscribe(METRICS_TOPIC, handleMetricsMessage)

    // Track if we receive real data
    if (wsContext.isConnected) {
      // Request initial metrics
      wsContext.send('adam/metrics/request', { type: 'full' })
    }

    return unsubscribe
  }, [wsContext, enableWebSocket, handleMetricsMessage])

  // Update real-time status based on connection
  useEffect(() => {
    if (connectionStatus !== 'connected') {
      setIsRealTime(false)
    }
  }, [connectionStatus])

  // Fetch real metrics from API (currently stubbed)
  const fetchMetrics = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // TODO: Replace with real API call
      // const response = await fetch('/api/adam/metrics')
      // const data = await response.json()
      // setValues(data)

      // For now, just keep current values
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch metrics'))
      setIsLoading(false)
    }
  }, [])

  // Simulate metric updates for demo purposes (only when not receiving real-time data)
  useEffect(() => {
    if (!simulateUpdates || isRealTime) return

    const interval = setInterval(() => {
      setValues((prev) => ({
        compute: clamp(prev.compute + randomDelta(5), 0, 100),
        tokens: clamp(prev.tokens + randomDelta(500), 0, config.tokens.max),
        jobs: clamp(prev.jobs + randomDelta(1, 0.3), 0, config.jobs.max),
        agents: clamp(prev.agents + randomDelta(1, 0.1), 1, config.agents.max),
        experiments: clamp(
          prev.experiments + (Math.random() > 0.7 ? 1 : 0),
          0,
          config.experiments.max
        ),
      }))
    }, pollInterval)

    return () => clearInterval(interval)
  }, [simulateUpdates, isRealTime, pollInterval, config])

  // Convert values to AdamResource array
  const resources: AdamResource[] = useMemo(
    () => [
      {
        id: 'compute',
        label: 'Compute',
        icon: 'compute',
        current: values.compute,
        max: config.compute.max,
        formatValue: (current) => `${Math.round(current)}%`,
      },
      {
        id: 'tokens',
        label: 'Tokens',
        icon: 'tokens',
        current: values.tokens,
        max: config.tokens.max,
        formatValue: (current, max) =>
          `${formatWithK(current)}/${formatWithK(max)}`,
      },
      {
        id: 'jobs',
        label: 'Active Jobs',
        icon: 'jobs',
        current: values.jobs,
        max: config.jobs.max,
      },
      {
        id: 'agents',
        label: 'Agents',
        icon: 'agents',
        current: values.agents,
        max: config.agents.max,
      },
      {
        id: 'experiments',
        label: 'Experiments',
        icon: 'experiments',
        current: values.experiments,
        max: config.experiments.max,
        unit: config.experiments.unit,
      },
    ],
    [values, config]
  )

  return {
    resources,
    values,
    isLoading,
    error,
    refresh: fetchMetrics,
    connectionStatus,
    isRealTime,
  }
}

// Helper functions
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function randomDelta(magnitude: number, probability = 0.5): number {
  if (Math.random() > probability) return 0
  return (Math.random() - 0.5) * 2 * magnitude
}

export default useAdamResources
