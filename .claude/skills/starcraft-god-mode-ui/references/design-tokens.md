# Design Tokens & Theming

Complete CSS custom properties and theming system for God Mode UI.

## Core Design Tokens

```css
/* design-tokens.css */
:root {
  /* ============================================
     COLOR SYSTEM
     ============================================ */
  
  /* Background layers (darkest to lightest) */
  --bg-void: #050810;
  --bg-primary: #0a0e14;
  --bg-secondary: #121a24;
  --bg-tertiary: #1a2532;
  --bg-elevated: #222d3a;
  --bg-panel: rgba(10, 20, 30, 0.95);
  --bg-overlay: rgba(0, 0, 0, 0.7);
  
  /* Accent colors - inspired by SC2 factions */
  --accent-primary: #00d4ff;      /* Cyan - Protoss energy */
  --accent-secondary: #00ff88;    /* Green - success/online */
  --accent-warning: #ffaa00;      /* Orange - caution */
  --accent-danger: #ff3366;       /* Red - error/critical */
  --accent-purple: #aa44ff;       /* Purple - AI/autonomous */
  --accent-gold: #ffd700;         /* Gold - premium/highlight */
  
  /* Text hierarchy */
  --text-primary: #e4e8ed;
  --text-secondary: #8899aa;
  --text-tertiary: #667788;
  --text-muted: #445566;
  --text-disabled: #334455;
  
  /* Borders */
  --border-subtle: rgba(0, 212, 255, 0.15);
  --border-default: rgba(0, 212, 255, 0.3);
  --border-active: rgba(0, 212, 255, 0.6);
  --border-strong: var(--accent-primary);
  
  /* ============================================
     GLOW EFFECTS
     ============================================ */
  --glow-primary: 0 0 20px rgba(0, 212, 255, 0.4);
  --glow-primary-soft: 0 0 10px rgba(0, 212, 255, 0.2);
  --glow-primary-intense: 0 0 30px rgba(0, 212, 255, 0.6), 0 0 60px rgba(0, 212, 255, 0.3);
  
  --glow-success: 0 0 20px rgba(0, 255, 136, 0.4);
  --glow-warning: 0 0 20px rgba(255, 170, 0, 0.4);
  --glow-danger: 0 0 20px rgba(255, 51, 102, 0.4);
  --glow-purple: 0 0 20px rgba(170, 68, 255, 0.4);
  
  /* ============================================
     TYPOGRAPHY
     ============================================ */
  --font-display: 'Orbitron', 'Audiowide', 'Rajdhani', sans-serif;
  --font-body: 'Exo 2', 'Titillium Web', 'Roboto Condensed', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace;
  
  /* Font sizes */
  --text-xs: 0.675rem;    /* 10.8px */
  --text-sm: 0.75rem;     /* 12px */
  --text-base: 0.875rem;  /* 14px */
  --text-md: 1rem;        /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 2rem;       /* 32px */
  
  /* Line heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
  
  /* Letter spacing */
  --tracking-tight: -0.02em;
  --tracking-normal: 0;
  --tracking-wide: 0.05em;
  --tracking-wider: 0.1em;
  --tracking-widest: 0.15em;
  
  /* ============================================
     SPACING
     ============================================ */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  
  /* ============================================
     LAYOUT
     ============================================ */
  --resource-bar-height: 48px;
  --command-panel-width: 200px;
  --minimap-size: 180px;
  --event-log-height: 200px;
  --panel-padding: var(--space-4);
  --panel-gap: var(--space-2);
  
  /* ============================================
     BORDERS & RADII
     ============================================ */
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 8px;
  
  /* Augmented UI clip sizes */
  --aug-clip-sm: 6px;
  --aug-clip-md: 12px;
  --aug-clip-lg: 20px;
  
  /* ============================================
     SHADOWS
     ============================================ */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
  --shadow-inset: inset 0 2px 4px rgba(0, 0, 0, 0.3);
  
  /* ============================================
     TRANSITIONS
     ============================================ */
  --transition-fast: 0.1s ease;
  --transition-base: 0.2s ease;
  --transition-slow: 0.3s ease;
  --transition-slower: 0.5s ease;
  
  /* ============================================
     Z-INDEX LAYERS
     ============================================ */
  --z-base: 0;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-overlay: 300;
  --z-modal: 400;
  --z-toast: 500;
  --z-tooltip: 600;
}
```

## Google Fonts Import

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Orbitron:wght@400;500;600;700&display=swap" rel="stylesheet">
```

## Base Styles

```css
/* base.css */
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  padding: 0;
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--text-primary);
  background: var(--bg-primary);
  overflow: hidden;
}

/* Selection styling */
::selection {
  background: rgba(0, 212, 255, 0.3);
  color: var(--text-primary);
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
}

::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: var(--radius-sm);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--border-active);
}

/* Focus visible styling */
:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* Button reset */
button {
  font-family: inherit;
  font-size: inherit;
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
}

