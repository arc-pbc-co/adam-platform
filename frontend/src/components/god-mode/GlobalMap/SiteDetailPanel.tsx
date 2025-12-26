/**
 * SiteDetailPanel - Shows details of hovered/selected site
 */

import { useState, useMemo } from 'react'
import {
  Building2,
  Mail,
  User,
  Printer,
  MapPin,
  Plus,
  Minus,
  ChevronDown,
  ChevronRight,
  Factory,
  Microscope,
} from 'lucide-react'
import type { Site, Printer as PrinterType } from './types'
import { TIER_COLORS } from './types'
import styles from './SiteDetailPanel.module.css'

interface SiteDetailPanelProps {
  site: Site | null
  isSelected: boolean
  onSelect: () => void
  onDeselect: () => void
}

// Group printers by product line
function groupPrintersByLine(printers: PrinterType[]) {
  const groups: Record<string, PrinterType[]> = {
    Shop: [],
    Studio: [],
    InnX: [],
  }
  printers.forEach((p) => {
    if (groups[p.productLine]) {
      groups[p.productLine].push(p)
    }
  })
  return groups
}

// Product line icons
const PRODUCT_ICONS: Record<string, typeof Printer> = {
  Shop: Factory,
  Studio: Printer,
  InnX: Microscope,
}

export function SiteDetailPanel({
  site,
  isSelected,
  onSelect,
  onDeselect,
}: SiteDetailPanelProps) {
  // Track which product lines are expanded
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set(['Shop', 'Studio', 'InnX']))

  // Group printers by product line
  const printerGroups = useMemo(() => {
    if (!site?.printers) return { Shop: [], Studio: [], InnX: [] }
    return groupPrintersByLine(site.printers)
  }, [site?.printers])

  const toggleLine = (line: string) => {
    setExpandedLines((prev) => {
      const next = new Set(prev)
      if (next.has(line)) {
        next.delete(line)
      } else {
        next.add(line)
      }
      return next
    })
  }

  if (!site) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <Building2 size={32} className={styles.emptyIcon} />
          <span className={styles.emptyText}>Hover over a site</span>
          <span className={styles.emptyHint}>to view details</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.panel} ${isSelected ? styles.selected : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <span
          className={styles.tierBadge}
          style={{ backgroundColor: TIER_COLORS[site.priorityTier] }}
        >
          TIER {site.priorityTier}
        </span>
        <span className={styles.score}>
          Score: {site.priorityScore.toFixed(0)}
        </span>
      </div>

      {/* Name & Location */}
      <h3 className={styles.name}>{site.name}</h3>
      <p className={styles.location}>
        <MapPin size={12} />
        {site.city}, {site.state} {site.zip}
      </p>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <Printer size={16} className={styles.statIcon} />
          <div className={styles.statContent}>
            <span className={styles.statValue}>{site.installations}</span>
            <span className={styles.statLabel}>Printers</span>
          </div>
        </div>
        <div className={styles.stat}>
          <Building2 size={16} className={styles.statIcon} />
          <div className={styles.statContent}>
            <span className={styles.statValue}>{site.productLines}</span>
            <span className={styles.statLabel}>Product Line</span>
          </div>
        </div>
      </div>

      {/* Product badges */}
      <div className={styles.products}>
        {site.hasShop && (
          <span className={`${styles.productBadge} ${styles.shop}`}>Shop</span>
        )}
        {site.hasStudio && (
          <span className={`${styles.productBadge} ${styles.studio}`}>Studio</span>
        )}
        {site.hasInnX && (
          <span className={`${styles.productBadge} ${styles.innx}`}>InnX</span>
        )}
      </div>

      {/* Printer List */}
      {site.printers && site.printers.length > 0 && (
        <div className={styles.printerList}>
          <div className={styles.printerListHeader}>
            <span>Equipment ({site.printers.length})</span>
          </div>
          {(['Shop', 'Studio', 'InnX'] as const).map((line) => {
            const printers = printerGroups[line]
            if (printers.length === 0) return null
            const isExpanded = expandedLines.has(line)
            const Icon = PRODUCT_ICONS[line]
            return (
              <div key={line} className={styles.printerGroup}>
                <button
                  className={`${styles.printerGroupHeader} ${styles[line.toLowerCase()]}`}
                  onClick={() => toggleLine(line)}
                >
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Icon size={12} />
                  <span>{line}</span>
                  <span className={styles.printerCount}>({printers.length})</span>
                </button>
                {isExpanded && (
                  <div className={styles.printerSerials}>
                    {printers.map((p) => (
                      <div key={p.serialNumber} className={styles.printerSerial}>
                        {p.serialNumber}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Contact */}
      {site.contactName && (
        <div className={styles.contact}>
          <div className={styles.contactRow}>
            <User size={12} />
            <span>{site.contactName}</span>
          </div>
          {site.contactEmail && (
            <div className={styles.contactRow}>
              <Mail size={12} />
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
            </div>
          )}
        </div>
      )}

      {/* Action button */}
      <button
        className={`${styles.actionBtn} ${isSelected ? styles.remove : styles.add}`}
        onClick={isSelected ? onDeselect : onSelect}
      >
        {isSelected ? (
          <>
            <Minus size={14} />
            Remove from Queue
          </>
        ) : (
          <>
            <Plus size={14} />
            Add to Onboarding Queue
          </>
        )}
      </button>
    </div>
  )
}

export default SiteDetailPanel
