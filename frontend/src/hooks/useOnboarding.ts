/**
 * useOnboarding - Hook for managing ADAM site onboarding workflow
 *
 * Features:
 * - Start onboarding for selected sites
 * - Subscribe to progress updates via WebSocket/MQTT
 * - Track status for each site and printer
 * - Handle errors and retries
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useWebSocketContext } from '../contexts/WebSocketContext'
import type {
  OnboardingRequest,
  OnboardingResponse,
  OnboardingStatus,
  OnboardingBatchSummary,
  OnboardingProgressEvent,
  OnboardingRetryRequest,
} from '../types/onboarding'

export interface UseOnboardingOptions {
  /** API base URL (default: /api) */
  apiBaseUrl?: string
  /** Callback when a site completes onboarding */
  onSiteComplete?: (siteId: string, status: OnboardingStatus) => void
  /** Callback when all sites complete */
  onBatchComplete?: (summary: OnboardingBatchSummary) => void
  /** Callback when an error occurs */
  onError?: (error: Error) => void
}

export interface UseOnboardingReturn {
  /** Current onboarding status by site ID */
  statusBySite: Map<string, OnboardingStatus>
  /** Current batch summary */
  batchSummary: OnboardingBatchSummary | null
  /** Current batch ID */
  batchId: string | null
  /** Whether onboarding is in progress */
  isOnboarding: boolean
  /** Whether we're connected to receive updates */
  isConnected: boolean
  /** Start onboarding for sites */
  startOnboarding: (request: OnboardingRequest) => Promise<OnboardingResponse>
  /** Retry failed sites/printers */
  retryFailed: (request: OnboardingRetryRequest) => Promise<void>
  /** Cancel current onboarding */
  cancelOnboarding: () => Promise<void>
  /** Clear completed/cancelled status */
  clearStatus: () => void
  /** Get status for a specific site */
  getSiteStatus: (siteId: string) => OnboardingStatus | undefined
  /** Check if any sites have failed */
  hasFailures: boolean
  /** Get count of completed sites */
  completedCount: number
  /** Get count of failed sites */
  failedCount: number
}

// API endpoint paths
const API_PATHS = {
  start: '/onboarding/start',
  retry: '/onboarding/retry',
  cancel: '/onboarding/cancel',
  status: '/onboarding/status',
}

/**
 * Hook for managing site onboarding workflow
 */
