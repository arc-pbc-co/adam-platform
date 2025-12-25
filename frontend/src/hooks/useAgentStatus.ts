/**
 * useAgentStatus - Hook for real-time agent/printer status updates
 *
 * Features:
 * - WebSocket subscription for agent status (topic: adam/agents/+/status)
 * - Tracks status for all connected agents
 * - Supports filtering by agent type
 * - Provides aggregate statistics
 *
 * Topic pattern: adam/agents/{agentId}/status
 * Wildcard subscription: adam/agents/+/status
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useWebSocketContext } from '../contexts/WebSocketContext'
import type { ConnectionStatus } from '../contexts/WebSocketContext'

// Agent status types
export type AgentType = 'printer' | 'orchestrator' | 'analyzer' | 'worker' | 'campaign'
export type AgentOperationalStatus = 'idle' | 'working' | 'error' | 'offline' | 'calibrating'

// Agent status payload from WebSocket
export interface AgentStatusPayload {
  agentId: string
  type: AgentType
  name: string
  status: AgentOperationalStatus
  health: number // 0-100
  currentTask?: {
    id: string
    name: string
    progress: number
  }
  metrics?: {
    temperature?: number
    humidity?: number
    uptime?: number
    errorCount?: number
  }
  lastSeen: string
}

// Tracked agent with additional client metadata
export interface TrackedAgent extends AgentStatusPayload {
  lastUpdate: Date
  isStale: boolean
}

export interface UseAgentStatusOptions {
  /** Filter by agent type (default: all) */
  typeFilter?: AgentType | AgentType[]
  /** Timeout in ms before marking agent as stale (default: 30000) */
  staleTimeout?: number
  /** Enable WebSocket subscription (default: true) */
  useWebSocket?: boolean
  /** Enable simulated updates for demo (default: true) */
  simulateUpdates?: boolean
}

export interface AgentStats {
  total: number
  online: number
  working: number
  idle: number
  error: number
  offline: number
  avgHealth: number
}

export interface UseAgentStatusReturn {
  /** Map of agent ID to agent status */
  agents: Map<string, TrackedAgent>
  /** Array of all tracked agents */
  agentList: TrackedAgent[]
  /** Aggregate statistics */
  stats: AgentStats
  /** Get agent by ID */
  getAgent: (id: string) => TrackedAgent | undefined
  /** WebSocket connection status */
  connectionStatus: ConnectionStatus
  /** Whether connected */
  isConnected: boolean
  /** Whether receiving real-time updates */
  isRealTime: boolean
  /** Send a command to an agent */
  sendCommand: (agentId: string, command: string, payload?: unknown) => boolean
}

// WebSocket topic patterns
const AGENT_STATUS_TOPIC = 'adam/agents/+/status'
const AGENT_COMMAND_TOPIC = (agentId: string) => `adam/agents/${agentId}/command`

/**
 * Hook for tracking real-time agent status
 */
