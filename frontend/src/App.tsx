/**
 * ADAM Platform - Unified App Entry Point
 *
 * Navigation Flow:
 * Marketing Page → Login → God Mode Dashboard → [Onboard] → ADAM Platform
 *
 * All views are managed through the AppContext provider which handles:
 * - User authentication state
 * - Current view routing
 * - Onboarded sites data persistence
 */

import { GodModeDashboard } from './components/god-mode'
import { LoginScreen } from './components/LoginScreen'
import { MarketingPage } from './components/MarketingPage'
import { IDEPlatform } from './components/IDEPlatform'
import { WebSocketProvider } from './contexts/WebSocketContext'
import { AppProvider, useAppContext } from './contexts/AppContext'
import './styles/god-mode-theme.css'

/**
 * AppRouter - Handles view switching based on current state
 */
function AppRouter() {
  const {
    currentView,
    user,
    onboardedSites,
    login,
    logout,
    navigateTo,
    onboardSites,
  } = useAppContext()

  switch (currentView) {
    case 'marketing':
      return (
        <MarketingPage
          onOpenPlatform={() => navigateTo('login')}
        />
      )

    case 'login':
      return (
        <LoginScreen
          onLogin={login}
          onBack={() => navigateTo('marketing')}
        />
      )

    case 'godmode':
      return (
        <GodModeDashboard
          onOnboardComplete={onboardSites}
          onBack={() => navigateTo('marketing')}
          onLogout={logout}
        />
      )

    case 'platform':
      return (
        <IDEPlatform
          onBack={() => navigateTo('godmode')}
          user={user}
          sites={onboardedSites}
        />
      )

    default:
      return (
        <MarketingPage
          onOpenPlatform={() => navigateTo('login')}
        />
      )
  }
}

/**
 * App - Root component with providers
 */
function App() {
  return (
    <AppProvider>
      <WebSocketProvider>
        <AppRouter />
      </WebSocketProvider>
    </AppProvider>
  )
}

export default App
