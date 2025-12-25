/**
 * LoadingSpinner - Sci-fi styled loading indicator
 *
 * Features:
 * - Rotating hexagonal segments
 * - Pulsing glow effect
 * - Multiple size variants
 * - Optional loading message
 */

import styles from './LoadingSpinner.module.css'

interface LoadingSpinnerProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Optional loading message */
  message?: string
  /** Whether to show full-screen overlay */
  fullscreen?: boolean
  /** Custom class name */
  className?: string
}

export function LoadingSpinner({
  size = 'md',
  message,
  fullscreen = false,
  className = '',
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={`${styles.container} ${styles[size]} ${className}`}>
      <div className={styles.spinner}>
        {/* Outer ring */}
        <div className={styles.ring}>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={styles.segment}
              style={{ '--segment-index': i } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Inner rotating element */}
        <div className={styles.core}>
          <div className={styles.coreInner} />
        </div>

        {/* Orbiting dots */}
        <div className={styles.orbit}>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={styles.orbitDot}
              style={{ '--orbit-index': i } as React.CSSProperties}
            />
          ))}
        </div>
      </div>

      {message && <div className={styles.message}>{message}</div>}
    </div>
  )

  if (fullscreen) {
    return <div className={styles.fullscreen}>{spinner}</div>
  }

  return spinner
}

export default LoadingSpinner
