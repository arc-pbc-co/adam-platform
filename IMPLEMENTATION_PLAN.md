# ADAM Platform Navigation Restructure - Implementation Plan

## Overview

This plan restructures the ADAM platform navigation flow to:
1. **Landing Page**: Marketing webpage (`/App.tsx`) as the main entry point
2. **God Mode Dashboard**: Global network map for site selection and onboarding
3. **ADAM Platform**: Old IDE-style platform with AI experiments, Agent Canvas, Nova Terminal, and Factory Floor

## Current Architecture

### Two Separate Frontends
1. **Root Frontend** (`/App.tsx`) - Marketing site with Tailwind CSS
   - Marketing landing page with hero video
   - Login flow → IDEPlatform
   - Components: `AdamTerminal`, `PerformanceChart`, `ProductShowcase`, `IDEPlatform`, `LoginScreen`

2. **God Mode Frontend** (`/frontend/src/App.tsx`) - StarCraft-inspired UI
   - `GodModeDashboard` with Global Map and Tactical View
   - Uses augmented-ui, D3.js, God Mode design tokens
   - Has existing onboarding flow in `GlobalMap.tsx`

### Key Files
| File | Purpose |
|------|---------|
| `/App.tsx` | Marketing landing page |
| `/components/IDEPlatform.tsx` | Old ADAM platform (experiments, agents, hardware) |
| `/components/LoginScreen.tsx` | Authentication screen |
| `/frontend/src/App.tsx` | God Mode entry point |
| `/frontend/src/components/god-mode/GodModeDashboard.tsx` | Main God Mode dashboard |
| `/frontend/src/components/god-mode/GlobalMap/GlobalMap.tsx` | D3 map with site selection |

---

## Proposed Navigation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MARKETING LANDING PAGE                              │
│                           /App.tsx (root)                                    │
│                                                                              │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────────────┐ │
│   │ MISSION  │    │ADAM CORE │    │ HARDWARE │    │     PLATFORM BTN     │ │
│   │ section  │    │ section  │    │ section  │    │  (triggers login)    │ │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┬───────────┘ │
└──────────────────────────────────────────────────────────────┼──────────────┘
                                                               │
                                                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             LOGIN SCREEN                                     │
