import { useState } from 'react'
import { GodModeLayout } from './components/god-mode/GodModeLayout'
import { GlobalMap } from './components/god-mode/GlobalMap'
import { TacticalView } from './components/god-mode/TacticalView'

type ViewMode = 'tactical' | 'labs' | 'install-base'

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('tactical')

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* View Mode Switcher */}
      <nav
        style={{
          display: 'flex',
          gap: '8px',
          padding: '8px 16px',
          background: 'var(--bg-secondary)',
          borderBottom: '2px solid var(--border-default)',
        }}
      >
        <ViewModeButton
          active={viewMode === 'tactical'}
          onClick={() => setViewMode('tactical')}
        >
          Tactical Map
        </ViewModeButton>
        <ViewModeButton
          active={viewMode === 'labs'}
          onClick={() => setViewMode('labs')}
        >
          Labs Network
        </ViewModeButton>
        <ViewModeButton
          active={viewMode === 'install-base'}
          onClick={() => setViewMode('install-base')}
        >
          Install Base Map
        </ViewModeButton>
      </nav>

      {/* Main View */}
      <main style={{ flex: 1, minHeight: 0 }}>
        {viewMode === 'tactical' && <TacticalView />}
        {viewMode === 'labs' && <GodModeLayout />}
        {viewMode === 'install-base' && <GlobalMap />}
      </main>
    </div>
  )
}

interface ViewModeButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function ViewModeButton({ active, onClick, children }: ViewModeButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        background: active
          ? 'color-mix(in srgb, var(--accent-primary) 30%, var(--bg-tertiary))'
          : 'var(--bg-tertiary)',
        border: '1px solid',
        borderColor: active ? 'var(--accent-primary)' : 'var(--border-default)',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-display)',
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {children}
    </button>
  )
}

export default App
