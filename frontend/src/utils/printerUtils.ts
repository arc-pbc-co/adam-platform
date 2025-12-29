/**
 * Shared printer utilities
 * Conversion functions for printer data between different formats
 */

import type { Site } from '../components/god-mode/GlobalMap/types'
import type { PrinterUnit, PrinterStatus } from '../components/god-mode/TacticalMap/types'

// FactoryFloorCanvas printer status type
export type CanvasPrinterStatus = 'printing' | 'idle' | 'maintenance' | 'error' | 'sintering'

// FactoryFloorCanvas printer interface
export interface CanvasPrinterUnit {
  id: string
  name: string
  model: string
  status: CanvasPrinterStatus
  progress?: number
  temperature?: number
  currentJob?: string
  position: { x: number; y: number }
  telemetry?: {
    jobProgress: number
    layersPrinted: number
    totalLayers: number
    timeRemaining: string
  }
  // Extra fields for site filtering
  siteId?: string
  siteName?: string
}

/**
 * Convert product line to printer model name
 */
export function productLineToModel(productLine: string): PrinterUnit['model'] {
  switch (productLine) {
    case 'Shop':
      return 'Shop System'
    case 'Studio':
      return 'Studio System'
    case 'InnX':
      return 'InnoventX'
    default:
      return 'Studio System'
  }
}

/**
 * Get a random simulated status for demo purposes
 */
export function getSimulatedStatus(): PrinterStatus {
  const statuses: PrinterStatus[] = ['idle', 'working', 'idle', 'working', 'calibrating', 'offline', 'error']
  return statuses[Math.floor(Math.random() * statuses.length)]
}

/**
 * Map TacticalMap status to FactoryFloorCanvas status
 */
export function mapStatusToCanvas(status: PrinterStatus): CanvasPrinterStatus {
  switch (status) {
    case 'idle':
      return 'idle'
    case 'working':
      return 'printing'
    case 'error':
      return 'error'
    case 'offline':
      return 'maintenance'
    case 'calibrating':
      return 'sintering'
    default:
      return 'idle'
  }
}

/**
 * Convert Sites array to TacticalMap PrinterUnits
 * Used by GodModeDashboard and TacticalView
 */
export function sitesToPrinterUnits(sites: Site[]): PrinterUnit[] {
  const printers: PrinterUnit[] = []

  sites.forEach((site) => {
    if (!site.printers) return

    site.printers.forEach((printer) => {
      const status = getSimulatedStatus()
      const isWorking = status === 'working'

      printers.push({
        id: printer.serialNumber,
        name: `${printer.productLine} ${printer.serialNumber}`,
        model: productLineToModel(printer.productLine),
        status,
        position: {
          // Position will be calculated by consumer
          x: 0,
          y: 0,
        },
        labId: site.id,
        labName: site.name,
        jobProgress: isWorking ? Math.floor(Math.random() * 100) : null,
        jobName: isWorking ? 'Active Job' : null,
        health: {
          temperature: status === 'offline' ? 0 : 150 + Math.floor(Math.random() * 100),
          humidity: status === 'offline' ? 0 : 40 + Math.floor(Math.random() * 20),
          uptime: Math.floor(Math.random() * 2000),
          errorCount: status === 'error' ? Math.floor(Math.random() * 5) + 1 : 0,
        },
        capabilities: {
          canPrint: status !== 'offline' && status !== 'error',
          canQueue: status !== 'offline',
          canCalibrate: status !== 'offline',
        },
        lastPing: status === 'offline' ? new Date(Date.now() - 3600000) : new Date(),
      })
    })
  })

  return printers
}

/**
 * Convert Sites array directly to FactoryFloorCanvas format
 * Used by FactoryFloorCanvas when receiving sites prop
 */
export function sitesToCanvasPrinters(sites: Site[]): CanvasPrinterUnit[] {
  const printers: CanvasPrinterUnit[] = []

  sites.forEach((site) => {
    if (!site.printers) return

    site.printers.forEach((printer) => {
      const status = getSimulatedStatus()
      const canvasStatus = mapStatusToCanvas(status)
      const isActive = canvasStatus === 'printing' || canvasStatus === 'sintering'
      const progress = isActive ? Math.floor(Math.random() * 100) : undefined
      const totalLayers = 4250
      const layersPrinted = progress ? Math.floor((progress / 100) * totalLayers) : 0

      printers.push({
        id: printer.serialNumber,
        name: `${printer.productLine} ${printer.serialNumber}`,
        model: productLineToModel(printer.productLine),
        status: canvasStatus,
        progress,
        temperature: status === 'offline' ? 25 : 150 + Math.floor(Math.random() * 100),
        currentJob: isActive ? 'Active Job' : status === 'error' ? 'ERROR: Fault Detected' : undefined,
        position: { x: 0, y: 0 }, // Will be calculated by calculateGridPositions
        telemetry: isActive
          ? {
              jobProgress: progress!,
              layersPrinted,
              totalLayers,
              timeRemaining: `${Math.floor(Math.random() * 4)}h ${Math.floor(Math.random() * 60)}m`,
            }
          : undefined,
        siteId: site.id,
        siteName: site.name,
      })
    })
  })

  return printers
}

/**
 * Calculate grid positions for printers on canvas
 * Arranges printers in a responsive grid layout
 */
export function calculateGridPositions(
  printers: CanvasPrinterUnit[],
  config?: {
    cardWidth?: number
    cardHeight?: number
    gap?: number
    offsetX?: number
    offsetY?: number
    maxColumns?: number
  }
): CanvasPrinterUnit[] {
  const {
    cardWidth = 280,
    cardHeight = 200,
    gap = 20,
    offsetX = 80,
    offsetY = 80,
    maxColumns = 3,
  } = config || {}

  const columns = Math.min(maxColumns, printers.length)

  return printers.map((printer, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)

    return {
      ...printer,
      position: {
        x: offsetX + col * (cardWidth + gap),
        y: offsetY + row * (cardHeight + gap),
      },
    }
  })
}

/**
 * Get unique sites from an array of canvas printers
 */
export function getUniqueSites(printers: CanvasPrinterUnit[]): Array<{ id: string; name: string }> {
  const siteMap = new Map<string, string>()

  printers.forEach((printer) => {
    if (printer.siteId && printer.siteName && !siteMap.has(printer.siteId)) {
      siteMap.set(printer.siteId, printer.siteName)
    }
  })

  return Array.from(siteMap.entries()).map(([id, name]) => ({ id, name }))
}

/**
 * Filter printers by site ID
 */
export function filterPrintersBySite(
  printers: CanvasPrinterUnit[],
  siteId: string | null
): CanvasPrinterUnit[] {
  if (!siteId) return printers
  return printers.filter((p) => p.siteId === siteId)
}
