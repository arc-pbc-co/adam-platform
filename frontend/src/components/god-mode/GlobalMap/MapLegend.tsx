/**
 * MapLegend - Legend for the install base map
 */

import { TIER_COLORS } from './types'
import styles from './MapLegend.module.css'

export function MapLegend() {
  return (
    <div className={styles.legend}>
      <h4>LEGEND</h4>

      {/* Priority Tiers */}
      <div className={styles.section}>
        <h5>Priority Tier</h5>
        <div className={styles.items}>
          <div className={styles.item}>
            <span
              className={styles.marker}
              style={{ backgroundColor: TIER_COLORS.A }}
            />
            <span>Tier A - High Priority</span>
          </div>
          <div className={styles.item}>
            <span
              className={styles.marker}
              style={{ backgroundColor: TIER_COLORS.B }}
            />
            <span>Tier B - Medium Priority</span>
          </div>
          <div className={styles.item}>
            <span
              className={styles.marker}
              style={{ backgroundColor: TIER_COLORS.C }}
            />
            <span>Tier C - Standard</span>
          </div>
          <div className={styles.item}>
            <span
              className={`${styles.marker} ${styles.selected}`}
            />
            <span>Selected for Onboarding</span>
          </div>
        </div>
      </div>

      {/* Marker Size */}
      <div className={styles.section}>
        <h5>Marker Size</h5>
        <div className={styles.items}>
          <div className={styles.item}>
            <span className={`${styles.marker} ${styles.sizeSmall}`} />
            <span>1-2 Printers</span>
          </div>
          <div className={styles.item}>
            <span className={`${styles.marker} ${styles.sizeMedium}`} />
            <span>3-4 Printers</span>
          </div>
          <div className={styles.item}>
            <span className={`${styles.marker} ${styles.sizeLarge}`} />
            <span>5+ Printers</span>
          </div>
        </div>
      </div>

      {/* Product Lines */}
      <div className={styles.section}>
        <h5>Product Lines</h5>
        <div className={styles.items}>
          <div className={styles.item}>
            <span className={styles.icon}>🏭</span>
            <span>Shop System</span>
          </div>
          <div className={styles.item}>
            <span className={styles.icon}>🎨</span>
            <span>Studio System</span>
          </div>
          <div className={styles.item}>
            <span className={styles.icon}>🔬</span>
            <span>InnoventX</span>
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div className={styles.hint}>
        <h5>Controls</h5>
        <div className={styles.hintItems}>
          <span><kbd>Click</kbd> Select site</span>
          <span><kbd>Shift+Click</kbd> Multi-select</span>
          <span><kbd>Scroll</kbd> Zoom</span>
          <span><kbd>Drag</kbd> Pan</span>
        </div>
      </div>
    </div>
  )
}

export default MapLegend
