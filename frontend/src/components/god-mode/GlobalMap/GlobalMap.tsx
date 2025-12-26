/**
 * GlobalMap - D3-powered US map showing printer install base
 *
 * Features:
 * - US states with TopoJSON
 * - Site markers colored by priority tier (A=gold, B=cyan, C=gray)
 * - Marker size based on installation count
 * - Click-to-select, shift+click for multi-select
 * - Zoom and pan
 */

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
// Motion temporarily disabled for debugging sidebar visibility
// import { motion, AnimatePresence } from 'framer-motion'
import { useInstallBaseData } from './useInstallBaseData'
import { MapFilters } from './MapFilters'
import { MapLegend } from './MapLegend'
import { SiteDetailPanel } from './SiteDetailPanel'
import { SelectionQueue } from './SelectionQueue'
import { OnboardingModal } from './OnboardingModal'
import { OnboardingProgress } from './OnboardingProgress'
import { useOnboarding } from '../../../hooks/useOnboarding'
import type { Site, MapFilters as MapFiltersType } from './types'
import type { OnboardingRequest } from '../../../types/onboarding'
import { TIER_COLORS } from './types'
import styles from './GlobalMap.module.css'

const US_TOPO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

interface GlobalMapProps {
  onOnboardComplete?: (sites: Site[]) => void
  onSelectionChange?: (ids: Set<string>, sites: Site[]) => void
}

