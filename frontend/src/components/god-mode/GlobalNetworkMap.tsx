/**
 * GlobalNetworkMap - D3-powered US network visualization
 *
 * Shows lab locations across the US with:
 * - D3/TopoJSON US state boundaries
 * - Animated connection lines between labs
 * - Clickable lab markers
 * - Hover tooltips
 * - Pulse animations for active labs
 */

import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import type { SelectedEntity } from './GodModeLayout'
import styles from './GlobalNetworkMap.module.css'

interface GlobalNetworkMapProps {
  selectedEntity: SelectedEntity | null
  onEntitySelect: (entity: SelectedEntity | null) => void
}

// Lab locations with coordinates (lon, lat)
const LABS = [
  { id: 'lab-01', name: 'Lab Alpha', coords: [-122.4194, 37.7749], status: 'online' as const, city: 'San Francisco, CA' },
  { id: 'lab-02', name: 'Lab Beta', coords: [-73.9857, 40.7484], status: 'online' as const, city: 'New York, NY' },
  { id: 'lab-03', name: 'Lab Gamma', coords: [-87.6298, 41.8781], status: 'running' as const, city: 'Chicago, IL' },
  { id: 'lab-04', name: 'Lab Delta', coords: [-118.2437, 34.0522], status: 'offline' as const, city: 'Los Angeles, CA' },
  { id: 'lab-05', name: 'Lab Epsilon', coords: [-95.3698, 29.7604], status: 'idle' as const, city: 'Houston, TX' },
]

// Connections between labs
const CONNECTIONS = [
  { from: 'lab-01', to: 'lab-02' },
  { from: 'lab-01', to: 'lab-03' },
  { from: 'lab-02', to: 'lab-03' },
  { from: 'lab-03', to: 'lab-05' },
  { from: 'lab-04', to: 'lab-05' },
]

// US TopoJSON URL (using public CDN)
const US_TOPO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

interface TooltipData {
  x: number
  y: number
  lab: typeof LABS[0]
}

