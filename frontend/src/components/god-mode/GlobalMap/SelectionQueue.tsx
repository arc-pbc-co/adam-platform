/**
 * SelectionQueue - Shows sites queued for ADAM onboarding
 */

import { X, Rocket, Printer, Building2, Loader2, Eye } from 'lucide-react'
import type { Site } from './types'
import { TIER_COLORS } from './types'
import styles from './SelectionQueue.module.css'

interface SelectionQueueProps {
  selectedSites: Site[]
  onRemoveSite: (id: string) => void
  onClearAll: () => void
  onOnboardSelected: () => void
  /** Whether onboarding is currently in progress */
  isOnboarding?: boolean
  /** Callback to view current onboarding progress */
  onViewProgress?: () => void
}

export function SelectionQueue({
  selectedSites,
  onRemoveSite,
  onClearAll,
  onOnboardSelected,
  isOnboarding = false,
  onViewProgress,
}: SelectionQueueProps) {
  const totalPrinters = selectedSites.reduce((sum, s) => sum + s.installations, 0)

  return (
    <div className={styles.queue}>
      {/* Header */}
      <div className={styles.header}>
        <h4>ONBOARDING QUEUE</h4>
        {selectedSites.length > 0 && !isOnboarding && (
          <button className={styles.clearBtn} onClick={onClearAll}>
            Clear All
          </button>
        )}
      </div>

      {/* Active onboarding indicator */}
      {isOnboarding && (
        <button
          className={styles.progressIndicator}
          onClick={onViewProgress}
        >
          <Loader2 size={14} className={styles.spinningIcon} />
          <span>Onboarding in Progress</span>
          <Eye size={14} />
        </button>
      )}

      {/* Summary stats */}
      <div className={styles.summary}>
        <div className={styles.summaryStat}>
          <Building2 size={14} className={styles.summaryIcon} />
          <span className={styles.summaryValue}>{selectedSites.length}</span>
          <span className={styles.summaryLabel}>Sites</span>
        </div>
        <div className={styles.summaryStat}>
          <Printer size={14} className={styles.summaryIcon} />
          <span className={styles.summaryValue}>{totalPrinters}</span>
          <span className={styles.summaryLabel}>Printers</span>
        </div>
      </div>

      {/* Queue list */}
      <div className={styles.list}>
        {selectedSites.length === 0 ? (
          <div className={styles.emptyState}>
            <span>No sites selected</span>
            <span className={styles.emptyHint}>
              Click sites on the map or use Shift+Click for multi-select
            </span>
          </div>
        ) : (
          selectedSites.map((site) => (
            <div key={site.id} className={styles.item}>
              <span
                className={styles.tierDot}
                style={{ backgroundColor: TIER_COLORS[site.priorityTier] }}
              />
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{site.name}</span>
                <span className={styles.itemMeta}>
                  {site.city}, {site.state} • {site.installations} printer
                  {site.installations !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                className={styles.removeBtn}
                onClick={() => onRemoveSite(site.id)}
                title="Remove from queue"
              >
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Onboard button */}
      {selectedSites.length > 0 && (
        <button
          className={styles.onboardBtn}
          onClick={onOnboardSelected}
          disabled={isOnboarding}
        >
          {isOnboarding ? (
            <>
              <Loader2 size={16} className={styles.spinningIcon} />
              <span>Onboarding...</span>
            </>
          ) : (
            <>
              <Rocket size={16} />
              <span>Start ADAM Onboarding</span>
              <span className={styles.onboardCount}>{selectedSites.length}</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}

export default SelectionQueue