export function GlobalMap({
  onOnboardComplete,
  onSelectionChange,
}: GlobalMapProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Render key for resize handling (currently disabled for debugging)
  // const [renderKey, setRenderKey] = useState(0)

  // Selection state - always use internal state, notify parent via callback
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Helper to update selection
  const updateSelectedIds = useCallback((newIds: Set<string>) => {
    setSelectedIds(newIds)
  }, [])

  const [hoveredSite, setHoveredSite] = useState<Site | null>(null)
  const [filters, setFilters] = useState<MapFiltersType>({
    productLines: [],
    priorityTiers: [],
    states: [],
    minInstallations: 0,
    searchQuery: '',
  })

  // Onboarding state
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)
  const [showOnboardingProgress, setShowOnboardingProgress] = useState(false)
  const [isOnboardingLoading, setIsOnboardingLoading] = useState(false)

  const { sites, loading, error } = useInstallBaseData('/data/install-base.json')

  // Onboarding hook
  const {
    statusBySite,
    batchSummary,
    batchId,
    isOnboarding,
    isConnected,
    startOnboarding,
    retryFailed,
    cancelOnboarding,
    clearStatus,
  } = useOnboarding({
    onSiteComplete: (siteId, status) => {
      console.log(`Site ${siteId} completed with status: ${status.status}`)
    },
    onBatchComplete: (summary) => {
      console.log('Batch complete:', summary)
    },
    onError: (error) => {
      console.error('Onboarding error:', error)
      setIsOnboardingLoading(false)
    },
  })

  // Filter sites based on current filters
  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      // Product line filter
      if (filters.productLines.length > 0) {
        const hasMatch = filters.productLines.some((pl) => {
          if (pl === 'Shop') return site.hasShop
          if (pl === 'Studio') return site.hasStudio
          if (pl === 'InnX') return site.hasInnX
          return false
        })
        if (!hasMatch) return false
      }

      // Priority tier filter
      if (filters.priorityTiers.length > 0) {
        if (!filters.priorityTiers.includes(site.priorityTier)) return false
      }

      // State filter
      if (filters.states.length > 0) {
        if (!filters.states.includes(site.state)) return false
      }

      // Min installations filter
      if (site.installations < filters.minInstallations) return false

      // Search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        const matchesName = site.name.toLowerCase().includes(query)
        const matchesCity = site.city.toLowerCase().includes(query)
        if (!matchesName && !matchesCity) return false
      }

      return true
    })
  }, [sites, filters])

  // Selected sites list
  const selectedSites = useMemo(() => {
    return sites.filter((s) => selectedIds.has(s.id))
  }, [sites, selectedIds])

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedIds, selectedSites)
    }
  }, [selectedIds, selectedSites, onSelectionChange])

  // Available states for filter
  const availableStates = useMemo(() => {
    return [...new Set(sites.map((s) => s.state))].sort()
  }, [sites])

  // Handle window resize - DISABLED FOR DEBUGGING
  // useEffect(() => {
  //   let timeoutId: ReturnType<typeof setTimeout>
  //
  //   const handleResize = () => {
  //     clearTimeout(timeoutId)
  //     timeoutId = setTimeout(() => {
  //       setRenderKey((k) => k + 1)
  //     }, 150) // Debounce resize events
  //   }
  //
  //   window.addEventListener('resize', handleResize)
  //   return () => {
  //     clearTimeout(timeoutId)
  //     window.removeEventListener('resize', handleResize)
  //   }
  // }, [])

  // Selection handlers
  const handleSiteSelect = useCallback((siteId: string, additive = false) => {
    const next = new Set(additive ? selectedIds : [])
    if (selectedIds.has(siteId) && additive) {
      next.delete(siteId)
    } else {
      next.add(siteId)
    }
    updateSelectedIds(next)
  }, [selectedIds, updateSelectedIds])

  const handleClearSelection = useCallback(() => {
    updateSelectedIds(new Set())
  }, [updateSelectedIds])

  const handleSelectAll = useCallback(() => {
    updateSelectedIds(new Set(filteredSites.map((s) => s.id)))
  }, [filteredSites, updateSelectedIds])

  const handleRemoveFromSelection = useCallback((siteId: string) => {
    const next = new Set(selectedIds)
    next.delete(siteId)
    updateSelectedIds(next)
  }, [selectedIds, updateSelectedIds])

  // Onboarding handlers
  const handleOpenOnboardingModal = useCallback(() => {
    setShowOnboardingModal(true)
  }, [])

  const handleCloseOnboardingModal = useCallback(() => {
    setShowOnboardingModal(false)
  }, [])

  const handleConfirmOnboarding = useCallback(
    async (_request: OnboardingRequest) => {
      setIsOnboardingLoading(true)

      // Get selected sites before clearing
      const onboardedSites = sites.filter(s => selectedIds.has(s.id))

      // Close modal and clear selection
      setShowOnboardingModal(false)
      updateSelectedIds(new Set())

      // If onOnboardComplete callback is provided, navigate to platform immediately
      // This skips the API call for now since we're in development
      if (onOnboardComplete && onboardedSites.length > 0) {
        setIsOnboardingLoading(false)
        onOnboardComplete(onboardedSites)
        return
      }

      // Otherwise try to start actual onboarding with API
      try {
        await startOnboarding(_request)
        setShowOnboardingProgress(true)
      } catch (error) {
        console.error('Failed to start onboarding:', error)
        // Still show progress modal even if API fails (for demo purposes)
        setShowOnboardingProgress(true)
      } finally {
        setIsOnboardingLoading(false)
      }
    },
    [startOnboarding, sites, selectedIds, onOnboardComplete, updateSelectedIds]
  )

  const handleCloseProgress = useCallback(() => {
    setShowOnboardingProgress(false)
    if (!isOnboarding) {
      clearStatus()
    }
  }, [isOnboarding, clearStatus])

  const handleRetryFailed = useCallback(
    async (siteIds: string[]) => {
      try {
        await retryFailed({ batchId: batchId!, siteIds })
      } catch (error) {
        console.error('Failed to retry:', error)
      }
    },
    [retryFailed, batchId]
  )

  const handleCancelOnboarding = useCallback(async () => {
    try {
      await cancelOnboarding()
      setShowOnboardingProgress(false)
      clearStatus()
    } catch (error) {
      console.error('Failed to cancel onboarding:', error)
    }
  }, [cancelOnboarding, clearStatus])

  // D3 map rendering - TEMPORARILY using fixed dimensions
  useEffect(() => {
    if (!svgRef.current || loading) return

    // Use fixed dimensions to prevent layout jitter
    const width = 800
    const height = 500

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Set SVG viewBox to match container
    svg.attr('viewBox', `0 0 ${width} ${height}`)
    svg.attr('preserveAspectRatio', 'xMidYMid meet')

    // Create projection
    const projection = d3.geoAlbersUsa()
      .scale(width * 1.1)
      .translate([width / 2, height / 2])

    const path = d3.geoPath().projection(projection)

    // Add defs for filters and gradients
    const defs = svg.append('defs')

    // Glow filter
    const glowFilter = defs.append('filter')
      .attr('id', 'marker-glow')
      .attr('x', '-100%')
      .attr('y', '-100%')
      .attr('width', '300%')
      .attr('height', '300%')

    glowFilter.append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', '4')
      .attr('result', 'blur')

    const glowMerge = glowFilter.append('feMerge')
    glowMerge.append('feMergeNode').attr('in', 'blur')
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Selected glow filter (green)
    const selectedGlow = defs.append('filter')
      .attr('id', 'selected-glow')
      .attr('x', '-100%')
      .attr('y', '-100%')
      .attr('width', '300%')
      .attr('height', '300%')

    selectedGlow.append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', '5')
      .attr('result', 'blur')

    const selectedMerge = selectedGlow.append('feMerge')
    selectedMerge.append('feMergeNode').attr('in', 'blur')
    selectedMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Create zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 8])
      .on('zoom', (event) => {
        mapGroup.attr('transform', event.transform.toString())
      })

    svg.call(zoomBehavior)

    const mapGroup = svg.append('g').attr('class', 'map-group')

    // Load and render US states
    d3.json(US_TOPO_URL).then((us: any) => {
      if (!us) return

      const states = topojson.feature(us, us.objects.states)
      const stateMesh = topojson.mesh(us, us.objects.states, (a, b) => a !== b)

      // Draw states
      mapGroup.append('g')
        .attr('class', 'states-layer')
        .selectAll('path')
        .data((states as any).features)
        .join('path')
        .attr('d', path as any)
        .attr('fill', 'var(--god-steel-850)')
        .attr('stroke', 'none')
        .on('mouseenter', function () {
          d3.select(this).attr('fill', 'var(--god-steel-800)')
        })
        .on('mouseleave', function () {
          d3.select(this).attr('fill', 'var(--god-steel-850)')
        })

      // Draw state borders
      mapGroup.append('path')
        .datum(stateMesh)
        .attr('fill', 'none')
        .attr('stroke', 'var(--god-steel-700)')
        .attr('stroke-width', 0.5)
        .attr('d', path as any)

      // Draw site markers
      const markersGroup = mapGroup.append('g').attr('class', 'markers-layer')

      // Sort so selected markers render on top
      const sortedSites = [...filteredSites].sort((a, b) => {
        const aSelected = selectedIds.has(a.id) ? 1 : 0
        const bSelected = selectedIds.has(b.id) ? 1 : 0
        return aSelected - bSelected
      })

      const markers = markersGroup
        .selectAll('g.site-marker')
        .data(sortedSites, (d: any) => d.id)
        .join('g')
        .attr('class', (d) => `site-marker ${selectedIds.has(d.id) ? 'selected' : ''}`)
        .attr('transform', (d) => {
          if (!d.lat || !d.lng) return ''
          const coords = projection([d.lng, d.lat])
          return coords ? `translate(${coords[0]}, ${coords[1]})` : ''
        })
        .style('cursor', 'pointer')

      // Calculate marker radius based on installations
      const getRadius = (d: Site) => Math.max(5, Math.min(18, 4 + Math.sqrt(d.installations) * 4))

      // Marker circles
      markers.append('circle')
        .attr('r', getRadius)
        .attr('fill', (d) => selectedIds.has(d.id)
          ? 'var(--god-vespene-400)'
          : TIER_COLORS[d.priorityTier]
        )
        .attr('stroke', (d) => selectedIds.has(d.id)
          ? 'var(--god-vespene-300)'
          : 'var(--god-steel-900)'
        )
        .attr('stroke-width', (d) => selectedIds.has(d.id) ? 2 : 1.5)
        .attr('opacity', 0.9)
        .attr('filter', (d) => selectedIds.has(d.id) ? 'url(#selected-glow)' : 'none')

      // Add installation count labels for larger sites
      markers.filter((d) => d.installations >= 3)
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', (d) => d.priorityTier === 'C' ? 'var(--god-steel-100)' : 'var(--god-steel-900)')
        .attr('font-size', '9px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'var(--font-mono)')
        .attr('pointer-events', 'none')
        .text((d) => d.installations)

      // Event handlers
      markers
        .on('click', (event: MouseEvent, d: Site) => {
          event.stopPropagation()
          handleSiteSelect(d.id, event.shiftKey || event.ctrlKey || event.metaKey)
        })
        .on('mouseenter', function (_event: MouseEvent, d: Site) {
          setHoveredSite(d)

          // Highlight effect
          d3.select(this)
            .raise()
            .select('circle')
            .transition()
            .duration(150)
            .attr('r', getRadius(d) * 1.3)
            .attr('filter', 'url(#marker-glow)')
        })
        .on('mouseleave', function (_event: MouseEvent, d: Site) {
          setHoveredSite(null)

          d3.select(this)
            .select('circle')
            .transition()
            .duration(150)
            .attr('r', getRadius(d))
            .attr('filter', selectedIds.has(d.id) ? 'url(#selected-glow)' : 'none')
        })
    })

    // Cleanup
    return () => {
      svg.selectAll('*').remove()
    }
  }, [filteredSites, selectedIds, loading, handleSiteSelect])

  // Stats
  const totalPrinters = filteredSites.reduce((sum, s) => sum + s.installations, 0)
  const tierACounts = filteredSites.filter((s) => s.priorityTier === 'A').length
  const tierBCounts = filteredSites.filter((s) => s.priorityTier === 'B').length

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading install base data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <span>Error loading data: {error.message}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h2>GLOBAL INSTALL BASE</h2>
          <div className={styles.headerStats}>
            <span className={styles.statItem}>
              <span className={styles.statValue}>{filteredSites.length}</span> sites
            </span>
            <span className={styles.statDivider}>|</span>
            <span className={styles.statItem}>
              <span className={`${styles.statValue} ${styles.tierA}`}>{tierACounts}</span> Tier A
            </span>
            <span className={styles.statDivider}>|</span>
            <span className={styles.statItem}>
              <span className={`${styles.statValue} ${styles.tierB}`}>{tierBCounts}</span> Tier B
            </span>
            <span className={styles.statDivider}>|</span>
            <span className={styles.statItem}>
              <span className={styles.statValue}>{totalPrinters}</span> printers
            </span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.actionBtn}
            onClick={handleSelectAll}
            disabled={filteredSites.length === 0}
          >
            Select All ({filteredSites.length})
          </button>
          <button
            className={styles.actionBtn}
            onClick={handleClearSelection}
            disabled={selectedIds.size === 0}
          >
            Clear ({selectedIds.size})
          </button>
          <button
            className={styles.actionBtn}
            onClick={handleOpenOnboardingModal}
            disabled={selectedIds.size === 0 || isOnboarding}
          >
            Onboard Selected
          </button>
        </div>
      </header>

      {/* Main content - 3-column grid */}
      <div className={styles.content}>
        {/* Left sidebar - Filters + Legend */}
        <aside className={styles.sidebarLeft}>
          <MapFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableStates={availableStates}
          />
          <MapLegend />
        </aside>

        {/* Center - Map viewport */}
        <div className={styles.viewport} ref={containerRef}>
          <svg ref={svgRef} className={styles.svg} />
          <div className={styles.gridOverlay} />

          {/* Hovered site tooltip */}
          {hoveredSite && (
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                padding: '8px 12px',
                background: 'var(--god-steel-800)',
                border: '1px solid var(--god-steel-600)',
                color: 'var(--god-steel-200)',
                fontSize: '12px',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            >
              <strong>{hoveredSite.name}</strong>
              <span style={{ marginLeft: '8px', color: 'var(--god-steel-400)' }}>
                {hoveredSite.city}, {hoveredSite.state}
              </span>
              <span style={{ marginLeft: '8px', color: TIER_COLORS[hoveredSite.priorityTier] }}>
                Tier {hoveredSite.priorityTier}
              </span>
              <span style={{ marginLeft: '8px' }}>
                {hoveredSite.installations} printer{hoveredSite.installations !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Right sidebar - Site details + Selection queue */}
        <aside className={styles.sidebarRight}>
          <SiteDetailPanel
            site={selectedSites.length === 1 ? selectedSites[0] : null}
            isSelected={selectedSites.length === 1}
            onSelect={() => {}}
            onDeselect={handleClearSelection}
          />
          <SelectionQueue
            selectedSites={selectedSites}
            onRemoveSite={handleRemoveFromSelection}
            onClearAll={handleClearSelection}
            onOnboardSelected={handleOpenOnboardingModal}
            isOnboarding={isOnboarding}
          />
        </aside>
      </div>

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboardingModal}
        sites={selectedSites}
        onClose={handleCloseOnboardingModal}
        onConfirm={handleConfirmOnboarding}
        isLoading={isOnboardingLoading}
      />

      {/* Onboarding Progress */}
      <OnboardingProgress
        isOpen={showOnboardingProgress && !!batchSummary}
        sites={sites}
        statusBySite={statusBySite}
        batchSummary={batchSummary}
        isConnected={isConnected}
        onClose={handleCloseProgress}
        onRetry={handleRetryFailed}
        onCancel={handleCancelOnboarding}
      />
    </div>
  )
}

export default GlobalMap
