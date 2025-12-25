/**
 * useCampaignStatus - Hook for real-time experiment campaign tracking
 *
 * Features:
 * - WebSocket subscription for campaign events (topic: adam/campaigns/+/events)
 * - Tracks active campaigns and experiments
 * - Provides workflow progress tracking
 * - Aggregates experiment metrics
 *
 * Topic pattern: adam/campaigns/{campaignId}/events
 * Wildcard subscription: adam/campaigns/+/events
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useWebSocketContext } from '../contexts/WebSocketContext'
import type { ConnectionStatus } from '../contexts/WebSocketContext'

// Campaign status types
export type CampaignStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
export type ExperimentStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

// Workflow step
export interface WorkflowStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  progress: number
  startedAt?: string
  completedAt?: string
}

// Experiment within a campaign
export interface Experiment {
  id: string
  name: string
  status: ExperimentStatus
  progress: number
  currentStep?: string
  startedAt?: string
  completedAt?: string
  results?: {
    passed: boolean
    metrics?: Record<string, number>
    notes?: string
  }
}

// Campaign payload from WebSocket
export interface CampaignPayload {
  campaignId: string
  name: string
  status: CampaignStatus
  description?: string
  workflow: WorkflowStep[]
  experiments: Experiment[]
  metrics: {
    totalExperiments: number
    completedExperiments: number
    successRate: number
    avgDuration?: number // minutes
  }
  createdAt: string
  startedAt?: string
  completedAt?: string
}

// Campaign event from WebSocket
export interface CampaignEvent {
  campaignId: string
  eventType: 'started' | 'progress' | 'step_completed' | 'experiment_completed' | 'completed' | 'failed' | 'paused'
  payload: Partial<CampaignPayload>
  timestamp: string
}

// Tracked campaign with additional client metadata
export interface TrackedCampaign extends CampaignPayload {
  lastUpdate: Date
  overallProgress: number
}

export interface UseCampaignStatusOptions {
  /** Only track active campaigns (default: true) */
  activeOnly?: boolean
  /** Enable WebSocket subscription (default: true) */
  useWebSocket?: boolean
  /** Enable simulated updates for demo (default: true) */
  simulateUpdates?: boolean
}

export interface CampaignStats {
  total: number
  running: number
  pending: number
  completed: number
  failed: number
  avgSuccessRate: number
  totalExperiments: number
  completedExperiments: number
}

export interface UseCampaignStatusReturn {
  /** Map of campaign ID to campaign status */
  campaigns: Map<string, TrackedCampaign>
  /** Array of all tracked campaigns */
  campaignList: TrackedCampaign[]
  /** Aggregate statistics */
  stats: CampaignStats
  /** Get campaign by ID */
  getCampaign: (id: string) => TrackedCampaign | undefined
  /** WebSocket connection status */
  connectionStatus: ConnectionStatus
  /** Whether connected */
  isConnected: boolean
  /** Whether receiving real-time updates */
  isRealTime: boolean
  /** Start a campaign */
  startCampaign: (campaignId: string) => boolean
  /** Pause a campaign */
  pauseCampaign: (campaignId: string) => boolean
  /** Resume a campaign */
  resumeCampaign: (campaignId: string) => boolean
  /** Cancel a campaign */
  cancelCampaign: (campaignId: string) => boolean
}

// WebSocket topic patterns
const CAMPAIGN_EVENTS_TOPIC = 'adam/campaigns/+/events'
const CAMPAIGN_COMMAND_TOPIC = (campaignId: string) => `adam/campaigns/${campaignId}/command`

/**
 * Hook for tracking real-time campaign status
 */
