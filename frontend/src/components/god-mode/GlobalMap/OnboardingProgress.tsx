/**
 * OnboardingProgress - Real-time onboarding progress tracker
 *
 * Shows progress bars and status for each site and printer during onboarding.
 */

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
  Printer,
  Server,
  Zap,
} from 'lucide-react'
import type { Site } from './types'
import type {
  OnboardingStatus,
  OnboardingBatchSummary,
  SiteOnboardingPhase,
  PrinterOnboardingPhase,
} from '../../../types/onboarding'
import styles from './OnboardingProgress.module.css'

interface OnboardingProgressProps {
  isOpen: boolean
  sites: Site[]
  statusBySite: Map<string, OnboardingStatus>
  batchSummary: OnboardingBatchSummary | null
  isConnected: boolean
  onClose: () => void
  onRetry: (siteIds: string[]) => void
  onCancel: () => void
}

// Map status to display info
const SITE_STATUS_CONFIG: Record<
  SiteOnboardingPhase,
  { label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  pending: { label: 'Pending', color: 'var(--god-steel-500)', icon: Loader2 },
  connecting: { label: 'Connecting', color: 'var(--god-primary-400)', icon: Wifi },
  configuring: { label: 'Configuring', color: 'var(--god-vespene-400)', icon: Server },
  testing: { label: 'Testing', color: 'var(--god-warning-400)', icon: Zap },
  online: { label: 'Online', color: 'var(--god-success-400)', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'var(--god-danger-400)', icon: XCircle },
}

const PRINTER_STATUS_CONFIG: Record<
  PrinterOnboardingPhase,
  { label: string; color: string }
> = {
  pending: { label: 'Pending', color: 'var(--god-steel-500)' },
  discovered: { label: 'Discovered', color: 'var(--god-primary-400)' },
  configuring: { label: 'Configuring', color: 'var(--god-vespene-400)' },
  online: { label: 'Online', color: 'var(--god-success-400)' },
  failed: { label: 'Failed', color: 'var(--god-danger-400)' },
}

