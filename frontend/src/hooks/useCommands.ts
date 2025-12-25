/**
 * useCommands - Hook for command execution management
 *
 * Features:
 * - Filters available commands based on selected agent types
 * - Disables commands based on agent status
 * - Sends commands via WebSocket
 * - Tracks pending command acknowledgments
 * - Provides command execution with optimistic updates
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useWebSocketContext } from '../contexts/WebSocketContext'
import type { ConnectionStatus } from '../contexts/WebSocketContext'
import {
  COMMANDS,
  getCommandsForAgentTypes,
  type CommandId,
  type CommandDefinition,
  type CommandPayload,
  type CommandAck,
} from '../config/commands'
import type { AgentType, AgentOperationalStatus } from './useAgentStatus'

// Agent interface for command evaluation
export interface CommandableAgent {
  id: string
  type: AgentType
  status: AgentOperationalStatus
  capabilities?: string[]
}

// Evaluated command with disabled state for specific agents
export interface EvaluatedCommand extends CommandDefinition {
  /** Whether command is disabled for current selection */
  disabled: boolean
  /** Reason why command is disabled */
  disabledReason?: string
  /** Number of agents this command applies to */
  applicableCount: number
  /** IDs of agents this command can be executed on */
  applicableAgentIds: string[]
}

// Pending command tracking
export interface PendingCommand {
  commandId: CommandId
  agentIds: string[]
  sentAt: Date
  acks: Map<string, CommandAck>
  status: 'pending' | 'partial' | 'completed' | 'failed'
}

export interface UseCommandsOptions {
  /** Selected agents to evaluate commands for */
  agents: CommandableAgent[]
  /** Callback when command is executed */
  onCommandExecuted?: (commandId: CommandId, agentIds: string[]) => void
  /** Callback when command receives acknowledgment */
  onCommandAck?: (ack: CommandAck) => void
  /** Timeout for command acknowledgment in ms (default: 10000) */
  ackTimeout?: number
}

export interface UseCommandsReturn {
  /** All commands with evaluated disabled state */
  commands: EvaluatedCommand[]
  /** Execute a command on selected agents */
  executeCommand: (commandId: CommandId, agentIds?: string[]) => boolean
  /** Currently pending commands */
  pendingCommands: PendingCommand[]
  /** Check if a command is currently pending */
  isCommandPending: (commandId: CommandId) => boolean
  /** Get command by ID */
  getCommand: (id: CommandId) => EvaluatedCommand | undefined
  /** WebSocket connection status */
  connectionStatus: ConnectionStatus
  /** Whether connected and can send commands */
  canSendCommands: boolean
}

// WebSocket topic for command acknowledgments
const COMMAND_ACK_TOPIC = 'adam/commands/ack'

/**
 * Hook for managing command execution
 */
