/**
 * WebSocketContext - Centralized WebSocket connection management
 *
 * Provides a shared WebSocket connection to the ADAM gateway with:
 * - Automatic reconnection with exponential backoff
 * - Topic subscription management
 * - Connection state tracking
 * - Message sending capabilities
 *
 * Gateway URL: /api/ws (proxied to backend gateway)
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'

// Connection status
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

// WebSocket message types
export interface WSMessage<T = unknown> {
  topic: string
  payload: T
  timestamp: string
}

export interface WSSubscription {
  topic: string
  handler: (payload: unknown) => void
}

// Context value type
export interface WebSocketContextValue {
  /** Current connection status */
  status: ConnectionStatus
  /** Whether the connection is healthy */
  isConnected: boolean
  /** Last error that occurred */
  error: Error | null
  /** Time since last successful message */
  lastMessageTime: Date | null
  /** Reconnection attempt count */
  reconnectAttempts: number
  /** Subscribe to a topic */
  subscribe: (topic: string, handler: (payload: unknown) => void) => () => void
  /** Send a message to the server */
  send: (topic: string, payload: unknown) => boolean
  /** Force reconnect */
  reconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

// Provider props
interface WebSocketProviderProps {
  children: ReactNode
  /** Gateway URL (default: /api/ws) */
  url?: string
  /** Enable auto-reconnect (default: true) */
  autoReconnect?: boolean
  /** Initial reconnect delay in ms (default: 1000) */
  initialReconnectDelay?: number
  /** Maximum reconnect delay in ms (default: 30000) */
  maxReconnectDelay?: number
  /** Maximum reconnect attempts (default: 10, 0 for infinite) */
  maxReconnectAttempts?: number
  /** Ping interval in ms (default: 30000) */
  pingInterval?: number
}

/**
 * WebSocket Provider Component
 */
export function WebSocketProvider({
  children,
  url = '/ws',
  autoReconnect = true,
  initialReconnectDelay = 1000,
  maxReconnectDelay = 30000,
  maxReconnectAttempts = 10,
  pingInterval = 30000,
}: WebSocketProviderProps) {
  // Connection state
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [error, setError] = useState<Error | null>(null)
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  // Refs for mutable state
  const wsRef = useRef<WebSocket | null>(null)
  const subscriptionsRef = useRef<Map<string, Set<(payload: unknown) => void>>>(new Map())
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  // Calculate WebSocket URL
  const wsUrl = useMemo(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const baseUrl = url.startsWith('/') ? `${protocol}//${window.location.host}${url}` : url
    return baseUrl
  }, [url])

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
  }, [])

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (!autoReconnect || !mountedRef.current) return
    if (maxReconnectAttempts > 0 && reconnectAttempts >= maxReconnectAttempts) {
      setError(new Error(`Max reconnect attempts (${maxReconnectAttempts}) exceeded`))
      return
    }

    const delay = Math.min(
      initialReconnectDelay * Math.pow(2, reconnectAttempts),
      maxReconnectDelay
    )

    setStatus('reconnecting')
    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setReconnectAttempts((prev) => prev + 1)
        connect()
      }
    }, delay)
  }, [autoReconnect, reconnectAttempts, maxReconnectAttempts, initialReconnectDelay, maxReconnectDelay])

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WSMessage = JSON.parse(event.data)
      setLastMessageTime(new Date())

      // Handle pong response
      if (message.topic === 'pong') {
        return
      }

      // Route message to subscribers
      const { topic, payload } = message

      // Check for exact topic match
      const handlers = subscriptionsRef.current.get(topic)
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(payload)
          } catch (err) {
            console.error(`Error in subscription handler for topic "${topic}":`, err)
          }
        })
      }

      // Check for wildcard matches (e.g., adam/agents/+/status)
      subscriptionsRef.current.forEach((wildcardHandlers, pattern) => {
        if (pattern.includes('+')) {
          const regex = new RegExp('^' + pattern.replace(/\+/g, '[^/]+') + '$')
          if (regex.test(topic)) {
            wildcardHandlers.forEach((handler) => {
              try {
                handler(payload)
              } catch (err) {
                console.error(`Error in wildcard handler for pattern "${pattern}":`, err)
              }
            })
          }
        }
      })
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err)
    }
  }, [])

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    clearTimers()
    setStatus('connecting')
    setError(null)

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close()
          return
        }

        setStatus('connected')
        setReconnectAttempts(0)
        setError(null)

        // Send subscription requests for all current topics
        subscriptionsRef.current.forEach((_, topic) => {
          ws.send(JSON.stringify({ type: 'subscribe', topic }))
        })

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ topic: 'ping', payload: Date.now() }))
          }
        }, pingInterval)
      }

      ws.onmessage = handleMessage

      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        setError(new Error('WebSocket connection error'))
      }

      ws.onclose = (event) => {
        if (!mountedRef.current) return

        clearTimers()
        setStatus('disconnected')

        if (!event.wasClean) {
          scheduleReconnect()
        }
      }

      wsRef.current = ws
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create WebSocket'))
      scheduleReconnect()
    }
  }, [wsUrl, clearTimers, handleMessage, pingInterval, scheduleReconnect])

  // Subscribe to a topic
  const subscribe = useCallback(
    (topic: string, handler: (payload: unknown) => void): (() => void) => {
      // Add to subscriptions
      if (!subscriptionsRef.current.has(topic)) {
        subscriptionsRef.current.set(topic, new Set())

        // Send subscribe message if connected
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'subscribe', topic }))
        }
      }
      subscriptionsRef.current.get(topic)!.add(handler)

      // Return unsubscribe function
      return () => {
        const handlers = subscriptionsRef.current.get(topic)
        if (handlers) {
          handlers.delete(handler)
          if (handlers.size === 0) {
            subscriptionsRef.current.delete(topic)
            // Send unsubscribe message if connected
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'unsubscribe', topic }))
            }
          }
        }
      }
    },
    []
  )

  // Send a message
  const send = useCallback((topic: string, payload: unknown): boolean => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, message not sent')
      return false
    }

    try {
      wsRef.current.send(
        JSON.stringify({
          topic,
          payload,
          timestamp: new Date().toISOString(),
        })
      )
      return true
    } catch (err) {
      console.error('Failed to send WebSocket message:', err)
      return false
    }
  }, [])

  // Force reconnect
  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    setReconnectAttempts(0)
    connect()
  }, [connect])

  // Initial connection
  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      clearTimers()
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect, clearTimers])

  // Context value
  const value = useMemo<WebSocketContextValue>(
    () => ({
      status,
      isConnected: status === 'connected',
      error,
      lastMessageTime,
      reconnectAttempts,
      subscribe,
      send,
      reconnect,
    }),
    [status, error, lastMessageTime, reconnectAttempts, subscribe, send, reconnect]
  )

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>
}

/**
 * Hook to access WebSocket context
 */
export function useWebSocketContext(): WebSocketContextValue {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider')
  }
  return context
}

export default WebSocketContext
