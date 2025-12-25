/**
 * StatusIndicator - Animated status dots for unit/agent states
 * SC2-style pulsing status indicators
 */

import clsx from 'clsx'
import './StatusIndicator.css'

export type Status = 'online' | 'offline' | 'working' | 'error' | 'idle'

interface StatusIndicatorProps {
  status: Status
  size?: 'sm' | 'md' | 'lg'
  label?: string
  pulse?: boolean
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  label,
  pulse = true,
}) => (
  <div className={clsx('status-indicator', `status-indicator--${size}`)}>
    <span
      className={clsx(
        'status-indicator__dot',
        `status-indicator__dot--${status}`,
        pulse && status !== 'offline' && 'status-indicator__dot--pulse'
      )}
    />
    {label && <span className="status-indicator__label">{label}</span>}
  </div>
)
