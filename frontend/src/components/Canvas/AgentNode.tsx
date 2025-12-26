/**
 * AgentNode - Visual representation of an AI agent in the workflow canvas
 */

import { motion } from 'framer-motion'
import {
  ClipboardList,
  Palette,
  FlaskConical,
  Cog,
  BarChart3,
  MoreHorizontal,
  Clock,
  Zap,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import styles from './AgentNode.module.css'

export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed' | 'waiting'

export interface AgentNodeData {
  id: string
  type: 'planning' | 'design' | 'simulation' | 'controller' | 'analyzer'
  name: string
  status: AgentStatus
  duration?: number
  tokensUsed?: number
  messagesCount?: number
  details?: Record<string, string | number>
  position: { x: number; y: number }
}

interface AgentNodeProps {
  data: AgentNodeData
  isSelected?: boolean
  onClick?: () => void
}

const agentConfig = {
  planning: {
    icon: ClipboardList,
    color: 'var(--accent-primary)',
    label: 'Planning Agent',
  },
  design: {
    icon: Palette,
    color: 'var(--accent-purple)',
    label: 'Design Agent',
  },
  simulation: {
    icon: FlaskConical,
    color: 'var(--accent-secondary)',
    label: 'Simulation Agent',
  },
  controller: {
    icon: Cog,
    color: 'var(--accent-warning)',
    label: 'Controller Agent',
  },
  analyzer: {
    icon: BarChart3,
    color: 'var(--accent-gold)',
    label: 'Analyzer Agent',
  },
}

const statusConfig: Record<AgentStatus, { icon: typeof CheckCircle | null; pulse: boolean }> = {
  idle: { icon: null, pulse: false },
  running: { icon: Loader2, pulse: true },
  completed: { icon: CheckCircle, pulse: false },
  failed: { icon: AlertCircle, pulse: false },
  waiting: { icon: Clock, pulse: true },
}

export function AgentNode({ data, isSelected, onClick }: AgentNodeProps) {
  const config = agentConfig[data.type]
  const status = statusConfig[data.status]
  const Icon = config.icon
  const StatusIcon = status.icon

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`${styles.node} ${isSelected ? styles.selected : ''}`}
      style={{
        left: data.position.x,
        top: data.position.y,
        '--agent-color': config.color,
      } as React.CSSProperties}
      onClick={onClick}
    >
      <div className={`${styles.card} ${styles[data.status]}`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconWrapper}>
              <Icon size={16} />
            </div>
            <span className={styles.label}>{config.label}</span>
          </div>
          <div className={styles.headerRight}>
            {StatusIcon && (
              <StatusIcon
                size={16}
                className={`${styles.statusIcon} ${status.pulse ? styles.spinning : ''}`}
              />
            )}
            <button className={styles.menuBtn}>
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className={styles.statsRow}>
          <div className={styles.statLabel}>
            <Clock size={12} />
            <span>Duration</span>
          </div>
          <span className={styles.statValue}>
            {data.duration ? `${(data.duration / 1000).toFixed(1)}s` : '--'}
          </span>
        </div>

        {/* Details */}
        <div className={styles.details}>
          {data.details &&
            Object.entries(data.details).map(([key, value]) => (
              <div key={key} className={styles.detailRow}>
                <span className={styles.detailKey}>{key.replace(/_/g, ' ')}</span>
                <span className={styles.detailValue}>{value}</span>
              </div>
            ))}
          {!data.details && (
            <div className={styles.noDetails}>
              {data.status === 'idle'
                ? 'Waiting to start...'
                : data.status === 'running'
                ? 'Processing...'
                : data.status === 'waiting'
                ? 'Awaiting input...'
                : 'No details'}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className={styles.footer}>
          <div className={styles.footerStat}>
            <Zap size={12} />
            <span>{data.tokensUsed?.toLocaleString() || 0}</span>
          </div>
          <div className={styles.footerStat}>
            <MessageSquare size={12} />
            <span>{data.messagesCount || 0}</span>
          </div>
          <div className={`${styles.statusBadge} ${styles[data.status]}`}>
            {data.status}
          </div>
        </div>
      </div>

      {/* Connection Points */}
      <div className={`${styles.connectionPoint} ${styles.left}`} />
      <div className={`${styles.connectionPoint} ${styles.right}`} />
    </motion.div>
  )
}

export default AgentNode
