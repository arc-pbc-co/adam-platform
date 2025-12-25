/**
 * Types for ADAM site onboarding workflow
 */

/**
 * Onboarding request sent to start the workflow
 */
export interface OnboardingRequest {
  siteIds: string[]
  scheduledDate?: string // ISO date string for scheduled onboarding
  priority: 'immediate' | 'scheduled' | 'queue'
  notifyContacts: boolean
}

/**
 * Response from starting an onboarding batch
 */
export interface OnboardingResponse {
  batchId: string
  siteIds: string[]
  estimatedDuration: number // minutes
  queuePosition?: number // if queued
  message: string
}

/**
 * Site onboarding status (updated via MQTT)
 */
export type SiteOnboardingPhase =
  | 'pending'
  | 'connecting'
  | 'configuring'
  | 'testing'
  | 'online'
  | 'failed'

export interface OnboardingStatus {
  siteId: string
  siteName: string
  status: SiteOnboardingPhase
  progress: number // 0-100
  message?: string
  startedAt?: string
  completedAt?: string
  printers: PrinterOnboardingStatus[]
  error?: {
    code: string
    message: string
    retryable: boolean
  }
}

/**
 * Individual printer onboarding status
 */
export type PrinterOnboardingPhase =
  | 'pending'
  | 'discovered'
  | 'configuring'
  | 'online'
  | 'failed'

export interface PrinterOnboardingStatus {
  printerId: string
  serialNumber: string
  productLine: string
  status: PrinterOnboardingPhase
  mqttConnected: boolean
  intersectRegistered: boolean
  message?: string
  error?: {
    code: string
    message: string
    retryable: boolean
  }
}

/**
 * Batch summary for the entire onboarding operation
 */
export interface OnboardingBatchSummary {
  batchId: string
  totalSites: number
  completedSites: number
  failedSites: number
  totalPrinters: number
  onlinePrinters: number
  failedPrinters: number
  startedAt: string
  estimatedCompletion?: string
  overallProgress: number // 0-100
}

/**
 * MQTT progress event payload
 */
export interface OnboardingProgressEvent {
  batchId: string
  timestamp: string
  type: 'site_update' | 'printer_update' | 'batch_complete' | 'batch_failed'
  payload: OnboardingStatus | OnboardingBatchSummary
}

/**
 * Retry request for failed sites/printers
 */
export interface OnboardingRetryRequest {
  batchId: string
  siteIds?: string[]
  printerIds?: string[]
}
