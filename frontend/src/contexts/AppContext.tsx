/**
 * AppContext - Global application state management
 *
 * Manages:
 * - User authentication state
 * - Current view/route
 * - Onboarded sites data
 */

import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import type { User, Site, AppView } from '../types/app'

// State shape
interface AppState {
  user: User | null
  currentView: AppView
  onboardedSites: Site[]
}

// Actions
type AppAction =
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'NAVIGATE'; payload: AppView }
  | { type: 'SET_ONBOARDED_SITES'; payload: Site[] }
  | { type: 'CLEAR_ONBOARDED_SITES' }

// Initial state
const initialState: AppState = {
  user: null,
  currentView: 'marketing',
  onboardedSites: [],
}

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload,
        currentView: 'godmode',
      }
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        currentView: 'marketing',
        onboardedSites: [],
      }
    case 'NAVIGATE':
      return {
        ...state,
        currentView: action.payload,
      }
    case 'SET_ONBOARDED_SITES':
      return {
        ...state,
        onboardedSites: action.payload,
      }
    case 'CLEAR_ONBOARDED_SITES':
      return {
        ...state,
        onboardedSites: [],
      }
    default:
      return state
  }
}

// Context value type
interface AppContextValue extends AppState {
  login: (user: User) => void
  logout: () => void
  navigateTo: (view: AppView) => void
  onboardSites: (sites: Site[]) => void
  clearOnboardedSites: () => void
}

// Create context
const AppContext = createContext<AppContextValue | null>(null)

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  const login = useCallback((user: User) => {
    dispatch({ type: 'LOGIN', payload: user })
  }, [])

  const logout = useCallback(() => {
    dispatch({ type: 'LOGOUT' })
  }, [])

  const navigateTo = useCallback((view: AppView) => {
    dispatch({ type: 'NAVIGATE', payload: view })
  }, [])

  const onboardSites = useCallback((sites: Site[]) => {
    dispatch({ type: 'SET_ONBOARDED_SITES', payload: sites })
    dispatch({ type: 'NAVIGATE', payload: 'platform' })
  }, [])

  const clearOnboardedSites = useCallback(() => {
    dispatch({ type: 'CLEAR_ONBOARDED_SITES' })
  }, [])

  const value: AppContextValue = {
    ...state,
    login,
    logout,
    navigateTo,
    onboardSites,
    clearOnboardedSites,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// Hook to use app context
export function useAppContext(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}

export { AppContext }
