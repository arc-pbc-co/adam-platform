/**
 * Minimap - SC2-style tactical minimap showing lab locations
 *
 * Shows a simplified overview of all labs/controllers with:
 * - Dots for each entity
 * - Color-coded by status
 * - Clickable for selection
 * - View rectangle showing current viewport
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { SelectedEntity } from './GodModeLayout'
import styles from './Minimap.module.css'

interface MinimapProps {
  selectedEntity: SelectedEntity | null
  onEntitySelect: (entity: SelectedEntity | null) => void
}

// Mock lab locations (in a real app, this would come from the backend)
const MOCK_LABS = [
  { id: 'lab-01', name: 'Lab Alpha', x: 25, y: 30, status: 'online' as const },
  { id: 'lab-02', name: 'Lab Beta', x: 60, y: 25, status: 'online' as const },
  { id: 'lab-03', name: 'Lab Gamma', x: 45, y: 55, status: 'running' as const },
  { id: 'lab-04', name: 'Lab Delta', x: 75, y: 60, status: 'offline' as const },
  { id: 'lab-05', name: 'Lab Epsilon', x: 30, y: 75, status: 'idle' as const },
]

export function Minimap({ selectedEntity, onEntitySelect }: MinimapProps) {
  const labs = useMemo(() => MOCK_LABS, [])

  return (
    <div className={styles.minimap} data-augmented-ui="tl-clip br-clip border">
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>TACTICAL</span>
      </div>

      {/* Map Area */}
      <div className={styles.mapArea}>
        {/* Grid overlay */}
        <div className={styles.grid} />

        {/* Lab markers */}
        {labs.map((lab) => (
          <motion.button
            key={lab.id}
            className={`${styles.marker} ${styles[lab.status]} ${
              selectedEntity?.id === lab.id ? styles.selected : ''
            }`}
            style={{
              left: `${lab.x}%`,
              top: `${lab.y}%`,
            }}
            onClick={() =>
              onEntitySelect({
                id: lab.id,
                type: 'lab',
                name: lab.name,
                status: lab.status,
              })
            }
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.9 }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            {/* Pulse ring for active labs */}
            {(lab.status === 'online' || lab.status === 'running') && (
              <span className={styles.pulse} />
            )}
          </motion.button>
        ))}

        {/* Viewport rectangle (would show current view in full map) */}
        <div className={styles.viewport} />
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.online}`} />
          <span>Online</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.running}`} />
          <span>Active</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.offline}`} />
          <span>Offline</span>
        </div>
      </div>
    </div>
  )
}

export default Minimap