export function useOnboarding(
  options: UseOnboardingOptions = {}
): UseOnboardingReturn {
  const {
    apiBaseUrl = '/api',
    onSiteComplete,
    onBatchComplete,
    onError,
  } = options

  const [statusBySite, setStatusBySite] = useState<Map<string, OnboardingStatus>>(new Map())
  const [batchSummary, setBatchSummary] = useState<OnboardingBatchSummary | null>(null)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [isOnboarding, setIsOnboarding] = useState(false)

  // Store callbacks in refs to avoid re-subscribing on every render
  const callbacksRef = useRef({ onSiteComplete, onBatchComplete, onError })
  callbacksRef.current = { onSiteComplete, onBatchComplete, onError }

  // WebSocket context for real-time updates
  let wsContext: ReturnType<typeof useWebSocketContext> | null = null
  try {
    wsContext = useWebSocketContext()
  } catch {
    // WebSocket provider not available
  }

  const isConnected = wsContext?.isConnected ?? false

  // Handle progress update from MQTT/WebSocket
  const handleProgressUpdate = useCallback((payload: unknown) => {
    const event = payload as OnboardingProgressEvent

    if (event.type === 'site_update') {
      const status = event.payload as OnboardingStatus
      setStatusBySite((prev) => {
        const next = new Map(prev)
        next.set(status.siteId, status)
        return next
      })

      // Call site complete callback
      if (status.status === 'online' || status.status === 'failed') {
        callbacksRef.current.onSiteComplete?.(status.siteId, status)
      }
    } else if (event.type === 'printer_update') {
      // Update printer within site status
      const status = event.payload as OnboardingStatus
      setStatusBySite((prev) => {
        const next = new Map(prev)
        const existing = next.get(status.siteId)
        if (existing) {
          next.set(status.siteId, {
            ...existing,
            printers: status.printers,
            progress: status.progress,
          })
        }
        return next
      })
    } else if (event.type === 'batch_complete' || event.type === 'batch_failed') {
      const summary = event.payload as OnboardingBatchSummary
      setBatchSummary(summary)
      setIsOnboarding(false)
      callbacksRef.current.onBatchComplete?.(summary)
    }
  }, [])

  // Subscribe to onboarding progress topic when batch is active
  useEffect(() => {
    if (!wsContext || !batchId) return

    const topic = `intersect/adam/onboarding/${batchId}/progress`
    const unsubscribe = wsContext.subscribe(topic, handleProgressUpdate)

    return unsubscribe
  }, [wsContext, batchId, handleProgressUpdate])

  // Start onboarding
  const startOnboarding = useCallback(
    async (request: OnboardingRequest): Promise<OnboardingResponse> => {
      try {
        setIsOnboarding(true)
        setStatusBySite(new Map())
        setBatchSummary(null)

        // Initialize status for all sites
        const initialStatus = new Map<string, OnboardingStatus>()
        request.siteIds.forEach((siteId) => {
          initialStatus.set(siteId, {
            siteId,
            siteName: '', // Will be populated from response
            status: 'pending',
            progress: 0,
            printers: [],
          })
        })
        setStatusBySite(initialStatus)

        // Call API to start onboarding
        const response = await fetch(`${apiBaseUrl}${API_PATHS.start}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Failed to start onboarding' }))
          throw new Error(error.message || `HTTP ${response.status}`)
        }

        const data: OnboardingResponse = await response.json()
        setBatchId(data.batchId)

        return data
      } catch (error) {
        setIsOnboarding(false)
        callbacksRef.current.onError?.(error as Error)
        throw error
      }
    },
    [apiBaseUrl]
  )

  // Retry failed sites/printers
  const retryFailed = useCallback(
    async (request: OnboardingRetryRequest): Promise<void> => {
      try {
        const response = await fetch(`${apiBaseUrl}${API_PATHS.retry}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Failed to retry onboarding' }))
          throw new Error(error.message || `HTTP ${response.status}`)
        }

        // Reset status for retried sites
        if (request.siteIds) {
          setStatusBySite((prev) => {
            const next = new Map(prev)
            request.siteIds!.forEach((siteId) => {
              const existing = next.get(siteId)
              if (existing) {
                next.set(siteId, {
                  ...existing,
                  status: 'pending',
                  progress: 0,
                  error: undefined,
                  printers: existing.printers.map((p) => ({
                    ...p,
                    status: 'pending',
                    error: undefined,
                  })),
                })
              }
            })
            return next
          })
        }

        setIsOnboarding(true)
      } catch (error) {
        callbacksRef.current.onError?.(error as Error)
        throw error
      }
    },
    [apiBaseUrl]
  )

  // Cancel onboarding
  const cancelOnboarding = useCallback(async (): Promise<void> => {
    if (!batchId) return

    try {
      const response = await fetch(`${apiBaseUrl}${API_PATHS.cancel}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batchId }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to cancel onboarding' }))
        throw new Error(error.message || `HTTP ${response.status}`)
      }

      setIsOnboarding(false)
    } catch (error) {
      callbacksRef.current.onError?.(error as Error)
      throw error
    }
  }, [apiBaseUrl, batchId])

  // Clear status
  const clearStatus = useCallback(() => {
    setStatusBySite(new Map())
    setBatchSummary(null)
    setBatchId(null)
    setIsOnboarding(false)
  }, [])

  // Get status for a specific site
  const getSiteStatus = useCallback(
    (siteId: string): OnboardingStatus | undefined => {
      return statusBySite.get(siteId)
    },
    [statusBySite]
  )

  // Calculate derived values
  const hasFailures = Array.from(statusBySite.values()).some(
    (status) => status.status === 'failed'
  )

  const completedCount = Array.from(statusBySite.values()).filter(
    (status) => status.status === 'online'
  ).length

  const failedCount = Array.from(statusBySite.values()).filter(
    (status) => status.status === 'failed'
  ).length

  return {
    statusBySite,
    batchSummary,
    batchId,
    isOnboarding,
    isConnected,
    startOnboarding,
    retryFailed,
    cancelOnboarding,
    clearStatus,
    getSiteStatus,
    hasFailures,
    completedCount,
    failedCount,
  }
}

export default useOnboarding
