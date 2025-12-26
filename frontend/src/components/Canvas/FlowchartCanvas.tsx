/**
 * FlowchartCanvas - Agent workflow visualization canvas
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AgentNode, type AgentNodeData, type AgentStatus } from './AgentNode'
import {
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3X3,
} from 'lucide-react'
import styles from './FlowchartCanvas.module.css'

interface Connection {
  from: string
  to: string
  status: 'idle' | 'active' | 'completed'
}

interface FlowchartCanvasProps {
  experimentId?: string
  onNodeSelect?: (node: AgentNodeData | null) => void
}

// Demo agent nodes positioned in a flow
const createDemoNodes = (): AgentNodeData[] => [
  {
    id: 'start',
    type: 'planning',
    name: 'Planning Agent',
    status: 'completed',
    duration: 21340,
    tokensUsed: 1823,
    messagesCount: 4,
    details: {
      risk_level: 'R1',
      approval: 'Auto-approved',
      experiments: 3,
    },
    position: { x: 80, y: 120 },
  },
  {
    id: 'design',
    type: 'design',
    name: 'Design Agent',
    status: 'completed',
    duration: 15670,
    tokensUsed: 2105,
    messagesCount: 6,
    details: {
      runs_designed: 12,
      parameters: 8,
      materials: 3,
    },
    position: { x: 420, y: 60 },
  },
  {
    id: 'simulation',
    type: 'simulation',
    name: 'Simulation Agent',
    status: 'running',
    duration: 8450,
    tokensUsed: 1245,
    messagesCount: 3,
    details: {
      simulations: '8/12',
      confidence: '87%',
      model: 'Live Sinter\u2122',
    },
    position: { x: 420, y: 320 },
  },
  {
    id: 'controller',
    type: 'controller',
    name: 'Controller Agent',
    status: 'waiting',
    tokensUsed: 0,
    messagesCount: 0,
    position: { x: 760, y: 180 },
  },
  {
    id: 'analyzer',
    type: 'analyzer',
    name: 'Analyzer Agent',
    status: 'idle',
    tokensUsed: 0,
    messagesCount: 0,
    position: { x: 1100, y: 180 },
  },
]

const createConnections = (): Connection[] => [
  { from: 'start', to: 'design', status: 'completed' },
  { from: 'start', to: 'simulation', status: 'completed' },
  { from: 'design', to: 'controller', status: 'active' },
  { from: 'simulation', to: 'controller', status: 'active' },
  { from: 'controller', to: 'analyzer', status: 'idle' },
]

export function FlowchartCanvas({ experimentId, onNodeSelect }: FlowchartCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [nodes, setNodes] = useState<AgentNodeData[]>(createDemoNodes)
  const [connections] = useState<Connection[]>(createConnections)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [showGrid, setShowGrid] = useState(true)

  // Simulate workflow progress
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setNodes((prev) => {
        const newNodes = [...prev]
        const simNode = newNodes.find((n) => n.id === 'simulation')
        if (simNode && simNode.status === 'running') {
          simNode.duration = (simNode.duration || 0) + 100
          simNode.tokensUsed = (simNode.tokensUsed || 0) + Math.floor(Math.random() * 10)
        }
        return newNodes
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isPlaying])

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedNode(nodeId === selectedNode ? null : nodeId)
      const node = nodes.find((n) => n.id === nodeId)
      onNodeSelect?.(node || null)
    },
    [selectedNode, nodes, onNodeSelect]
  )

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 2))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.5))
  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Calculate connection path
  const getConnectionPath = (fromId: string, toId: string) => {
    const fromNode = nodes.find((n) => n.id === fromId)
    const toNode = nodes.find((n) => n.id === toId)
    if (!fromNode || !toNode) return ''

    const fromX = fromNode.position.x + 280 + 8
    const fromY = fromNode.position.y + 80
    const toX = toNode.position.x - 8
    const toY = toNode.position.y + 80

    const midX = (fromX + toX) / 2

    return `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`
  }

  return (
    <div className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <button
            className={`${styles.toolbarBtn} ${isPlaying ? styles.active : ''}`}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button className={styles.toolbarBtn} onClick={handleReset}>
            <RotateCcw size={16} />
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.toolbarGroup}>
          <button className={styles.toolbarBtn} onClick={handleZoomOut}>
            <ZoomOut size={16} />
          </button>
          <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
          <button className={styles.toolbarBtn} onClick={handleZoomIn}>
            <ZoomIn size={16} />
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.toolbarGroup}>
          <button
            className={`${styles.toolbarBtn} ${showGrid ? styles.active : ''}`}
            onClick={() => setShowGrid(!showGrid)}
          >
            <Grid3X3 size={16} />
          </button>
          <button className={styles.toolbarBtn} onClick={handleReset}>
            <Maximize2 size={16} />
          </button>
        </div>

        <div className={styles.experimentInfo}>
          <span className={styles.experimentLabel}>Experiment</span>
          <span className={styles.experimentId}>{experimentId || 'EXP-2024-1251'}</span>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={`${styles.canvas} ${showGrid ? styles.withGrid : ''}`}
        onMouseDown={(e) => {
          if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
            setIsPanning(true)
          }
        }}
        onMouseUp={() => setIsPanning(false)}
        onMouseLeave={() => setIsPanning(false)}
        onMouseMove={(e) => {
          if (isPanning) {
            setPan((p) => ({
              x: p.x + e.movementX,
              y: p.y + e.movementY,
            }))
          }
        }}
      >
        <div
          className={styles.canvasContent}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* Connection lines */}
          <svg className={styles.connections}>
            <defs>
              <marker
                id="arrowhead-idle"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--border-subtle)" />
              </marker>
              <marker
                id="arrowhead-active"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--accent-primary)" />
              </marker>
              <marker
                id="arrowhead-completed"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--accent-secondary)" />
              </marker>
            </defs>
            {connections.map((conn) => (
              <motion.path
                key={`${conn.from}-${conn.to}`}
                d={getConnectionPath(conn.from, conn.to)}
                className={`${styles.connectionPath} ${styles[conn.status]}`}
                markerEnd={`url(#arrowhead-${conn.status})`}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5 }}
              />
            ))}
          </svg>

          {/* Agent nodes */}
          {nodes.map((node) => (
            <AgentNode
              key={node.id}
              data={node}
              isSelected={selectedNode === node.id}
              onClick={() => handleNodeClick(node.id)}
            />
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className={styles.statusBar}>
        <span className={styles.statusItem}>
          <span className={styles.statusDot} data-status="completed" />
          2 Completed
        </span>
        <span className={styles.statusItem}>
          <span className={styles.statusDot} data-status="running" />
          1 Running
        </span>
        <span className={styles.statusItem}>
          <span className={styles.statusDot} data-status="waiting" />
          1 Waiting
        </span>
        <span className={styles.statusItem}>
          <span className={styles.statusDot} data-status="idle" />
          1 Idle
        </span>
      </div>
    </div>
  )
}

export default FlowchartCanvas
