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
import { motion, AnimatePresence } from 'framer-motion'
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

export function GlobalMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const [dimensions, setDimensions] = useState({ width: 800, height: 500 })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
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
        const hasMatch = filters.productLines.some((pl) =>
          site.productLines.includes(pl)
        )
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

  // Available states for filter
  const availableStates = useMemo(() => {
    return [...new Set(sites.map((s) => s.state))].sort()
  }, [sites])

  // Handle responsive sizing
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Selection handlers
  const handleSiteSelect = useCallback((siteId: string, additive = false) => {
    setSelectedIds((prev) => {
      const next = new Set(additive ? prev : [])
      if (prev.has(siteId) && additive) {
        next.delete(siteId)
      } else {
        next.add(siteId)
      }
      return next
    })
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredSites.map((s) => s.id)))
  }, [filteredSites])

  const handleRemoveFromSelection = useCallback((siteId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(siteId)
      return next
    })
  }, [])

  // Onboarding handlers
  const handleOpenOnboardingModal = useCallback(() => {
    setShowOnboardingModal(true)
  }, [])

  const handleCloseOnboardingModal = useCallback(() => {
    setShowOnboardingModal(false)
  }, [])

  const handleConfirmOnboarding = useCallback(
    async (request: OnboardingRequest) => {
      try {
        setIsOnboardingLoading(true)
        await startOnboarding(request)
        setShowOnboardingModal(false)
        setShowOnboardingProgress(true)
        // Clear selection after starting onboarding
        setSelectedIds(new Set())
      } catch (error) {
        console.error('Failed to start onboarding:', error)
      } finally {
        setIsOnboardingLoading(false)
      }
    },
    [startOnboarding]
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

  // D3 map rendering
  useEffect(() => {
    if (!svgRef.current || loading) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const { width, height } = dimensions

    // Create projection
    const projection = d3.geoAlbersUsa()
      .scale(width * 1.2)
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
  }, [dimensions, filteredSites, selectedIds, loading, handleSiteSelect])

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
          <h2>INSTALL BASE</h2>
          <div className={styles.headerStats}>
            <span className={styles.statItem}>
              <span className={styles.statValue}>{filteredSites.length}</span> sites
            </span>
            <span className={styles.statDivider}>|</span>
            <span className={styles.statItem}>
              <span className={styles.statValue}>{totalPrinters}</span> printers
            </span>
            <span className={styles.statDivider}>|</span>
            <span className={styles.statItem}>
              <span className={`${styles.statValue} ${styles.tierA}`}>{tierACounts}</span> Tier A
            </span>
            <span className={styles.statItem}>
              <span className={`${styles.statValue} ${styles.tierB}`}>{tierBCounts}</span> Tier B
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.actionBtn}
            onClick={handleSelectAll}
            disabled={filteredSites.length === 0}
          >
            Select All Visible
          </button>
          <button
            className={styles.actionBtn}
            onClick={handleClearSelection}
            disabled={selectedIds.size === 0}
          >
            Clear Selection
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className={styles.content}>
        {/* Left sidebar - Filters & Legend */}
        <aside className={styles.sidebarLeft}>
          <MapFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableStates={availableStates}
          />
          <MapLegend />
        </aside>

        {/* Map viewport */}
        <main className={styles.viewport} ref={containerRef}>
          <svg
            ref={svgRef}
            className={styles.svg}
            width={dimensions.width}
            height={dimensions.height}
          />

          {/* Zoom controls */}
          <div className={styles.zoomControls}>
            <button
              onClick={() => {
                if (!svgRef.current) return
                const svg = d3.select(svgRef.current)
                svg.transition().duration(300).call(
                  (d3.zoom() as any).scaleBy,
                  1.5
                )
              }}
            >
              +
            </button>
            <button
              onClick={() => {
                if (!svgRef.current) return
                const svg = d3.select(svgRef.current)
                svg.transition().duration(300).call(
                  (d3.zoom() as any).scaleBy,
                  0.67
                )
              }}
            >
              -
            </button>
            <button
              onClick={() => {
                if (!svgRef.current) return
                const svg = d3.select(svgRef.current)
                svg.transition().duration(300).call(
                  (d3.zoom() as any).transform,
                  d3.zoomIdentity
                )
              }}
            >
              ⌂
            </button>
          </div>

          {/* Grid overlay */}
          <div className={styles.gridOverlay} />
        </main>

        {/* Right sidebar - Detail & Selection */}
        <aside className={styles.sidebarRight}>
          <AnimatePresence mode="wait">
            <motion.div
              key={hoveredSite?.id ?? 'empty'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <SiteDetailPanel
                site={hoveredSite}
                isSelected={hoveredSite ? selectedIds.has(hoveredSite.id) : false}
                onSelect={() => hoveredSite && handleSiteSelect(hoveredSite.id)}
                onDeselect={() => hoveredSite && handleRemoveFromSelection(hoveredSite.id)}
              />
            </motion.div>
          </AnimatePresence>

          <SelectionQueue
            selectedSites={selectedSites}
            onRemoveSite={handleRemoveFromSelection}
            onClearAll={handleClearSelection}
            onOnboardSelected={handleOpenOnboardingModal}
            isOnboarding={isOnboarding}
            onViewProgress={() => setShowOnboardingProgress(true)}
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
        isOpen={showOnboardingProgress}
        sites={Array.from(statusBySite.values()).map((status) => {
          // Find the original site data
          const site = sites.find((s) => s.id === status.siteId)
          return site || {
            id: status.siteId,
            name: status.siteName || status.siteId,
            street: '',
            city: '',
            state: '',
            zip: '',
            country: 'US',
            installations: status.printers.length,
            productLines: '',
            priorityTier: 'C' as const,
            priorityScore: 0,
            contactName: null,
            contactEmail: null,
            hasShop: false,
            hasStudio: false,
            hasInnX: false,
          }
        })}
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
