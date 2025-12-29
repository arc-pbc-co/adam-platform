/**
 * FactoryFloorCanvas - Hardware fleet visualization
 *
 * Displays printers from onboarded sites with filtering and real-time updates.
 * Falls back to demo data when no sites are provided.
 */

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Thermometer,
  AlertTriangle,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3X3,
  Printer,
  Activity,
  Gauge,
  Timer,
  Droplets,
  Package,
  ChevronDown,
  MapPin,
} from 'lucide-react'
import styles from './FactoryFloorCanvas.module.css'
import type { Site } from '../god-mode/GlobalMap/types'
import {
  sitesToCanvasPrinters,
  calculateGridPositions,
  getUniqueSites,
  filterPrintersBySite,
  type CanvasPrinterUnit,
} from '../../utils/printerUtils'

// Re-export for backward compatibility
type PrinterUnit = CanvasPrinterUnit

interface FactoryFloorCanvasProps {
  sites?: Site[]
  onPrinterSelect?: (printer: PrinterUnit | null) => void
}

// Demo printer fleet
const createDemoPrinters = (): PrinterUnit[] => [
  {
    id: 'p1',
    name: 'X25Pro-01',
    model: 'X25Pro',
    status: 'printing',
    progress: 67,
    temperature: 1285,
    currentJob: 'Fe-Co Batch A',
    position: { x: 80, y: 80 },
    telemetry: {
      jobProgress: 67,
      layersPrinted: 2847,
      totalLayers: 4250,
      timeRemaining: '2h 15m',
    },
  },
  {
    id: 'p2',
    name: 'X25Pro-02',
    model: 'X25Pro',
    status: 'printing',
    progress: 34,
    temperature: 1180,
    currentJob: 'MnBi Magnets',
    position: { x: 400, y: 80 },
    telemetry: {
      jobProgress: 34,
      layersPrinted: 1445,
      totalLayers: 4250,
      timeRemaining: '4h 32m',
    },
  },
  {
    id: 'p3',
    name: 'Shop-01',
    model: 'Shop System',
    status: 'idle',
    temperature: 25,
    position: { x: 720, y: 80 },
  },
  {
    id: 'p4',
    name: 'X160Pro-01',
    model: 'X160Pro',
    status: 'sintering',
    progress: 89,
    temperature: 1350,
    currentJob: 'Ti-6Al-4V Grid',
    position: { x: 80, y: 280 },
    telemetry: {
      jobProgress: 89,
      layersPrinted: 3782,
      totalLayers: 4250,
      timeRemaining: '45m',
    },
  },
  {
    id: 'p5',
    name: 'InnoventX-01',
    model: 'InnoventX',
    status: 'maintenance',
    temperature: 28,
    position: { x: 400, y: 280 },
  },
  {
    id: 'p6',
    name: 'Shop-02',
    model: 'Shop System',
    status: 'error',
    temperature: 45,
    currentJob: 'ERROR: Bed Fault',
    position: { x: 720, y: 280 },
  },
]

