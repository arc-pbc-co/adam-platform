/**
 * ResourceBar - SC2-style top resource/status bar
 *
 * Displays ADAM system metrics with progress bars that change color:
 * - Normal (<=70%): Green (--accent-secondary)
 * - Warning (>70%): Orange (--accent-warning)
 * - Critical (>90%): Red (--accent-danger)
 *
 * Metrics:
 * - Compute usage (percentage)
 * - Token usage (current/max with K suffix)
 * - Active jobs (count out of max concurrent)
 * - Agents online (connected printers)
 * - Experiments today (count toward daily target)
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Cpu,
  Coins,
  Activity,
  Printer,
  FlaskConical,
  Clock,
  Zap,
} from 'lucide-react'
import type { ResourceMetrics } from './GodModeLayout'
import { ConnectionStatus } from './ConnectionStatus'
import styles from './ResourceBar.module.css'

// ADAM-specific resource type
export interface AdamResource {
  id: string
  label: string
  icon: 'compute' | 'tokens' | 'jobs' | 'agents' | 'experiments'
  current: number
  max: number
  unit?: string
  formatValue?: (current: number, max: number) => string
}

export interface AdamResourceBarProps {
  resources: AdamResource[]
}

// Legacy props for backward compatibility
interface ResourceBarProps {
  metrics: ResourceMetrics
}

// Get status based on percentage thresholds
function getResourceStatus(
  current: number,
  max: number
): 'normal' | 'warning' | 'critical' {
  const percentage = max > 0 ? (current / max) * 100 : 0
  if (percentage > 90) return 'critical'
  if (percentage > 70) return 'warning'
  return 'normal'
}

// Get color based on status
function getStatusColor(status: 'normal' | 'warning' | 'critical'): string {
  switch (status) {
    case 'critical':
      return 'var(--accent-danger)'
    case 'warning':
      return 'var(--accent-warning)'
    default:
      return 'var(--accent-secondary)'
  }
}

// Get icon component by id
function getIcon(iconId: AdamResource['icon']) {
  switch (iconId) {
    case 'compute':
      return <Cpu size={16} />
    case 'tokens':
      return <Coins size={16} />
    case 'jobs':
      return <Activity size={16} />
    case 'agents':
      return <Printer size={16} />
    case 'experiments':
      return <FlaskConical size={16} />
    default:
      return <Activity size={16} />
  }
}

// Format number with K suffix for thousands
function formatWithK(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toString()
}

// Default value formatter
function defaultFormatter(current: number, max: number): string {
  return `${current}/${max}`
}

/**
 * AdamResourceBar - New ADAM-specific resource bar with progress gauges
 */
export function AdamResourceBar({ resources }: AdamResourceBarProps) {
  // Proper clock state with interval - prevents jitter from inline Date rendering
  const [currentTime, setCurrentTime] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className={styles.bar}
      data-augmented-ui="bl-clip br-clip border"
    >
      {/* Left Section: Logo/Title */}
      <div className={styles.logoSection}>
        <Zap className={styles.logoIcon} />
        <span className={styles.logoText}>ADAM</span>
        <span className={styles.logoSubtext}>GOD MODE</span>
      </div>

      {/* Center Section: Resource Gauges */}
      <div className={styles.resourcesSection}>
        {resources.map((resource, index) => {
          const status = getResourceStatus(resource.current, resource.max)
          const color = getStatusColor(status)
          const percentage =
            resource.max > 0 ? (resource.current / resource.max) * 100 : 0
          const formatter = resource.formatValue || defaultFormatter
          const displayValue = formatter(resource.current, resource.max)

          return (
            <ResourceGauge
              key={resource.id}
              icon={getIcon(resource.icon)}
              label={resource.label}
              value={displayValue}
              unit={resource.unit}
              percentage={percentage}
              status={status}
              color={color}
              showDivider={index < resources.length - 1}
            />
          )
        })}
      </div>

      {/* Right Section: Connection Status + Time */}
      <div className={styles.rightSection}>
        <ConnectionStatus showLabel={true} />
        <div className={styles.divider} />
        <div className={styles.timeSection}>
          <Clock size={14} className={styles.clockIcon} />
          <span className={styles.time}>
            {currentTime.toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  )
}

interface ResourceGaugeProps {
  icon: React.ReactNode
  label: string
  value: string
  unit?: string
  percentage: number
  status: 'normal' | 'warning' | 'critical'
  color: string
  showDivider?: boolean
}

function ResourceGauge({
  icon,
  label,
  value,
  unit,
  percentage,
  status,
  color,
  showDivider,
}: ResourceGaugeProps) {
  return (
    <>
      <motion.div
        className={`${styles.gauge} ${styles[`gauge--${status}`]}`}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.1 }}
      >
        <span className={styles.gaugeIcon} style={{ color }}>
          {icon}
        </span>
        <div className={styles.gaugeContent}>
          <span className={styles.gaugeLabel}>{label}</span>
          <div className={styles.gaugeValueRow}>
            <span className={styles.gaugeValue} style={{ color }}>
              {value}
            </span>
            {unit && <span className={styles.gaugeUnit}>{unit}</span>}
          </div>
          <div className={styles.gaugeBar}>
            <motion.div
              className={styles.gaugeBarFill}
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentage, 100)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      </motion.div>
      {showDivider && <div className={styles.divider} />}
    </>
  )
}

/**
 * ResourceBar - Legacy component for backward compatibility
 * Wraps metrics in the new AdamResource format
 */
export function ResourceBar({ metrics }: ResourceBarProps) {
  // Convert legacy metrics to AdamResource format
  const resources: AdamResource[] = [
    {
      id: 'labs',
      label: 'Labs',
      icon: 'experiments',
      current: metrics.activeLabs,
      max: metrics.totalLabs,
    },
    {
      id: 'running',
      label: 'Running',
      icon: 'jobs',
      current: metrics.runningExperiments,
      max: 50, // Default max
    },
    {
      id: 'queued',
      label: 'Queued',
      icon: 'jobs',
      current: metrics.queuedTasks,
      max: 100, // Default max
    },
    {
      id: 'load',
      label: 'Load',
      icon: 'compute',
      current: metrics.systemLoad,
      max: 100,
      formatValue: (current) => `${current}%`,
    },
  ]

  return <AdamResourceBar resources={resources} />
}

/**
 * Default ADAM resources configuration
 * Use this with useAdamResources hook
 */
export const DEFAULT_ADAM_RESOURCES: AdamResource[] = [
  {
    id: 'compute',
    label: 'Compute',
    icon: 'compute',
    current: 0,
    max: 100,
    formatValue: (current) => `${current}%`,
  },
  {
    id: 'tokens',
    label: 'Tokens',
    icon: 'tokens',
    current: 0,
    max: 100000,
    formatValue: (current, max) => `${formatWithK(current)}/${formatWithK(max)}`,
  },
  {
    id: 'jobs',
    label: 'Active Jobs',
    icon: 'jobs',
    current: 0,
    max: 50,
  },
  {
    id: 'agents',
    label: 'Agents',
    icon: 'agents',
    current: 0,
    max: 20,
  },
  {
    id: 'experiments',
    label: 'Experiments',
    icon: 'experiments',
    current: 0,
    max: 200,
    formatValue: (current, max) => `${current}/${max}`,
    unit: 'today',
  },
]

export default ResourceBar
