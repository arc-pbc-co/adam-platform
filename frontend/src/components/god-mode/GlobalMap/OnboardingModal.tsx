/**
 * OnboardingModal - Modal for initiating ADAM onboarding workflow
 *
 * Shows selected sites with scheduling options and contact notification.
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Rocket,
  Building2,
  Printer,
  Calendar,
  Clock,
  ListOrdered,
  Mail,
  AlertTriangle,
} from 'lucide-react'
import type { Site } from './types'
import { TIER_COLORS } from './types'
import type { OnboardingRequest } from '../../../types/onboarding'
import styles from './OnboardingModal.module.css'

interface OnboardingModalProps {
  isOpen: boolean
  sites: Site[]
  onClose: () => void
  onConfirm: (request: OnboardingRequest) => void
  isLoading?: boolean
}

type ScheduleType = 'immediate' | 'scheduled' | 'queue'

export function OnboardingModal({
  isOpen,
  sites,
  onClose,
  onConfirm,
  isLoading = false,
}: OnboardingModalProps) {
  const [scheduleType, setScheduleType] = useState<ScheduleType>('immediate')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('09:00')
  const [notifyContacts, setNotifyContacts] = useState(true)

  // Calculate totals
  const totalPrinters = useMemo(
    () => sites.reduce((sum, s) => sum + s.installations, 0),
    [sites]
  )

  const sitesWithContacts = useMemo(
    () => sites.filter((s) => s.contactEmail),
    [sites]
  )

  const tierBreakdown = useMemo(() => {
    return {
      A: sites.filter((s) => s.priorityTier === 'A').length,
      B: sites.filter((s) => s.priorityTier === 'B').length,
      C: sites.filter((s) => s.priorityTier === 'C').length,
    }
  }, [sites])

  // Get min date for scheduling (today)
  const minDate = useMemo(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }, [])

  const handleConfirm = () => {
    let scheduledDateTime: string | undefined

    if (scheduleType === 'scheduled' && scheduledDate) {
      const dateTime = new Date(`${scheduledDate}T${scheduledTime}`)
      scheduledDateTime = dateTime.toISOString()
    }

    const request: OnboardingRequest = {
      siteIds: sites.map((s) => s.id),
      priority: scheduleType,
      scheduledDate: scheduledDateTime,
      notifyContacts,
    }

    onConfirm(request)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.modal}
          data-augmented-ui="tl-clip tr-clip br-clip bl-clip border"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.headerTitle}>
              <Rocket size={20} className={styles.headerIcon} />
              <h2>ADAM ONBOARDING</h2>
            </div>
            <button
              className={styles.closeBtn}
              onClick={onClose}
              disabled={isLoading}
            >
              <X size={18} />
            </button>
          </header>

          {/* Summary Stats */}
          <div className={styles.summary}>
            <div className={styles.summaryItem}>
              <Building2 size={16} />
              <span className={styles.summaryValue}>{sites.length}</span>
              <span className={styles.summaryLabel}>Sites</span>
            </div>
            <div className={styles.summaryItem}>
              <Printer size={16} />
              <span className={styles.summaryValue}>{totalPrinters}</span>
              <span className={styles.summaryLabel}>Printers</span>
            </div>
            <div className={styles.tierBreakdown}>
              {tierBreakdown.A > 0 && (
                <span className={styles.tierBadge} style={{ background: TIER_COLORS.A }}>
                  {tierBreakdown.A} Tier A
                </span>
              )}
              {tierBreakdown.B > 0 && (
                <span className={styles.tierBadge} style={{ background: TIER_COLORS.B }}>
                  {tierBreakdown.B} Tier B
                </span>
              )}
              {tierBreakdown.C > 0 && (
                <span className={styles.tierBadge} style={{ background: TIER_COLORS.C }}>
                  {tierBreakdown.C} Tier C
                </span>
              )}
            </div>
          </div>

          {/* Site List */}
          <div className={styles.siteList}>
            <h3>Selected Sites</h3>
            <div className={styles.siteListScroll}>
              {sites.map((site) => (
                <div key={site.id} className={styles.siteItem}>
                  <span
                    className={styles.tierDot}
                    style={{ background: TIER_COLORS[site.priorityTier] }}
                  />
                  <div className={styles.siteInfo}>
                    <span className={styles.siteName}>{site.name}</span>
                    <span className={styles.siteLocation}>
                      {site.city}, {site.state}
                    </span>
                  </div>
                  <span className={styles.printerCount}>
                    {site.installations} printer{site.installations !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Options */}
          <div className={styles.scheduleSection}>
            <h3>Schedule</h3>
            <div className={styles.scheduleOptions}>
              <label
                className={`${styles.scheduleOption} ${
                  scheduleType === 'immediate' ? styles.selected : ''
                }`}
              >
                <input
                  type="radio"
                  name="schedule"
                  value="immediate"
                  checked={scheduleType === 'immediate'}
                  onChange={() => setScheduleType('immediate')}
                />
                <Clock size={18} />
                <div className={styles.optionContent}>
                  <span className={styles.optionTitle}>Immediate</span>
                  <span className={styles.optionDesc}>Start onboarding now</span>
                </div>
              </label>

              <label
                className={`${styles.scheduleOption} ${
                  scheduleType === 'scheduled' ? styles.selected : ''
                }`}
              >
                <input
                  type="radio"
                  name="schedule"
                  value="scheduled"
                  checked={scheduleType === 'scheduled'}
                  onChange={() => setScheduleType('scheduled')}
                />
                <Calendar size={18} />
                <div className={styles.optionContent}>
                  <span className={styles.optionTitle}>Scheduled</span>
                  <span className={styles.optionDesc}>Pick a date and time</span>
                </div>
              </label>

              <label
                className={`${styles.scheduleOption} ${
                  scheduleType === 'queue' ? styles.selected : ''
                }`}
              >
                <input
                  type="radio"
                  name="schedule"
                  value="queue"
                  checked={scheduleType === 'queue'}
                  onChange={() => setScheduleType('queue')}
                />
                <ListOrdered size={18} />
                <div className={styles.optionContent}>
                  <span className={styles.optionTitle}>Add to Queue</span>
                  <span className={styles.optionDesc}>Process when capacity available</span>
                </div>
              </label>
            </div>

            {/* Date/Time picker for scheduled */}
            {scheduleType === 'scheduled' && (
              <div className={styles.dateTimePicker}>
                <div className={styles.inputGroup}>
                  <label>Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={minDate}
                    className={styles.dateInput}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Time</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className={styles.timeInput}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notification Option */}
          <div className={styles.notifySection}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={notifyContacts}
                onChange={(e) => setNotifyContacts(e.target.checked)}
              />
              <Mail size={16} />
              <span>
                Notify site contacts via email
                {sitesWithContacts.length < sites.length && (
                  <span className={styles.contactWarning}>
                    ({sitesWithContacts.length}/{sites.length} have contact info)
                  </span>
                )}
              </span>
            </label>
          </div>

          {/* Warning for large batches */}
          {sites.length > 10 && (
            <div className={styles.warning}>
              <AlertTriangle size={16} />
              <span>
                Large batch detected. Consider scheduling during off-peak hours to avoid
                network congestion.
              </span>
            </div>
          )}

          {/* Footer Actions */}
          <footer className={styles.footer}>
            <button
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              className={styles.confirmBtn}
              onClick={handleConfirm}
              disabled={isLoading || (scheduleType === 'scheduled' && !scheduledDate)}
            >
              {isLoading ? (
                <>
                  <span className={styles.spinner} />
                  Starting...
                </>
              ) : (
                <>
                  <Rocket size={16} />
                  {scheduleType === 'immediate'
                    ? 'Start Onboarding'
                    : scheduleType === 'scheduled'
                    ? 'Schedule Onboarding'
                    : 'Add to Queue'}
                </>
              )}
            </button>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default OnboardingModal