export function FactoryFloorCanvas({ sites, onPrinterSelect }: FactoryFloorCanvasProps) {
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(true)
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false)

  // Convert sites to printers or use demo data
  const basePrinters = useMemo(() => {
    if (sites && sites.length > 0) {
      return sitesToCanvasPrinters(sites)
    }
    return createDemoPrinters()
  }, [sites])

  // Get unique sites for the dropdown
  const availableSites = useMemo(() => getUniqueSites(basePrinters), [basePrinters])

  // Filter printers by selected site and calculate grid positions
  const positionedPrinters = useMemo(() => {
    const filtered = filterPrintersBySite(basePrinters, selectedSiteId)
    return calculateGridPositions(filtered)
  }, [basePrinters, selectedSiteId])

  // State for real-time progress updates
  const [printers, setPrinters] = useState<PrinterUnit[]>(positionedPrinters)

  // Update printers when positionedPrinters changes (site filter or sites prop changes)
  useEffect(() => {
    setPrinters(positionedPrinters)
  }, [positionedPrinters])

  // Simulate progress updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPrinters((prev) =>
        prev.map((p) => {
          if (p.status === 'printing' && p.telemetry) {
            const newProgress = Math.min(p.telemetry.jobProgress + 0.1, 100)
            return {
              ...p,
              progress: newProgress,
              telemetry: {
                ...p.telemetry,
                jobProgress: newProgress,
                layersPrinted: Math.floor((newProgress / 100) * p.telemetry.totalLayers),
              },
            }
          }
          return p
        })
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handlePrinterClick = (printerId: string) => {
    setSelectedPrinter(printerId === selectedPrinter ? null : printerId)
    const printer = printers.find((p) => p.id === printerId)
    onPrinterSelect?.(printer || null)
  }

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 2))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.5))
  const handleReset = () => setZoom(1)

  const getStatusColor = (status: PrinterUnit['status']) => {
    switch (status) {
      case 'printing':
        return 'var(--accent-primary)'
      case 'sintering':
        return 'var(--accent-purple)'
      case 'idle':
        return 'var(--text-tertiary)'
      case 'maintenance':
        return 'var(--accent-warning)'
      case 'error':
        return 'var(--accent-danger)'
      default:
        return 'var(--text-tertiary)'
    }
  }

  // Calculate stats
  const stats = {
    total: printers.length,
    printing: printers.filter((p) => p.status === 'printing').length,
    sintering: printers.filter((p) => p.status === 'sintering').length,
    idle: printers.filter((p) => p.status === 'idle').length,
    error: printers.filter((p) => p.status === 'error' || p.status === 'maintenance').length,
  }

  // Get selected site name for display
  const selectedSiteName = selectedSiteId
    ? availableSites.find((s) => s.id === selectedSiteId)?.name || 'Unknown'
    : 'All Sites'

  return (
    <div className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        {/* Site selector - only show when sites are provided */}
        {sites && sites.length > 0 && (
          <>
            <div className={styles.toolbarGroup}>
              <div className={styles.siteSelector}>
                <button
                  className={styles.siteSelectorBtn}
                  onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
                >
                  <MapPin size={14} />
                  <span>{selectedSiteName}</span>
                  <ChevronDown size={14} className={siteDropdownOpen ? styles.rotated : ''} />
                </button>
                {siteDropdownOpen && (
                  <div className={styles.siteDropdown}>
                    <button
                      className={`${styles.siteOption} ${!selectedSiteId ? styles.selected : ''}`}
                      onClick={() => {
                        setSelectedSiteId(null)
                        setSiteDropdownOpen(false)
                      }}
                    >
                      All Sites ({basePrinters.length} printers)
                    </button>
                    {availableSites.map((site) => (
                      <button
                        key={site.id}
                        className={`${styles.siteOption} ${selectedSiteId === site.id ? styles.selected : ''}`}
                        onClick={() => {
                          setSelectedSiteId(site.id)
                          setSiteDropdownOpen(false)
                        }}
                      >
                        {site.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className={styles.divider} />
          </>
        )}

        <div className={styles.toolbarGroup}>
          <button className={styles.toolbarBtn} onClick={handleReset}>
            <RotateCcw size={16} />
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.toolbarGroup}>
          <button className={styles.toolbarBtn} onClick={handleZoomOut}>
            <ZoomOut size={16} />
          </button>
          <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
          <button className={styles.toolbarBtn} onClick={handleZoomIn}>
            <ZoomIn size={16} />
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.toolbarGroup}>
          <button
            className={`${styles.toolbarBtn} ${showGrid ? styles.active : ''}`}
            onClick={() => setShowGrid(!showGrid)}
          >
            <Grid3X3 size={16} />
          </button>
          <button className={styles.toolbarBtn} onClick={handleReset}>
            <Maximize2 size={16} />
          </button>
        </div>

        <div className={styles.fleetStats}>
          <span className={styles.statBadge} data-status="printing">
            {stats.printing} Printing
          </span>
          <span className={styles.statBadge} data-status="sintering">
            {stats.sintering} Sintering
          </span>
          <span className={styles.statBadge} data-status="idle">
            {stats.idle} Idle
          </span>
          {stats.error > 0 && (
            <span className={styles.statBadge} data-status="error">
              {stats.error} Issues
            </span>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className={`${styles.canvas} ${showGrid ? styles.withGrid : ''}`}>
        <div
          className={styles.canvasContent}
          style={{ transform: `scale(${zoom})` }}
        >
          {printers.map((printer) => (
            <motion.div
              key={printer.id}
              className={`${styles.printerCard} ${
                selectedPrinter === printer.id ? styles.selected : ''
              }`}
              style={{
                left: printer.position.x,
                top: printer.position.y,
                '--status-color': getStatusColor(printer.status),
              } as React.CSSProperties}
              onClick={() => handlePrinterClick(printer.id)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className={styles.printerHeader}>
                <div className={styles.printerIcon}>
                  <Printer size={20} />
                </div>
                <div className={styles.printerInfo}>
                  <span className={styles.printerName}>{printer.name}</span>
                  <span className={styles.printerModel}>{printer.model}</span>
                </div>
                <div className={`${styles.statusIndicator} ${styles[printer.status]}`}>
                  {printer.status === 'error' && <AlertTriangle size={14} />}
                </div>
              </div>

              {(printer.status === 'printing' || printer.status === 'sintering') && printer.telemetry && (
                <div className={styles.printerProgress}>
                  <div className={styles.progressBar}>
                    <motion.div
                      className={styles.progressFill}
                      initial={{ width: 0 }}
                      animate={{ width: `${printer.telemetry.jobProgress}%` }}
                    />
                  </div>
                  <div className={styles.progressStats}>
                    <span>{printer.telemetry.jobProgress.toFixed(1)}%</span>
                    <span>{printer.telemetry.timeRemaining}</span>
                  </div>
                </div>
              )}

              <div className={styles.printerStats}>
                <div className={styles.stat}>
                  <Thermometer size={12} />
                  <span>{printer.temperature}\u00b0C</span>
                </div>
                {printer.telemetry && (
                  <div className={styles.stat}>
                    <Package size={12} />
                    <span>
                      {printer.telemetry.layersPrinted}/{printer.telemetry.totalLayers}
                    </span>
                  </div>
                )}
              </div>

              {printer.currentJob && (
                <div className={styles.currentJob}>
                  {printer.status === 'error' ? (
                    <span className={styles.errorText}>{printer.currentJob}</span>
                  ) : (
                    <>
                      <Activity size={12} />
                      <span>{printer.currentJob}</span>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className={styles.statusBar}>
        <span className={styles.statusItem}>
          <Printer size={14} />
          {stats.total} Printers Online
        </span>
        <span className={styles.statusItem}>
          <Gauge size={14} />
          Avg. Utilization: 67%
        </span>
        <span className={styles.statusItem}>
          <Timer size={14} />
          Jobs Today: 12
        </span>
        <span className={styles.statusItem}>
          <Droplets size={14} />
          Material: 2,847 kg
        </span>
      </div>
    </div>
  )
}

export default FactoryFloorCanvas
