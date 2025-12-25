/**
 * MapFilters - Filter panel for install base map
 */

import { Search } from 'lucide-react'
import type { MapFilters as MapFiltersType } from './types'
import { PRODUCT_LINES, TIER_COLORS } from './types'
import styles from './MapFilters.module.css'

interface MapFiltersProps {
  filters: MapFiltersType
  onFiltersChange: (filters: MapFiltersType) => void
  availableStates: string[]
}

export function MapFilters({ filters, onFiltersChange, availableStates: _availableStates }: MapFiltersProps) {
  // Note: availableStates can be used for a state dropdown filter in future
  const toggleProductLine = (line: string) => {
    const current = filters.productLines
    const next = current.includes(line)
      ? current.filter((l) => l !== line)
      : [...current, line]
    onFiltersChange({ ...filters, productLines: next })
  }

  const toggleTier = (tier: string) => {
    const current = filters.priorityTiers
    const next = current.includes(tier)
      ? current.filter((t) => t !== tier)
      : [...current, tier]
    onFiltersChange({ ...filters, priorityTiers: next })
  }

  const setSearchQuery = (query: string) => {
    onFiltersChange({ ...filters, searchQuery: query })
  }

  const setMinInstallations = (min: number) => {
    onFiltersChange({ ...filters, minInstallations: min })
  }

  const clearAllFilters = () => {
    onFiltersChange({
      productLines: [],
      priorityTiers: [],
      states: [],
      minInstallations: 0,
      searchQuery: '',
    })
  }

  const hasActiveFilters =
    filters.productLines.length > 0 ||
    filters.priorityTiers.length > 0 ||
    filters.minInstallations > 0 ||
    filters.searchQuery !== ''

  return (
    <div className={styles.filters}>
      <div className={styles.header}>
        <h4>FILTERS</h4>
        {hasActiveFilters && (
          <button className={styles.clearBtn} onClick={clearAllFilters}>
            Clear All
          </button>
        )}
      </div>

      {/* Search */}
      <div className={styles.section}>
        <div className={styles.searchWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search sites..."
            value={filters.searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Product Lines */}
      <div className={styles.section}>
        <h5>Product Lines</h5>
        <div className={styles.buttonGroup}>
          {PRODUCT_LINES.map((line) => (
            <button
              key={line}
              className={`${styles.filterBtn} ${styles[`product${line}`]} ${
                filters.productLines.includes(line) ? styles.active : ''
              }`}
              onClick={() => toggleProductLine(line)}
            >
              {line}
            </button>
          ))}
        </div>
      </div>

      {/* Priority Tiers */}
      <div className={styles.section}>
        <h5>Priority Tier</h5>
        <div className={styles.buttonGroup}>
          {(['A', 'B', 'C'] as const).map((tier) => (
            <button
              key={tier}
              className={`${styles.filterBtn} ${styles[`tier${tier}`]} ${
                filters.priorityTiers.includes(tier) ? styles.active : ''
              }`}
              onClick={() => toggleTier(tier)}
              style={{
                '--tier-color': TIER_COLORS[tier],
              } as React.CSSProperties}
            >
              Tier {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Min Installations */}
      <div className={styles.section}>
        <h5>Min. Installations</h5>
        <div className={styles.buttonGroup}>
          {[0, 2, 3, 5].map((min) => (
            <button
              key={min}
              className={`${styles.filterBtn} ${
                filters.minInstallations === min ? styles.active : ''
              }`}
              onClick={() => setMinInstallations(min)}
            >
              {min === 0 ? 'All' : `${min}+`}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MapFilters