/* Link reset */
a {
  color: var(--accent-primary);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
```

## Utility Classes

```css
/* utilities.css */

/* Text utilities */
.text-display { font-family: var(--font-display); }
.text-body { font-family: var(--font-body); }
.text-mono { font-family: var(--font-mono); }

.text-xs { font-size: var(--text-xs); }
.text-sm { font-size: var(--text-sm); }
.text-base { font-size: var(--text-base); }
.text-lg { font-size: var(--text-lg); }
.text-xl { font-size: var(--text-xl); }

.text-primary { color: var(--text-primary); }
.text-secondary { color: var(--text-secondary); }
.text-muted { color: var(--text-muted); }
.text-accent { color: var(--accent-primary); }
.text-success { color: var(--accent-secondary); }
.text-warning { color: var(--accent-warning); }
.text-danger { color: var(--accent-danger); }

.uppercase { text-transform: uppercase; }
.tracking-wide { letter-spacing: var(--tracking-wide); }
.tracking-wider { letter-spacing: var(--tracking-wider); }

/* Glow effects */
.glow { box-shadow: var(--glow-primary); }
.glow-success { box-shadow: var(--glow-success); }
.glow-warning { box-shadow: var(--glow-warning); }
.glow-danger { box-shadow: var(--glow-danger); }

/* Text glow */
.text-glow {
  text-shadow: 0 0 10px currentColor;
}

/* Backdrop blur */
.backdrop-blur {
  backdrop-filter: blur(8px);
}

/* Transitions */
.transition { transition: all var(--transition-base); }
.transition-fast { transition: all var(--transition-fast); }
.transition-slow { transition: all var(--transition-slow); }

/* Flex utilities */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-center { align-items: center; justify-content: center; }
.flex-between { justify-content: space-between; }
.gap-1 { gap: var(--space-1); }
.gap-2 { gap: var(--space-2); }
.gap-3 { gap: var(--space-3); }
.gap-4 { gap: var(--space-4); }
```

## Animation Classes

```css
/* animations.css */

/* Pulse animation */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s ease-in-out infinite;
}

/* Scan line */
@keyframes scanLine {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}

.scan-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 212, 255, 0.03) 50%,
    transparent 100%
  );
  animation: scanLine 4s linear infinite;
}

/* Panel reveal */
@keyframes panelReveal {
  0% {
    opacity: 0;
    clip-path: polygon(0 0, 0 0, 0 100%, 0 100%);
  }
  100% {
    opacity: 1;
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  }
}

.panel-enter {
  animation: panelReveal 0.4s ease-out forwards;
}

/* Typing effect */
@keyframes typing {
  from { width: 0; }
  to { width: 100%; }
}

.typing-effect {
  overflow: hidden;
  white-space: nowrap;
  animation: typing 1s steps(30) forwards;
}

/* Data stream shimmer */
@keyframes dataStream {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.data-stream {
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--accent-primary) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: dataStream 3s linear infinite;
}

/* Glow pulse */
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 5px var(--accent-primary); }
  50% { box-shadow: 0 0 20px var(--accent-primary), 0 0 40px var(--accent-primary); }
}

.glow-pulse {
  animation: glowPulse 2s ease-in-out infinite;
}

/* Fade in up */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in-up {
  animation: fadeInUp 0.3s ease-out forwards;
}

/* Stagger children */
.stagger-children > * {
  animation: fadeInUp 0.3s ease-out forwards;
  opacity: 0;
}

.stagger-children > *:nth-child(1) { animation-delay: 0.05s; }
.stagger-children > *:nth-child(2) { animation-delay: 0.1s; }
.stagger-children > *:nth-child(3) { animation-delay: 0.15s; }
.stagger-children > *:nth-child(4) { animation-delay: 0.2s; }
.stagger-children > *:nth-child(5) { animation-delay: 0.25s; }
.stagger-children > *:nth-child(6) { animation-delay: 0.3s; }
.stagger-children > *:nth-child(7) { animation-delay: 0.35s; }
.stagger-children > *:nth-child(8) { animation-delay: 0.4s; }
```

## Augmented-UI Presets

```css
/* augmented-presets.css */

/* Small clip panel */
.aug-panel-sm {
  --aug-tl: var(--aug-clip-sm);
  --aug-br: var(--aug-clip-sm);
  --aug-border-all: 1px;
  --aug-border-bg: var(--border-subtle);
}

/* Medium clip panel (default) */
.aug-panel {
  --aug-tl: var(--aug-clip-md);
  --aug-br: var(--aug-clip-md);
  --aug-border-all: 1px;
  --aug-border-bg: var(--border-subtle);
}

/* Large clip panel */
.aug-panel-lg {
  --aug-tl: var(--aug-clip-lg);
  --aug-br: var(--aug-clip-lg);
  --aug-border-all: 1px;
  --aug-border-bg: var(--border-subtle);
}

/* Active state */
.aug-active {
  --aug-border-bg: var(--accent-primary);
}

/* Command button */
.aug-button {
  --aug-tl: 4px;
  --aug-br: 4px;
  --aug-border-all: 1px;
  --aug-border-bg: var(--border-default);
}

.aug-button:hover {
  --aug-border-bg: var(--accent-primary);
}

/* Alert variants */
.aug-success { --aug-border-bg: var(--accent-secondary); }
.aug-warning { --aug-border-bg: var(--accent-warning); }
.aug-danger { --aug-border-bg: var(--accent-danger); }
```
