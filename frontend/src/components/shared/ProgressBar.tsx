/**
 * ProgressBar - Resource gauge style progress bar
 * SC2-style with glow and shimmer effects
 */

import clsx from 'clsx'
import './ProgressBar.css'

interface ProgressBarProps {
  value: number
  max: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
  showLabel?: boolean
  animate?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  variant = 'default',
  showLabel = false,
  animate = true,
  size = 'md',
}) => {
  const percent = Math.min(100, (value / max) * 100)

  return (
    <div className={clsx('progress-bar', `progress-bar--${size}`)}>
      <div className="progress-bar__track">
        <div
          className={clsx(
            'progress-bar__fill',
            `progress-bar__fill--${variant}`,
            animate && 'progress-bar__fill--animate'
          )}
          style={{ width: `${percent}%` }}
        />
        <div className="progress-bar__glow" style={{ width: `${percent}%` }} />
      </div>
      {showLabel && (
        <span className="progress-bar__label">
          {value.toLocaleString()} / {max.toLocaleString()}
        </span>
      )}
    </div>
  )
}