export function OnboardingProgress({
  isOpen,
  sites,
  statusBySite,
  batchSummary,
  isConnected,
  onClose,
  onRetry,
  onCancel,
}: OnboardingProgressProps) {
  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (batchSummary) return batchSummary.overallProgress

    let totalProgress = 0
    statusBySite.forEach((status) => {
      totalProgress += status.progress
    })
    return sites.length > 0 ? Math.round(totalProgress / sites.length) : 0
  }, [statusBySite, batchSummary, sites.length])

  // Get counts
  const completedCount = useMemo(() => {
    return Array.from(statusBySite.values()).filter((s) => s.status === 'online').length
  }, [statusBySite])

  const failedCount = useMemo(() => {
    return Array.from(statusBySite.values()).filter((s) => s.status === 'failed').length
  }, [statusBySite])

  const failedSiteIds = useMemo(() => {
    return Array.from(statusBySite.entries())
      .filter(([, status]) => status.status === 'failed')
      .map(([id]) => id)
  }, [statusBySite])

  const isComplete = completedCount + failedCount === sites.length
  const hasFailures = failedCount > 0

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className={styles.panel}
          data-augmented-ui="tl-clip tr-clip br-clip bl-clip border"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.headerTitle}>
              <h2>ADAM NETWORK ONBOARDING</h2>
              <span className={styles.statusBadge}>
                {completedCount} / {sites.length} Complete
              </span>
            </div>

            <div className={styles.headerRight}>
              {/* Connection status */}
              <div className={`${styles.connectionStatus} ${isConnected ? styles.connected : ''}`}>
                {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                <span>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
              </div>
              <button className={styles.closeBtn} onClick={onClose}>
                <X size={18} />
              </button>
            </div>
          </header>

          {/* Overall Progress */}
          <div className={styles.overallProgress}>
            <div className={styles.progressHeader}>
              <span>Overall Progress</span>
              <span className={styles.progressPercent}>{overallProgress}%</span>
            </div>
            <div className={styles.progressTrack}>
              <motion.div
                className={`${styles.progressFill} ${hasFailures ? styles.hasFailures : ''}`}
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Sites List */}
          <div className={styles.sitesList}>
            {sites.map((site) => {
              const status = statusBySite.get(site.id)
              const statusConfig = status ? SITE_STATUS_CONFIG[status.status] : SITE_STATUS_CONFIG.pending
              const StatusIcon = statusConfig.icon
              const isAnimating = status?.status === 'connecting' || status?.status === 'configuring' || status?.status === 'testing'

              return (
                <div
                  key={site.id}
                  className={`${styles.siteItem} ${styles[status?.status || 'pending']}`}
                >
                  {/* Site Header */}
                  <div className={styles.siteHeader}>
                    <div className={styles.siteStatus} style={{ color: statusConfig.color }}>
                      <StatusIcon
                        size={16}
                        className={isAnimating ? styles.spinning : ''}
                      />
                    </div>
                    <div className={styles.siteInfo}>
                      <span className={styles.siteName}>{site.name}</span>
                      <span className={styles.siteLocation}>
                        {site.city}, {site.state}
                      </span>
                    </div>
                    <span
                      className={styles.siteStatusLabel}
                      style={{ color: statusConfig.color }}
                    >
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Site Progress Bar */}
                  <div className={styles.siteProgress}>
                    <div className={styles.progressTrack}>
                      <motion.div
                        className={styles.progressFill}
                        style={{
                          background:
                            status?.status === 'failed'
                              ? 'var(--god-danger-500)'
                              : status?.status === 'online'
                              ? 'var(--god-success-500)'
                              : 'var(--god-primary-500)',
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${status?.progress || 0}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>

                  {/* Status Message */}
                  {status?.message && (
                    <p className={styles.statusMessage}>{status.message}</p>
                  )}

                  {/* Error Message with Retry */}
                  {status?.error && (
                    <div className={styles.errorMessage}>
                      <span>{status.error.message}</span>
                      {status.error.retryable && (
                        <button
                          className={styles.retryBtn}
                          onClick={() => onRetry([site.id])}
                        >
                          <RefreshCw size={12} />
                          Retry
                        </button>
                      )}
                    </div>
                  )}

                  {/* Printer List */}
                  {status?.printers && status.printers.length > 0 && (
                    <div className={styles.printerList}>
                      {status.printers.map((printer) => {
                        const printerConfig = PRINTER_STATUS_CONFIG[printer.status]
                        return (
                          <div key={printer.printerId} className={styles.printerItem}>
                            <Printer size={12} style={{ color: printerConfig.color }} />
                            <span className={styles.printerSerial}>{printer.serialNumber}</span>
                            <span className={styles.productLine}>{printer.productLine}</span>
                            <div className={styles.connectionIndicators}>
                              <span
                                className={`${styles.indicator} ${
                                  printer.mqttConnected ? styles.connected : ''
                                }`}
                              >
                                MQTT
                              </span>
                              <span
                                className={`${styles.indicator} ${
                                  printer.intersectRegistered ? styles.connected : ''
                                }`}
                              >
                                INTERSECT
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <footer className={styles.footer}>
            {!isComplete ? (
              <>
                <button className={styles.cancelBtn} onClick={onCancel}>
                  Cancel Onboarding
                </button>
                <button className={styles.backgroundBtn} onClick={onClose}>
                  Run in Background
                </button>
              </>
            ) : (
              <>
                {hasFailures && (
                  <button
                    className={styles.retryAllBtn}
                    onClick={() => onRetry(failedSiteIds)}
                  >
                    <RefreshCw size={14} />
                    Retry Failed ({failedCount})
                  </button>
                )}
                <button className={styles.completeBtn} onClick={onClose}>
                  {hasFailures ? 'Close' : 'Complete'}
                </button>
              </>
            )}
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default OnboardingProgress