export function useAgentStatus(
  options: UseAgentStatusOptions = {}
): UseAgentStatusReturn {
  const {
    typeFilter,
    staleTimeout = 30000,
    useWebSocket: enableWebSocket = true,
    simulateUpdates = true,
  } = options

  const [agents, setAgents] = useState<Map<string, TrackedAgent>>(new Map())
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

  // Handle incoming agent status updates
  const handleStatusUpdate = useCallback((payload: unknown) => {
    const status = payload as AgentStatusPayload

    setAgents((prev) => {
      const next = new Map(prev)
      next.set(status.agentId, {
        ...status,
        lastUpdate: new Date(),
        isStale: false,
      })
      return next
    })
    setIsRealTime(true)
  }, [])

  // Subscribe to agent status topic
  useEffect(() => {
    if (!wsContext || !enableWebSocket) return

    const unsubscribe = wsContext.subscribe(AGENT_STATUS_TOPIC, handleStatusUpdate)

    return unsubscribe
  }, [wsContext, enableWebSocket, handleStatusUpdate])

  // Update real-time status based on connection
  useEffect(() => {
    if (connectionStatus !== 'connected') {
      setIsRealTime(false)
    }
  }, [connectionStatus])

  // Mark stale agents periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setAgents((prev) => {
        let changed = false
        const next = new Map(prev)

        next.forEach((agent, id) => {
          const age = now - agent.lastUpdate.getTime()
          if (age > staleTimeout && !agent.isStale) {
            next.set(id, { ...agent, isStale: true })
            changed = true
          }
        })

        return changed ? next : prev
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [staleTimeout])

  // Simulate agent updates for demo (only when not receiving real-time data)
  useEffect(() => {
    if (!simulateUpdates || isRealTime) return

    // Initialize with mock agents
    const mockAgents: AgentStatusPayload[] = [
      {
        agentId: 'printer-x25-001',
        type: 'printer',
        name: 'X25 Pro #1',
        status: 'working',
        health: 92,
        currentTask: { id: 'job-001', name: 'Part_A7_Rev3', progress: 45 },
        metrics: { temperature: 24, humidity: 42, uptime: 168, errorCount: 0 },
        lastSeen: new Date().toISOString(),
      },
      {
        agentId: 'printer-shop-001',
        type: 'printer',
        name: 'Shop System #1',
        status: 'idle',
        health: 98,
        metrics: { temperature: 22, humidity: 45, uptime: 720, errorCount: 1 },
        lastSeen: new Date().toISOString(),
      },
      {
        agentId: 'printer-studio-001',
        type: 'printer',
        name: 'Studio System #1',
        status: 'working',
        health: 87,
        currentTask: { id: 'job-002', name: 'Bracket_B12', progress: 78 },
        metrics: { temperature: 26, humidity: 48, uptime: 96, errorCount: 2 },
        lastSeen: new Date().toISOString(),
      },
      {
        agentId: 'printer-innovent-001',
        type: 'printer',
        name: 'InnoventX #1',
        status: 'calibrating',
        health: 95,
        metrics: { temperature: 23, humidity: 44, uptime: 48, errorCount: 0 },
        lastSeen: new Date().toISOString(),
      },
      {
        agentId: 'orchestrator-nova',
        type: 'orchestrator',
        name: 'Nova AI',
        status: 'working',
        health: 100,
        currentTask: { id: 'analysis-001', name: 'Parameter Optimization', progress: 33 },
        lastSeen: new Date().toISOString(),
      },
    ]

    // Set initial mock agents
    setAgents((prev) => {
      if (prev.size === 0) {
        const next = new Map<string, TrackedAgent>()
        mockAgents.forEach((agent) => {
          next.set(agent.agentId, {
            ...agent,
            lastUpdate: new Date(),
            isStale: false,
          })
        })
        return next
      }
      return prev
    })

    // Simulate periodic updates
    const interval = setInterval(() => {
      setAgents((prev) => {
        const next = new Map(prev)
        const agentIds = Array.from(prev.keys())
        if (agentIds.length === 0) return prev

        // Update a random agent
        const randomId = agentIds[Math.floor(Math.random() * agentIds.length)]
        const agent = prev.get(randomId)
        if (!agent) return prev

        // Random health fluctuation
        const newHealth = Math.max(60, Math.min(100, agent.health + (Math.random() - 0.5) * 5))

        // Random progress update for working agents
        let newTask = agent.currentTask
        if (newTask && agent.status === 'working') {
          const newProgress = Math.min(100, newTask.progress + Math.random() * 5)
          if (newProgress >= 100) {
            newTask = undefined
          } else {
            newTask = { ...newTask, progress: Math.round(newProgress) }
          }
        }

        next.set(randomId, {
          ...agent,
          health: Math.round(newHealth),
          currentTask: newTask,
          lastUpdate: new Date(),
          isStale: false,
        })

        return next
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [simulateUpdates, isRealTime])

  // Filter agents by type
  const filteredAgentList = useMemo(() => {
    const list = Array.from(agents.values())

    if (!typeFilter) return list

    const types = Array.isArray(typeFilter) ? typeFilter : [typeFilter]
    return list.filter((agent) => types.includes(agent.type))
  }, [agents, typeFilter])

  // Calculate aggregate statistics
  const stats = useMemo<AgentStats>(() => {
    const list = filteredAgentList
    const online = list.filter((a) => a.status !== 'offline' && !a.isStale)
    const working = list.filter((a) => a.status === 'working')
    const idle = list.filter((a) => a.status === 'idle')
    const error = list.filter((a) => a.status === 'error')
    const offline = list.filter((a) => a.status === 'offline' || a.isStale)

    const totalHealth = online.reduce((sum, a) => sum + a.health, 0)
    const avgHealth = online.length > 0 ? Math.round(totalHealth / online.length) : 0

    return {
      total: list.length,
      online: online.length,
      working: working.length,
      idle: idle.length,
      error: error.length,
      offline: offline.length,
      avgHealth,
    }
  }, [filteredAgentList])

  // Get agent by ID
  const getAgent = useCallback(
    (id: string) => agents.get(id),
    [agents]
  )

  // Send command to agent
  const sendCommand = useCallback(
    (agentId: string, command: string, payload?: unknown): boolean => {
      if (!wsContext?.isConnected) {
        console.warn('WebSocket not connected, command not sent')
        return false
      }

      return wsContext.send(AGENT_COMMAND_TOPIC(agentId), {
        command,
        payload,
        timestamp: new Date().toISOString(),
      })
    },
    [wsContext]
  )

  return {
    agents,
    agentList: filteredAgentList,
    stats,
    getAgent,
    connectionStatus,
    isConnected,
    isRealTime,
    sendCommand,
  }
}

export default useAgentStatus