│                        /components/LoginScreen.tsx                           │
│                                                                              │
│                     ┌──────────────────────────┐                            │
│                     │   Demo Login Form        │                            │
│                     │   (username/password)    │                            │
│                     └───────────┬──────────────┘                            │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │ On successful login
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GOD MODE DASHBOARD                                   │
│              /frontend/src/components/god-mode/GodModeDashboard.tsx          │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  RESOURCE BAR: Compute | Tokens | Jobs | Agents | Experiments       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌──────────────────┐  ┌─────────────────────────────────────────────┐     │
│   │   TAB: GLOBAL    │  │   TAB: TACTICAL                             │     │
│   │   (active)       │  │   (secondary)                               │     │
│   └────────┬─────────┘  └─────────────────────────────────────────────┘     │
│            │                                                                 │
│            ▼                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      GLOBAL NETWORK MAP                             │   │
│   │  • D3.js US map with site locations                                 │   │
│   │  • Click/drag to select sites                                       │   │
│   │  • Selection queue in sidebar                                       │   │
│   │  • Site detail panel on hover/click                                 │   │
│   │                                                                     │   │
│   │  ┌─────────────────────────────────────────────────────────────┐   │   │
│   │  │  SELECTION QUEUE                                             │   │   │
│   │  │  ☑ Site A - Burlington, VT                                  │   │   │
│   │  │  ☑ Site B - Pittsburgh, PA                                  │   │   │
│   │  │  ☑ Site C - Austin, TX                                      │   │   │
│   │  │                                                              │   │   │
│   │  │  ┌────────────────────────────────────────────────────────┐ │   │   │
│   │  │  │         🚀 ONBOARD SELECTED SITES (3)                  │ │   │   │
│   │  │  │         Opens Onboarding Modal → Navigates to ADAM     │ │   │   │
│   │  │  └────────────────────────────────────────────────────────┘ │   │   │
│   │  └─────────────────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌───────────────────┐    ┌───────────────────────────────────────────┐    │
│   │ MINIMAP (bottom-  │    │ COMMAND PANEL (bottom-right)               │    │
│   │  left corner)     │    │ SELECT ALL | CLEAR | GROUP | FILTER        │    │
│   └───────────────────┘    └───────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ On "Onboard" click (after confirmation)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ADAM PLATFORM (IDE)                                │
│                        /components/IDEPlatform.tsx                           │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  TOP BAR: Back | ADAM Platform | Project Selector | View Toggle     │   │
│   │           [Agents] [Hardware]    | Tokens | Time | Notifications    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────┐ ┌─────────────────────────────────────┐ ┌─────────────┐   │
│   │ LEFT PANEL  │ │         MAIN CANVAS AREA            │ │ RIGHT PANEL │   │
│   │             │ │                                     │ │  (details)  │   │
│   │ [Chat]      │ │  AGENTS VIEW:                       │ │             │   │
│   │ [Experiments│ │  - FlowchartCanvas                  │ │ Node Info   │   │
│   │ [Config]    │ │  - Agent workflow visualization     │ │ Status      │   │
│   │             │ │                                     │ │ Duration    │   │
│   │ Nova Chat   │ │  HARDWARE VIEW:                     │ │ Tokens      │   │
│   │ Interface   │ │  - FactoryFloorCanvas               │ │             │   │
│   │             │ │  - Printer fleet visualization      │ │             │   │
│   │             │ │  - Job queue, materials DB          │ │             │   │
│   └─────────────┘ └─────────────────────────────────────┘ └─────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  BOTTOM PANEL: [Terminal] [Debug Console]                           │   │
│   │  Nova orchestrator output, agent logs, system status                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  STATUS BAR: Connected | 5 agents | 13 printers | Errors | Warnings │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Unified Router Setup

**Goal**: Create a single entry point that manages navigation between Marketing → God Mode → ADAM Platform

#### 1.1 Create Unified App Shell

Create a new unified App component that manages all views:

**File**: `/frontend/src/App.tsx` (modify existing)

```tsx
type AppView = 'marketing' | 'login' | 'godmode' | 'platform';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('marketing');
  const [user, setUser] = useState<User | null>(null);
  const [onboardedSites, setOnboardedSites] = useState<Site[]>([]);

  const handleLogin = (user: User) => {
    setUser(user);
    setCurrentView('godmode');
  };

  const handleOnboardComplete = (sites: Site[]) => {
    setOnboardedSites(sites);
    setCurrentView('platform');
  };

  switch (currentView) {
    case 'marketing':
      return <MarketingPage onOpenPlatform={() => setCurrentView('login')} />;
    case 'login':
      return <LoginScreen onLogin={handleLogin} onBack={() => setCurrentView('marketing')} />;
    case 'godmode':
      return (
        <GodModeDashboard
          onOnboardComplete={handleOnboardComplete}
          onBack={() => setCurrentView('marketing')}
        />
      );
    case 'platform':
      return (
        <IDEPlatform
          onBack={() => setCurrentView('godmode')}
          user={user}
          sites={onboardedSites}
        />
      );
  }
}
```

#### 1.2 Move Marketing Page to Component

Extract the marketing page from root `/App.tsx` into a reusable component:

**File**: `/frontend/src/components/MarketingPage.tsx`

```tsx
interface MarketingPageProps {
  onOpenPlatform: () => void;
}

export function MarketingPage({ onOpenPlatform }: MarketingPageProps) {
  // Move all marketing page content here
  // Keep existing NavBar, Hero, Sections, Footer
}
```

---

### Phase 2: Onboard Button Integration

**Goal**: Connect the GlobalMap's onboarding flow to navigate to ADAM Platform

#### 2.1 Modify GlobalMap Onboarding Handler

**File**: `/frontend/src/components/god-mode/GlobalMap/GlobalMap.tsx`

Current `handleConfirmOnboarding`:
```tsx
const handleConfirmOnboarding = useCallback(async (request: OnboardingRequest) => {
  setSelectedIds(new Set())
  // ... clears selection
}, [startOnboarding])
```

Modified to navigate after onboarding:
```tsx
interface GlobalMapProps {
  onOnboardComplete?: (sites: Site[]) => void;
}

const handleConfirmOnboarding = useCallback(async (request: OnboardingRequest) => {
  const selectedSites = sites.filter(s => selectedIds.has(s.id));

  // Start the onboarding process
  await startOnboarding(request);

  // Clear selection
  setSelectedIds(new Set());
  setShowOnboardingModal(false);

  // Navigate to ADAM Platform with onboarded sites
  onOnboardComplete?.(selectedSites);
}, [startOnboarding, selectedIds, sites, onOnboardComplete])
```

#### 2.2 Update GodModeDashboard

**File**: `/frontend/src/components/god-mode/GodModeDashboard.tsx`

```tsx
interface GodModeDashboardProps {
  onOnboardComplete?: (sites: Site[]) => void;
  onBack?: () => void;
}

export function GodModeDashboard({ onOnboardComplete, onBack }: GodModeDashboardProps) {
  // Pass onOnboardComplete to GlobalMap
  return (
    <GodModeLayout>
      {viewMode === 'global' ? (
        <GlobalMap onOnboardComplete={onOnboardComplete} />
      ) : (
        <TacticalView />
      )}
    </GodModeLayout>
  );
}
```

---

### Phase 3: Style Migration to God Mode Design System

**Goal**: Apply God Mode design tokens to the old ADAM Platform components for visual consistency

#### 3.1 Import God Mode Theme CSS

Add God Mode CSS variables to IDEPlatform:

**File**: `/frontend/src/components/IDEPlatform/IDEPlatform.tsx`

```tsx
import '../../styles/god-mode-theme.css';
```

#### 3.2 Map Existing Colors to Design Tokens

| Old Tailwind Class | God Mode Token |
|-------------------|----------------|
| `bg-[#0a0a0a]` | `var(--bg-primary)` → `#0a0e14` |
| `bg-[#0f0f0f]` | `var(--bg-secondary)` → `#121a24` |
| `bg-[#1a1a1a]` | `var(--bg-tertiary)` → `#1a2532` |
| `bg-[#2a2a2a]` | `var(--bg-elevated)` → `#222d3a` |
| `border-[#2a2a2a]` | `var(--border-subtle)` → `rgba(0, 212, 255, 0.15)` |
| `text-gray-400` | `var(--text-secondary)` → `#8899aa` |
| `text-gray-500` | `var(--text-tertiary)` → `#667788` |
| `bg-blue-500` | `var(--accent-primary)` → `#00d4ff` |
| `bg-green-500` | `var(--accent-secondary)` → `#00ff88` |
| `bg-yellow-500` | `var(--accent-warning)` → `#ffaa00` |
| `bg-red-500` | `var(--accent-danger)` → `#ff3366` |

#### 3.3 Add Augmented-UI Styling

Apply augmented-ui corners to major panels:

```tsx
// Panel wrapper component
<div
  className="panel"
  data-augmented-ui="tl-clip br-clip border"
  style={{
    '--aug-tl': '12px',
    '--aug-br': '12px',
    '--aug-border-all': '1px',
    '--aug-border-bg': 'var(--border-subtle)',
  } as React.CSSProperties}
>
  {/* Panel content */}
</div>
```

#### 3.4 Typography Updates

Replace font stack with God Mode fonts:

```css
/* In god-mode-theme.css or component styles */
.ide-platform {
  font-family: var(--font-body); /* 'Exo 2' */
}

.ide-platform h1,
.ide-platform h2,
.ide-platform h3 {
  font-family: var(--font-display); /* 'Orbitron' */
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
}

.ide-platform code,
.ide-platform .terminal {
  font-family: var(--font-mono); /* 'JetBrains Mono' */
}
```

---

### Phase 4: Component Integration

#### 4.1 Create IDEPlatform Module in God Mode

Move IDEPlatform to the God Mode component structure:

```
/frontend/src/components/
├── god-mode/
│   ├── GodModeDashboard.tsx
│   ├── GlobalMap/
│   ├── TacticalView/
│   └── IDEPlatform/           # NEW - moved from root
│       ├── IDEPlatform.tsx
│       ├── IDEPlatform.module.css
│       ├── AgentCanvas/
│       │   ├── FlowchartCanvas.tsx
│       │   └── AgentNode.tsx
│       ├── HardwareCanvas/
│       │   └── FactoryFloorCanvas.tsx
│       ├── NovaTerminal/
│       │   └── Terminal.tsx
│       └── ExperimentPanel/
│           └── ExperimentList.tsx
```

#### 4.2 Add Back Navigation to God Mode

Add a "Back to Network" button in IDEPlatform header:

```tsx
<header className="resource-bar">
  <button
    onClick={onBack}
    className="back-button"
    data-augmented-ui="tl-clip br-clip border"
  >
    <ArrowLeft size={16} />
    <span>NETWORK</span>
  </button>
  {/* ... rest of header */}
</header>
```

#### 4.3 Pass Site Context to ADAM Platform

The onboarded sites should be available in the ADAM Platform:

```tsx
interface IDEPlatformProps {
  onBack: () => void;
  user?: User;
  sites?: Site[];  // Newly onboarded sites
}

export function IDEPlatform({ onBack, user, sites }: IDEPlatformProps) {
  // Use sites to:
  // - Pre-populate printer fleet in FactoryFloorCanvas
  // - Show connected sites in status bar
  // - Filter experiments by site
}
```

---

### Phase 5: Shared State Management

#### 5.1 Create Context for App State

**File**: `/frontend/src/contexts/AppContext.tsx`

```tsx
interface AppState {
  user: User | null;
  currentView: AppView;
  onboardedSites: Site[];
  selectedSiteId: string | null;
}

interface AppContextValue extends AppState {
  login: (user: User) => void;
  logout: () => void;
  navigateTo: (view: AppView) => void;
  onboardSites: (sites: Site[]) => void;
  selectSite: (siteId: string) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // ... implementation

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}
```

#### 5.2 WebSocket Context Updates

The existing `WebSocketProvider` should be lifted to the root level to maintain connections across views.

---

## File Changes Summary

### Files to Create
| File | Purpose |
|------|---------|
| `/frontend/src/components/MarketingPage.tsx` | Extracted marketing landing page |
| `/frontend/src/contexts/AppContext.tsx` | Shared app state management |
| `/frontend/src/components/god-mode/IDEPlatform/` | Relocated ADAM Platform |

### Files to Modify
| File | Changes |
|------|---------|
| `/frontend/src/App.tsx` | Add view router, import MarketingPage |
| `/frontend/src/components/god-mode/GodModeDashboard.tsx` | Add `onOnboardComplete` prop |
| `/frontend/src/components/god-mode/GlobalMap/GlobalMap.tsx` | Navigate after onboarding |
| `/frontend/src/styles/god-mode-theme.css` | Ensure all tokens available |

### Files to Move
| From | To |
|------|-----|
| `/components/IDEPlatform.tsx` | `/frontend/src/components/god-mode/IDEPlatform/` |
| `/components/FlowchartCanvas.tsx` | `/frontend/src/components/god-mode/IDEPlatform/AgentCanvas/` |
| `/components/FactoryFloorCanvas.tsx` | `/frontend/src/components/god-mode/IDEPlatform/HardwareCanvas/` |
| `/components/LoginScreen.tsx` | `/frontend/src/components/LoginScreen/` |

---

## Design Consistency Checklist

### Color System
- [ ] Replace all `bg-[#...]` with CSS variables
- [ ] Replace all `text-gray-*` with `--text-*` tokens
- [ ] Use `--accent-*` colors for interactive elements
- [ ] Apply `--glow-*` effects to active/selected states

### Typography
- [ ] Import Google Fonts (Orbitron, Exo 2, JetBrains Mono)
- [ ] Apply `--font-display` to headers
- [ ] Apply `--font-body` to body text
- [ ] Apply `--font-mono` to code/terminal

### Components
- [ ] Add `data-augmented-ui` to major panels
- [ ] Use `--aug-clip-*` sizes consistently
- [ ] Apply `--border-subtle` to panel borders
- [ ] Add `--glow-primary` on hover/focus

### Animations
- [ ] Use `--transition-*` values for consistency
- [ ] Apply `pulse`, `scanLine`, `glowPulse` animations where appropriate
- [ ] Use Framer Motion for view transitions

---

## Dependencies

No new dependencies required. Uses existing:
- `augmented-ui` (already in frontend)
- `framer-motion` (already in both)
- `d3` (already in frontend)
- `lucide-react` (already in both)

---

## Testing Plan

1. **Navigation Flow**
   - Marketing → Login → God Mode → Platform → Back to God Mode
   - Deep linking (future: URL routing)

2. **Onboarding Flow**
   - Select sites on map
   - Click Onboard
   - Confirm in modal
   - Verify navigation to ADAM Platform
   - Verify sites data passed correctly

3. **Visual Consistency**
   - Check all colors match design tokens
   - Verify augmented-ui corners render
   - Test responsive behavior
   - Verify animations/transitions

4. **State Persistence**
   - User session maintained across views
   - WebSocket connection stable
   - Site selection preserved