export function useCampaignStatus(
  options: UseCampaignStatusOptions = {}
): UseCampaignStatusReturn {
  const {
    activeOnly = true,
    useWebSocket: enableWebSocket = true,
    simulateUpdates = true,
  } = options

  const [campaigns, setCampaigns] = useState<Map<string, TrackedCampaign>>(new Map())
  const [isRealTime, setIsRealTime] = useState(false)

  // Try to get WebSocket context (may not be available)
  let wsContext: ReturnType<typeof useWebSocketContext> | null = null
  try {
    wsContext = useWebSocketContext()
  } catch {
    // WebSocket provider not available, fallback to simulation
  }

  const connectionStatus: ConnectionStatus = wsContext?.status ?? 'disconnected'
  const isConnected = connectionStatus === 'connected'

  // Calculate overall progress for a campaign
  const calculateProgress = useCallback((campaign: CampaignPayload): number => {
    if (campaign.metrics.totalExperiments === 0) return 0
    const experimentProgress = (campaign.metrics.completedExperiments / campaign.metrics.totalExperiments) * 100
    return Math.round(experimentProgress)
  }, [])

  // Handle incoming campaign events
  const handleCampaignEvent = useCallback((payload: unknown) => {
    const event = payload as CampaignEvent

    setCampaigns((prev) => {
      const next = new Map(prev)
      const existing = prev.get(event.campaignId)

      if (event.eventType === 'started' || !existing) {
        // New campaign or full update
        const campaignData = event.payload as CampaignPayload
        next.set(event.campaignId, {
          ...campaignData,
          campaignId: event.campaignId,
          lastUpdate: new Date(),
          overallProgress: calculateProgress(campaignData),
        })
      } else {
        // Partial update
        const updated: TrackedCampaign = {
          ...existing,
          ...event.payload,
          lastUpdate: new Date(),
        }
        updated.overallProgress = calculateProgress(updated)
        next.set(event.campaignId, updated)
      }

      return next
    })
    setIsRealTime(true)
  }, [calculateProgress])

  // Subscribe to campaign events topic
  useEffect(() => {
    if (!wsContext || !enableWebSocket) return

    const unsubscribe = wsContext.subscribe(CAMPAIGN_EVENTS_TOPIC, handleCampaignEvent)

    return unsubscribe
  }, [wsContext, enableWebSocket, handleCampaignEvent])

  // Update real-time status based on connection
  useEffect(() => {
    if (connectionStatus !== 'connected') {
      setIsRealTime(false)
    }
  }, [connectionStatus])

  // Simulate campaign updates for demo (only when not receiving real-time data)
  useEffect(() => {
    if (!simulateUpdates || isRealTime) return

    // Initialize with mock campaigns
    const mockCampaigns: CampaignPayload[] = [
      {
        campaignId: 'campaign-001',
        name: 'Material Qualification - Ti-6Al-4V',
        status: 'running',
        description: 'Qualify new titanium alloy powder batch for aerospace components',
        workflow: [
          { id: 'step-1', name: 'Powder Characterization', status: 'completed', progress: 100 },
          { id: 'step-2', name: 'Parameter Development', status: 'completed', progress: 100 },
          { id: 'step-3', name: 'Density Optimization', status: 'running', progress: 67 },
          { id: 'step-4', name: 'Mechanical Testing', status: 'pending', progress: 0 },
          { id: 'step-5', name: 'Final Report', status: 'pending', progress: 0 },
        ],
        experiments: [
          { id: 'exp-001', name: 'Flowability Test A', status: 'completed', progress: 100, results: { passed: true } },
          { id: 'exp-002', name: 'Particle Analysis', status: 'completed', progress: 100, results: { passed: true } },
          { id: 'exp-003', name: 'Density Cube #1', status: 'running', progress: 45 },
          { id: 'exp-004', name: 'Density Cube #2', status: 'queued', progress: 0 },
        ],
        metrics: { totalExperiments: 12, completedExperiments: 5, successRate: 92, avgDuration: 45 },
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        startedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        campaignId: 'campaign-002',
        name: 'Process Optimization - 316L',
        status: 'running',
        description: 'Optimize build parameters for improved surface finish',
        workflow: [
          { id: 'step-1', name: 'Baseline Measurement', status: 'completed', progress: 100 },
          { id: 'step-2', name: 'DOE Study', status: 'running', progress: 33 },
          { id: 'step-3', name: 'Validation', status: 'pending', progress: 0 },
        ],
        experiments: [
          { id: 'exp-010', name: 'Surface Roughness Baseline', status: 'completed', progress: 100, results: { passed: true } },
          { id: 'exp-011', name: 'DOE Run 1', status: 'completed', progress: 100, results: { passed: true } },
          { id: 'exp-012', name: 'DOE Run 2', status: 'running', progress: 78 },
          { id: 'exp-013', name: 'DOE Run 3', status: 'queued', progress: 0 },
        ],
        metrics: { totalExperiments: 8, completedExperiments: 2, successRate: 100, avgDuration: 30 },
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        startedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        campaignId: 'campaign-003',
        name: 'New Part Qualification - Turbine Blade',
        status: 'pending',
        description: 'First article qualification for new turbine blade design',
        workflow: [
          { id: 'step-1', name: 'Build Prep', status: 'pending', progress: 0 },
          { id: 'step-2', name: 'Print', status: 'pending', progress: 0 },
          { id: 'step-3', name: 'Post-Process', status: 'pending', progress: 0 },
          { id: 'step-4', name: 'Inspection', status: 'pending', progress: 0 },
        ],
        experiments: [],
        metrics: { totalExperiments: 0, completedExperiments: 0, successRate: 0 },
        createdAt: new Date().toISOString(),
      },
    ]

    // Set initial mock campaigns
    setCampaigns((prev) => {
      if (prev.size === 0) {
        const next = new Map<string, TrackedCampaign>()
        mockCampaigns.forEach((campaign) => {
          next.set(campaign.campaignId, {
            ...campaign,
            lastUpdate: new Date(),
            overallProgress: calculateProgress(campaign),
          })
        })
        return next
      }
      return prev
    })

    // Simulate periodic updates
    const interval = setInterval(() => {
      setCampaigns((prev) => {
        const next = new Map(prev)
        const activeCampaigns = Array.from(prev.values()).filter((c) => c.status === 'running')

        if (activeCampaigns.length === 0) return prev

        // Update a random active campaign
        const campaign = activeCampaigns[Math.floor(Math.random() * activeCampaigns.length)]

        // Update running experiments
        const updatedExperiments = campaign.experiments.map((exp) => {
          if (exp.status === 'running') {
            const newProgress = Math.min(100, exp.progress + Math.random() * 8)
            if (newProgress >= 100) {
              return { ...exp, status: 'completed' as ExperimentStatus, progress: 100, results: { passed: Math.random() > 0.1 } }
            }
            return { ...exp, progress: Math.round(newProgress) }
          }
          return exp
        })

        // Start next queued experiment if current one completed
        const hasRunning = updatedExperiments.some((e) => e.status === 'running')
        if (!hasRunning) {
          const queuedIdx = updatedExperiments.findIndex((e) => e.status === 'queued')
          if (queuedIdx >= 0) {
            updatedExperiments[queuedIdx] = { ...updatedExperiments[queuedIdx], status: 'running' }
          }
        }

        // Update workflow steps
        const updatedWorkflow = campaign.workflow.map((step) => {
          if (step.status === 'running') {
            const newProgress = Math.min(100, step.progress + Math.random() * 5)
            if (newProgress >= 100) {
              return { ...step, status: 'completed' as WorkflowStep['status'], progress: 100 }
            }
            return { ...step, progress: Math.round(newProgress) }
          }
          return step
        })

        // Start next pending step if current one completed
        const hasRunningStep = updatedWorkflow.some((s) => s.status === 'running')
        if (!hasRunningStep) {
          const pendingIdx = updatedWorkflow.findIndex((s) => s.status === 'pending')
          if (pendingIdx >= 0) {
            updatedWorkflow[pendingIdx] = { ...updatedWorkflow[pendingIdx], status: 'running' }
          }
        }

        // Calculate updated metrics
        const completedExperiments = updatedExperiments.filter((e) => e.status === 'completed').length
        const passedExperiments = updatedExperiments.filter((e) => e.results?.passed).length
        const successRate = completedExperiments > 0 ? Math.round((passedExperiments / completedExperiments) * 100) : campaign.metrics.successRate

        const updated: TrackedCampaign = {
          ...campaign,
          experiments: updatedExperiments,
          workflow: updatedWorkflow,
          metrics: {
            ...campaign.metrics,
            completedExperiments,
            successRate,
          },
          lastUpdate: new Date(),
          overallProgress: calculateProgress({
            ...campaign,
            metrics: { ...campaign.metrics, completedExperiments },
          }),
        }

        // Check if campaign is complete
        const allComplete = updatedWorkflow.every((s) => s.status === 'completed' || s.status === 'skipped')
        if (allComplete) {
          updated.status = 'completed'
          updated.completedAt = new Date().toISOString()
        }

        next.set(campaign.campaignId, updated)
        return next
      })
    }, 4000)

    return () => clearInterval(interval)
  }, [simulateUpdates, isRealTime, calculateProgress])

  // Filter campaigns based on options
  const filteredCampaignList = useMemo(() => {
    const list = Array.from(campaigns.values())

    if (activeOnly) {
      return list.filter((c) => c.status === 'running' || c.status === 'pending' || c.status === 'paused')
    }

    return list
  }, [campaigns, activeOnly])

  // Calculate aggregate statistics
  const stats = useMemo<CampaignStats>(() => {
    const list = filteredCampaignList
    const running = list.filter((c) => c.status === 'running')
    const pending = list.filter((c) => c.status === 'pending')
    const completed = list.filter((c) => c.status === 'completed')
    const failed = list.filter((c) => c.status === 'failed')

    const totalSuccessRate = list.reduce((sum, c) => sum + c.metrics.successRate, 0)
    const avgSuccessRate = list.length > 0 ? Math.round(totalSuccessRate / list.length) : 0

    const totalExperiments = list.reduce((sum, c) => sum + c.metrics.totalExperiments, 0)
    const completedExperiments = list.reduce((sum, c) => sum + c.metrics.completedExperiments, 0)

    return {
      total: list.length,
      running: running.length,
      pending: pending.length,
      completed: completed.length,
      failed: failed.length,
      avgSuccessRate,
      totalExperiments,
      completedExperiments,
    }
  }, [filteredCampaignList])

  // Get campaign by ID
  const getCampaign = useCallback(
    (id: string) => campaigns.get(id),
    [campaigns]
  )

  // Campaign control functions
  const sendCampaignCommand = useCallback(
    (campaignId: string, command: string): boolean => {
      if (!wsContext?.isConnected) {
        console.warn('WebSocket not connected, command not sent')
        return false
      }

      return wsContext.send(CAMPAIGN_COMMAND_TOPIC(campaignId), {
        command,
        timestamp: new Date().toISOString(),
      })
    },
    [wsContext]
  )

  const startCampaign = useCallback(
    (campaignId: string) => sendCampaignCommand(campaignId, 'start'),
    [sendCampaignCommand]
  )

  const pauseCampaign = useCallback(
    (campaignId: string) => sendCampaignCommand(campaignId, 'pause'),
    [sendCampaignCommand]
  )

  const resumeCampaign = useCallback(
    (campaignId: string) => sendCampaignCommand(campaignId, 'resume'),
    [sendCampaignCommand]
  )

  const cancelCampaign = useCallback(
    (campaignId: string) => sendCampaignCommand(campaignId, 'cancel'),
    [sendCampaignCommand]
  )

  return {
    campaigns,
    campaignList: filteredCampaignList,
    stats,
    getCampaign,
    connectionStatus,
    isConnected,
    isRealTime,
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    cancelCampaign,
  }
}

export default useCampaignStatus
