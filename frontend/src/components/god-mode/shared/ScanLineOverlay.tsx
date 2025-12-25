/**
 * ScanLineOverlay - Animated scan line effect for sci-fi aesthetic
 *
 * Creates a subtle horizontal scan line that moves down the screen,
 * similar to old CRT monitors or sci-fi interfaces.
 */

import styles from './ScanLineOverlay.module.css'

interface ScanLineOverlayProps {
  /** Opacity of the scan line (0-1, default 0.03) */
  opacity?: number
  /** Animation duration in seconds (default 4) */
  duration?: number
}

export function ScanLineOverlay({
  opacity = 0.03,
  duration = 4,
}: ScanLineOverlayProps) {
  return (
    <div
      className={styles.overlay}
      style={
        {
          '--scan-opacity': opacity,
          '--scan-duration': `${duration}s`,
        } as React.CSSProperties
      }
    >
      <div className={styles.scanLine} />
      <div className={styles.noise} />
    </div>
  )
}

export default ScanLineOverlay