export function GlobalNetworkMap({ selectedEntity, onEntitySelect }: GlobalNetworkMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 })

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setDimensions({ width, height })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Draw the map
  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const { width, height } = dimensions

    // Create projection centered on the US
    const projection = d3.geoAlbersUsa()
      .scale(width * 1.1)
      .translate([width / 2, height / 2])

    const path = d3.geoPath().projection(projection)

    // Create defs for gradients and filters
    const defs = svg.append('defs')

    // Glow filter for active elements
    const glow = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')

    glow.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur')

    const glowMerge = glow.append('feMerge')
    glowMerge.append('feMergeNode').attr('in', 'coloredBlur')
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Gradient for connections
    const connectionGradient = defs.append('linearGradient')
      .attr('id', 'connectionGradient')
      .attr('gradientUnits', 'userSpaceOnUse')

    connectionGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'var(--god-primary-500)')
      .attr('stop-opacity', 0.8)

    connectionGradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', 'var(--god-primary-400)')
      .attr('stop-opacity', 1)

    connectionGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'var(--god-primary-500)')
      .attr('stop-opacity', 0.8)

    // Map container group
    const mapGroup = svg.append('g')
      .attr('class', styles.mapGroup)

    // Load and render US map
    d3.json(US_TOPO_URL).then((us: any) => {
      const states = topojson.feature(us, us.objects.states)
      const stateMesh = topojson.mesh(us, us.objects.states, (a, b) => a !== b)

      // Draw states
      mapGroup.append('g')
        .attr('class', styles.states)
        .selectAll('path')
        .data((states as any).features)
        .enter()
        .append('path')
        .attr('d', path as any)
        .attr('class', styles.state)

      // Draw state borders
      mapGroup.append('path')
        .datum(stateMesh)
        .attr('class', styles.stateBorders)
        .attr('d', path as any)

      // Draw connections
      const connectionsGroup = mapGroup.append('g')
        .attr('class', styles.connections)

      CONNECTIONS.forEach((conn, i) => {
        const fromLab = LABS.find(l => l.id === conn.from)
        const toLab = LABS.find(l => l.id === conn.to)

        if (!fromLab || !toLab) return

        const fromPoint = projection(fromLab.coords as [number, number])
        const toPoint = projection(toLab.coords as [number, number])

        if (!fromPoint || !toPoint) return

        // Create curved path
        const midX = (fromPoint[0] + toPoint[0]) / 2
        const midY = (fromPoint[1] + toPoint[1]) / 2 - 30 // Curve upward

        const pathData = `M ${fromPoint[0]} ${fromPoint[1]} Q ${midX} ${midY} ${toPoint[0]} ${toPoint[1]}`

        // Connection line
        const line = connectionsGroup.append('path')
          .attr('d', pathData)
          .attr('class', styles.connection)
          .attr('stroke', 'url(#connectionGradient)')

        // Animated dot traveling along the path
        const pathNode = line.node()
        if (pathNode) {
          const totalLength = pathNode.getTotalLength()

          connectionsGroup.append('circle')
            .attr('r', 3)
            .attr('class', styles.dataPacket)
            .attr('filter', 'url(#glow)')
            .append('animateMotion')
            .attr('dur', `${3 + i * 0.5}s`)
            .attr('repeatCount', 'indefinite')
            .append('mpath')
            .attr('href', null)

          // Use SMIL animation
          const packet = connectionsGroup.append('circle')
            .attr('r', 2)
            .attr('fill', 'var(--god-primary-300)')
            .attr('filter', 'url(#glow)')

          // Animate packet - capture pathNode in closure
          const capturedPathNode = pathNode
          function animatePacket() {
            packet
              .attr('opacity', 1)
              .transition()
              .duration(2000 + i * 500)
              .ease(d3.easeLinear)
              .attrTween('transform', () => {
                return (t: number) => {
                  const point = capturedPathNode.getPointAtLength(t * totalLength)
                  return `translate(${point.x}, ${point.y})`
                }
              })
              .on('end', () => {
                packet.attr('opacity', 0)
                setTimeout(animatePacket, 500 + Math.random() * 1000)
              })
          }

          setTimeout(animatePacket, i * 400)
        }
      })

      // Draw lab markers
      const labsGroup = mapGroup.append('g')
        .attr('class', styles.labs)

      LABS.forEach(lab => {
        const point = projection(lab.coords as [number, number])
        if (!point) return

        const labGroup = labsGroup.append('g')
          .attr('transform', `translate(${point[0]}, ${point[1]})`)
          .attr('class', `${styles.labMarker} ${styles[lab.status]}`)
          .style('cursor', 'pointer')
          .on('click', () => {
            onEntitySelect({
              id: lab.id,
              type: 'lab',
              name: lab.name,
              status: lab.status,
            })
          })
          .on('mouseenter', (event) => {
            setTooltip({ x: event.pageX, y: event.pageY, lab })
          })
          .on('mouseleave', () => {
            setTooltip(null)
          })

        // Outer pulse ring (for active labs)
        if (lab.status === 'online' || lab.status === 'running') {
          labGroup.append('circle')
            .attr('r', 12)
            .attr('class', styles.pulseRing)
        }

        // Main marker circle
        labGroup.append('circle')
          .attr('r', 8)
          .attr('class', styles.markerOuter)
          .attr('filter', 'url(#glow)')

        labGroup.append('circle')
          .attr('r', 5)
          .attr('class', styles.markerInner)

        // Selection ring
        if (selectedEntity?.id === lab.id) {
          labGroup.append('circle')
            .attr('r', 16)
            .attr('class', styles.selectionRing)
        }
      })
    })

    // Cleanup
    return () => {
      svg.selectAll('*').remove()
    }
  }, [dimensions, selectedEntity, onEntitySelect])

  return (
    <div className={styles.container} ref={containerRef}>
      {/* Header overlay */}
      <div className={styles.header}>
        <span className={styles.title}>GLOBAL NETWORK</span>
        <span className={styles.subtitle}>Real-time lab connectivity</span>
      </div>

      {/* SVG Map */}
      <svg
        ref={svgRef}
        className={styles.svg}
        width={dimensions.width}
        height={dimensions.height}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      />

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            className={styles.tooltip}
            style={{
              left: tooltip.x + 10,
              top: tooltip.y - 10,
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
          >
            <div className={styles.tooltipName}>{tooltip.lab.name}</div>
            <div className={styles.tooltipCity}>{tooltip.lab.city}</div>
            <div className={`${styles.tooltipStatus} ${styles[tooltip.lab.status]}`}>
              {tooltip.lab.status.toUpperCase()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats overlay */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>5</span>
          <span className={styles.statLabel}>Labs</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>4</span>
          <span className={styles.statLabel}>Connections</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.statValue} ${styles.online}`}>3</span>
          <span className={styles.statLabel}>Online</span>
        </div>
      </div>

      {/* Grid overlay for SC2 effect */}
      <div className={styles.gridOverlay} />
    </div>
  )
}

export default GlobalNetworkMap