export function useCommands(options: UseCommandsOptions): UseCommandsReturn {
  const {
    agents,
    onCommandExecuted,
    onCommandAck,
    ackTimeout = 10000,
  } = options

  const [pendingCommands, setPendingCommands] = useState<PendingCommand[]>([])

  // Try to get WebSocket context
  let wsContext: ReturnType<typeof useWebSocketContext> | null = null
  try {
    wsContext = useWebSocketContext()
  } catch {
    // WebSocket provider not available
  }

  const connectionStatus: ConnectionStatus = wsContext?.status ?? 'disconnected'
  const canSendCommands = connectionStatus === 'connected'

  // Get unique agent types from selection
  const agentTypes = useMemo(() => {
    const types = new Set<AgentType>()
    agents.forEach((agent) => types.add(agent.type))
    return Array.from(types)
  }, [agents])

  // Evaluate commands based on current selection
  const evaluatedCommands = useMemo((): EvaluatedCommand[] => {
    if (agents.length === 0) {
      // No selection - return all commands as disabled
      return COMMANDS.map((cmd) => ({
        ...cmd,
        disabled: true,
        disabledReason: 'No agents selected',
        applicableCount: 0,
        applicableAgentIds: [],
      }))
    }

    // Get commands applicable to selected agent types
    const applicableCommands = getCommandsForAgentTypes(agentTypes)

    return applicableCommands.map((cmd) => {
      // Find agents this command can be executed on
      const applicableAgents = agents.filter((agent) => {
        // Check if agent type is applicable
        if (!cmd.applicableTo.includes(agent.type)) return false

        // Check if command is disabled for this agent's status
        const capArray = agent.capabilities
          ? Object.entries(agent.capabilities)
              .filter(([, v]) => v)
              .map(([k]) => k)
          : []
        return !cmd.isDisabled(agent.status, capArray)
      })

      const applicableCount = applicableAgents.length
      const applicableAgentIds = applicableAgents.map((a) => a.id)

      // Determine disabled state and reason
      let disabled = applicableCount === 0
      let disabledReason: string | undefined

      if (disabled) {
        // Check why it's disabled
        const typeMatch = agents.some((a) => cmd.applicableTo.includes(a.type))
        if (!typeMatch) {
          disabledReason = `Not applicable to ${agentTypes.join(', ')}`
        } else {
          // All agents have status that disables this command
          const statuses = [...new Set(agents.map((a) => a.status))]
          disabledReason = `Cannot ${cmd.label.toLowerCase()} when ${statuses.join('/')}`
        }
      }

      return {
        ...cmd,
        disabled,
        disabledReason,
        applicableCount,
        applicableAgentIds,
      }
    })
  }, [agents, agentTypes])

  // Handle command acknowledgment
  const handleCommandAck = useCallback(
    (payload: unknown) => {
      const ack = payload as CommandAck

      setPendingCommands((prev) => {
        return prev.map((pending) => {
          if (pending.commandId !== ack.commandId) return pending
          if (!pending.agentIds.includes(ack.agentId)) return pending

          const newAcks = new Map(pending.acks)
          newAcks.set(ack.agentId, ack)

          // Determine overall status
          const allAcked = pending.agentIds.every((id) => newAcks.has(id))
          const anyFailed = Array.from(newAcks.values()).some(
            (a) => a.status === 'failed' || a.status === 'rejected'
          )

          let status: PendingCommand['status'] = 'pending'
          if (allAcked) {
            status = anyFailed ? 'failed' : 'completed'
          } else if (newAcks.size > 0) {
            status = 'partial'
          }

          return { ...pending, acks: newAcks, status }
        })
      })

      onCommandAck?.(ack)
    },
    [onCommandAck]
  )

  // Subscribe to command acknowledgments
  useEffect(() => {
    if (!wsContext) return

    const unsubscribe = wsContext.subscribe(COMMAND_ACK_TOPIC, handleCommandAck)
    return unsubscribe
  }, [wsContext, handleCommandAck])

  // Clean up completed/failed commands after a delay
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setPendingCommands((prev) =>
        prev.filter((cmd) => {
          // Remove completed/failed commands after 3 seconds
          if (cmd.status === 'completed' || cmd.status === 'failed') {
            return now - cmd.sentAt.getTime() < 3000
          }
          // Timeout pending commands
          if (now - cmd.sentAt.getTime() > ackTimeout) {
            return false
          }
          return true
        })
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [ackTimeout])

  // Execute a command
  const executeCommand = useCallback(
    (commandId: CommandId, agentIds?: string[]): boolean => {
      const cmd = evaluatedCommands.find((c) => c.id === commandId)
      if (!cmd || cmd.disabled) {
        console.warn(`Command ${commandId} is disabled or not found`)
        return false
      }

      // Use provided agent IDs or fall back to applicable agents
      const targetIds = agentIds ?? cmd.applicableAgentIds
      if (targetIds.length === 0) {
        console.warn(`No agents to execute command ${commandId} on`)
        return false
      }

      // Create command payload
      const payload: CommandPayload = {
        commandId,
        agentIds: targetIds,
        timestamp: new Date().toISOString(),
      }

      // Send via WebSocket
      if (wsContext?.isConnected) {
        const success = wsContext.send(cmd.wsTopic, payload)
        if (success) {
          // Track pending command
          setPendingCommands((prev) => [
            ...prev,
            {
              commandId,
              agentIds: targetIds,
              sentAt: new Date(),
              acks: new Map(),
              status: 'pending',
            },
          ])

          onCommandExecuted?.(commandId, targetIds)
          return true
        }
      } else {
        // Simulate command for demo (when not connected)
        console.log(`[DEMO] Executing command ${commandId} on agents:`, targetIds)

        // Add to pending with immediate "completion"
        setPendingCommands((prev) => [
          ...prev,
          {
            commandId,
            agentIds: targetIds,
            sentAt: new Date(),
            acks: new Map(
              targetIds.map((id) => [
                id,
                {
                  commandId,
                  agentId: id,
                  status: 'completed',
                  timestamp: new Date().toISOString(),
                },
              ])
            ),
            status: 'completed',
          },
        ])

        onCommandExecuted?.(commandId, targetIds)
        return true
      }

      return false
    },
    [evaluatedCommands, wsContext, onCommandExecuted]
  )

  // Check if command is pending
  const isCommandPending = useCallback(
    (commandId: CommandId): boolean => {
      return pendingCommands.some(
        (cmd) => cmd.commandId === commandId && cmd.status === 'pending'
      )
    },
    [pendingCommands]
  )

  // Get evaluated command by ID
  const getEvaluatedCommand = useCallback(
    (id: CommandId): EvaluatedCommand | undefined => {
      return evaluatedCommands.find((cmd) => cmd.id === id)
    },
    [evaluatedCommands]
  )

  return {
    commands: evaluatedCommands,
    executeCommand,
    pendingCommands,
    isCommandPending,
    getCommand: getEvaluatedCommand,
    connectionStatus,
    canSendCommands,
  }
}

export default useCommands
