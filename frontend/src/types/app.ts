/**
 * App-wide type definitions
 */

export interface User {
  username: string
  role: string
}

// Re-export Site type from GlobalMap for consistency
export type { Site } from '../components/god-mode/GlobalMap/types'

export type AppView = 'marketing' | 'login' | 'godmode' | 'platform'
