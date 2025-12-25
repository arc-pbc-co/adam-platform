/**
 * useWebSocket - Hook for subscribing to WebSocket topics
 *
 * Provides convenient access to the WebSocket context with:
 * - Topic subscription management
 * - Automatic cleanup on unmount
 * - Type-safe message handling
 * - Connection status access
 */

import { useEffect, useCallback, useState, useRef } from 'react'
import { useWebSocketContext } from '../contexts/WebSocketContext'
import type { ConnectionStatus } from '../contexts/WebSocketContext'

export interface UseWebSocketOptions<T> {
  /** Topic to subscribe to */
  topic: string
  /** Handler for incoming messages */
  onMessage?: (payload: T) => void
  /** Whether to enable subscription (default: true) */
  enabled?: boolean
}

export interface UseWebSocketReturn<T> {
  /** Last received message payload */
  lastMessage: T | null
  /** Send a message to a topic */
  send: (topic: string, payload: unknown) => boolean
  /** Connection status */
  status: ConnectionStatus
  /** Whether connected */
  isConnected: boolean
  /** Connection error if any */
  error: Error | null
}

/**
 * Hook for subscribing to a single WebSocket topic
 */
export function useWebSocket<T = unknown>(
  options: UseWebSocketOptions<T>
): UseWebSocketReturn<T> {
  const { topic, onMessage, enabled = true } = options
  const { subscribe, send, status, isConnected, error } = useWebSocketContext()
  const [lastMessage, setLastMessage] = useState<T | null>(null)
  const onMessageRef = useRef(onMessage)

  // Keep onMessage ref updated
  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  // Subscribe to topic
  useEffect(() => {
    if (!enabled) return

    const handler = (payload: unknown) => {
      const typedPayload = payload as T
      setLastMessage(typedPayload)
      onMessageRef.current?.(typedPayload)
    }

    const unsubscribe = subscribe(topic, handler)
    return unsubscribe
  }, [topic, enabled, subscribe])

  return {
    lastMessage,
    send,
    status,
    isConnected,
    error,
  }
}

/**
 * Hook for subscribing to multiple WebSocket topics
 */
export interface UseMultiWebSocketOptions {
  /** Topics to subscribe to with their handlers */
  subscriptions: Array<{
    topic: string
    handler: (payload: unknown) => void
  }>
  /** Whether to enable subscriptions (default: true) */
  enabled?: boolean
}

export function useMultiWebSocket(options: UseMultiWebSocketOptions) {
  const { subscriptions, enabled = true } = options
  const { subscribe, send, status, isConnected, error } = useWebSocketContext()

  // Subscribe to all topics
  useEffect(() => {
    if (!enabled) return

    const unsubscribes = subscriptions.map(({ topic, handler }) =>
      subscribe(topic, handler)
    )

    return () => {
      unsubscribes.forEach((unsub) => unsub())
    }
  }, [subscriptions, enabled, subscribe])

  return {
    send,
    status,
    isConnected,
    error,
  }
}

/**
 * Hook for sending commands via WebSocket
 */
export function useWebSocketCommand() {
  const { send, isConnected, status } = useWebSocketContext()

  const sendCommand = useCallback(
    (
      topic: string,
      payload: unknown
    ): { success: boolean; error?: string } => {
      if (!isConnected) {
        return { success: false, error: 'WebSocket not connected' }
      }

      const success = send(topic, payload)
      return { success }
    },
    [send, isConnected]
  )

  return {
    sendCommand,
    isConnected,
    status,
  }
}

export default useWebSocket
