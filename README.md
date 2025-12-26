# Arc Impact - ADAM Platform

**Autonomous Discovery and Advanced Manufacturing**

The world's first end-to-end AI materials discovery through to advanced manufacturing platform. ADAM is an AI orchestrator that controls physical hardware (Desktop Metal binder jetting printers) to run autonomous materials experiments in closed loops.

## Features

- **AI Orchestrator**: Multi-agent Nova system powered by LLMs for experiment planning and execution
- **Materials Discovery**: Design experiments for rare-earth-free magnets, solid-state batteries, and more
- **Hardware Integration**: Direct control of Desktop Metal binder jetting fleet via ORNL INTERSECT
- **High Throughput**: 200+ experiments per week vs traditional 10/week
- **God Mode Dashboard**: StarCraft 2-inspired command interface for fleet-wide operations
- **IDE Platform**: Full-featured workspace with agent canvas, chat, and terminal
- **Real-time Analytics**: Performance charts and experiment tracking

## Application Flow

```
Marketing Page → Login → God Mode Dashboard → [Onboard Sites] → IDE Platform
```

1. **Marketing Page**: Product showcase, hero video, and call-to-action
2. **Login Screen**: Authentication with demo credentials support
3. **God Mode Dashboard**: Global map view of printer fleet with site selection and onboarding
4. **IDE Platform**: Full workspace for experiment design, agent monitoring, and hardware control

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ADAM Platform                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Frontend (React 19 + TypeScript + Vite)                                │
│  ├── MarketingPage     - Landing page with hero & product showcase      │
│  ├── LoginScreen       - Authentication interface                       │
│  ├── GodModeDashboard  - StarCraft 2-style fleet command center         │
│  │   ├── GlobalMap     - D3.js interactive site visualization           │
│  │   ├── TacticalView  - Grid-based printer fleet view                  │
│  │   ├── ResourceBar   - Fleet statistics and metrics                   │
│  │   └── Minimap       - Overview navigation                            │
│  ├── IDEPlatform       - Full workspace environment                     │
│  │   ├── FlowchartCanvas  - Agent workflow visualization                │
│  │   ├── FactoryFloorCanvas - Hardware fleet monitoring                 │
│  │   ├── Chat Panel       - Nova AI interaction                         │
│  │   └── Terminal         - Debug console and logs                      │
│  └── ProductShowcase   - Desktop Metal printer carousel                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Backend Services                                                        │
│  ├── API Gateway      - REST API + WebSocket server                     │
│  ├── Nova Orchestrator- Experiment planning and execution               │
│  └── INTERSECT Bridge - Lab automation integration                      │
├─────────────────────────────────────────────────────────────────────────┤
│  INTERSECT Integration Layer                                             │
│  ├── Gateway Service  - Routes ADAM requests to controllers             │
│  ├── Event Bridge     - Normalizes async events to ADAM format          │
│  ├── Correlation Store- Maps activity IDs to experiment runs            │
│  └── Schema Mapper    - Converts ExecutionPlan to INTERSECT Activities  │
├─────────────────────────────────────────────────────────────────────────┤
│  Instrument Controllers (INTERSECT Capability Contract v0.1)            │
│  ├── Desktop Metal    - Binder jetting printer control                  │
│  ├── Robot Arm        - Sample handling automation                      │
│  ├── Furnace          - Sintering operations                            │
│  └── Characterization - Material analysis (XRD, SEM, etc.)              │
└─────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TypeScript, Vite, CSS Modules, Framer Motion, D3.js |
| **Backend** | Node.js, TypeScript, Express, WebSocket |
| **Database** | PostgreSQL + TimescaleDB, Qdrant (vectors), Redis (cache) |
| **Messaging** | NATS (event-driven architecture) |
| **Monitoring** | Prometheus, Grafana |
| **Lab Automation** | ORNL INTERSECT, Istio service mesh |
| **AI** | Google Gemini 2.0 Flash, Multi-agent orchestration |

## Frontend Architecture

### State Management

The application uses React Context (`AppContext`) for global state:

```typescript
interface AppState {
  currentView: 'marketing' | 'login' | 'god-mode' | 'platform'
  isAuthenticated: boolean
  user: User | null
  onboardedSites: Site[]
}
```

### Component Structure

```
frontend/src/
├── components/
│   ├── Canvas/                    # Visualization canvases
│   │   ├── FlowchartCanvas.tsx   # Agent workflow visualization
│   │   ├── FactoryFloorCanvas.tsx # Hardware fleet view
│   │   └── AgentNode.tsx         # Individual agent cards
│   ├── god-mode/                  # God Mode Dashboard
│   │   ├── GodModeDashboard.tsx  # Main dashboard container
│   │   ├── GlobalMap/            # D3.js world map with sites
│   │   ├── TacticalView.tsx      # Grid printer view
│   │   ├── ResourceBar.tsx       # Fleet statistics
│   │   └── Minimap/              # Navigation overview
│   ├── IDEPlatform/               # IDE workspace
│   │   └── IDEPlatform.tsx       # Main IDE container
│   ├── LoginScreen/               # Authentication
│   │   └── LoginScreen.tsx       # Login form
│   ├── MarketingPage/             # Landing page
│   │   └── MarketingPage.tsx     # Hero + sections
│   └── ProductShowcase/           # Printer carousel
│       └── ProductShowcase.tsx   # Product cards
├── contexts/
│   └── AppContext.tsx            # Global state management
├── styles/
│   └── god-mode-theme.css        # Design system tokens
└── types/
    └── app.ts                    # TypeScript definitions
```

### Design System

The God Mode theme uses CSS custom properties for consistent styling:

```css
:root {
  /* Colors */
  --bg-void: #0a0a0f;
  --accent-primary: #00d4ff;
  --accent-secondary: #00ff88;
  --accent-warning: #ffaa00;
  --accent-danger: #ff4444;

  /* Typography */
  --font-display: 'Rajdhani', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  /* ... */
}
```

## INTERSECT Integration

ADAM integrates with [ORNL INTERSECT](https://intersect-architecture.readthedocs.io/) for lab automation. This enables standardized communication with scientific instruments through a capability-based contract system.

### Key Components

```
backend/src/integrations/intersect/
├── gateway/
│   └── IntersectGatewayService.ts    # Routes requests to controllers
├── events/
│   └── IntersectEventBridge.ts       # Subscribes to async events
├── correlation/
│   └── CorrelationStore.ts           # Activity ↔ Experiment mapping
├── mapping/
│   └── SchemaMapper.ts               # ADAM → INTERSECT conversion
├── orchestration/
│   ├── Scheduler.ts                  # Task queue with priorities
│   ├── Supervisor.ts                 # Health monitoring & recovery
│   └── Agent.ts                      # Concurrent task execution
├── contracts/jsonschema/             # JSON Schema contracts (v0.1)
├── contract-types.ts                 # TypeScript type definitions
├── ContractCompliantController.ts    # Base controller class
└── ContractEventBridge.ts            # ADAM event normalization
```

### Contract Testing

The `contract-test-scaffold/` directory provides tools for validating INTERSECT compliance:

```bash
cd contract-test-scaffold/tests/node

# Install dependencies
npm install

# Validate fixtures against JSON schemas
npm run validate:fixtures

# Run end-to-end contract tests (requires Python simulator)
npm test
```

### INTERSECT Capability Contract

Controllers implement the INTERSECT Instrument Controller v0.1 contract:

| Endpoint | Description |
|----------|-------------|
| `GET /v0.1/actions` | List available actions |
| `GET /v0.1/activities` | List available activities |
| `POST /v0.1/actions/perform` | Execute synchronous action |
| `POST /v0.1/activities/start` | Start long-running activity |
| `POST /v0.1/activities/cancel` | Cancel running activity |
| `GET /v0.1/activities/{id}/status` | Get activity status |
| `GET /v0.1/activities/{id}/data` | Get activity data products |
| `GET /events` | SSE stream for async events |

**Event Types:**
- `InstrumentActionCompletion` - Action completed (success/failure)
- `InstrumentActivityStatusChange` - Activity state transition

**Activity Status Flow:**
```
ACTIVITY_PENDING → ACTIVITY_IN_PROGRESS → ACTIVITY_COMPLETED
                                        → ACTIVITY_FAILED
                                        → ACTIVITY_CANCELED
```

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Python 3.9+ (for INTERSECT simulator)

### Frontend Development

```bash
# Clone and install
git clone <repository-url>
cd adam-platform/frontend
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Demo Credentials

For development/demo purposes, use these credentials:
- **Username**: `demo`
- **Password**: `demo123`

### Backend Services

```bash
# Configure backend environment
cp .env.backend.example .env.backend
# Edit .env.backend with your settings

# Start all services
./scripts/start-backend.sh

# Services available at:
# - API Gateway:  http://localhost:3200
# - Grafana:      http://localhost:3001
# - Prometheus:   http://localhost:9090
```

### INTERSECT Simulator

```bash
cd contract-test-scaffold/simulator/python

# Install dependencies
pip install -r requirements.txt

# Start simulator
uvicorn app.main:app --port 8090

# Simulator available at http://localhost:8090
```

## Project Structure

```
adam-platform/
├── frontend/                        # React frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Canvas/             # FlowchartCanvas, FactoryFloorCanvas
│   │   │   ├── god-mode/           # God Mode Dashboard components
│   │   │   ├── IDEPlatform/        # IDE workspace
│   │   │   ├── LoginScreen/        # Authentication UI
│   │   │   ├── MarketingPage/      # Landing page
│   │   │   └── ProductShowcase/    # Printer carousel
│   │   ├── contexts/               # React Context providers
│   │   ├── styles/                 # Global CSS and themes
│   │   └── types/                  # TypeScript definitions
│   ├── public/                     # Static assets
│   └── package.json
├── backend/
│   ├── api-gateway/                # REST API + WebSocket server
│   ├── nova/                       # Nova orchestrator
│   ├── src/integrations/intersect/ # INTERSECT integration layer
│   │   ├── gateway/                # Gateway service
│   │   ├── events/                 # Event bridge
│   │   ├── correlation/            # Correlation store
│   │   ├── mapping/                # Schema mapper
│   │   ├── orchestration/          # Scheduler/Supervisor/Agent
│   │   └── contracts/              # JSON schemas & types
│   ├── test/fixtures/intersect/    # Test fixtures
│   └── docker/                     # Docker scripts
├── contract-test-scaffold/
│   ├── contracts/
│   │   ├── jsonschema/             # INTERSECT JSON schemas
│   │   └── fixtures/               # Golden test fixtures
│   ├── simulator/python/           # FastAPI instrument simulator
│   └── tests/node/                 # Contract tests (Jest + AJV)
├── infrastructure/
│   └── istio/                      # Service mesh configuration
├── components/                     # Legacy React components (root)
├── services/                       # Frontend services
├── scripts/                        # Helper scripts
└── docker-compose.yml              # Service orchestration
```

## Backend Infrastructure

The backend includes enterprise-ready infrastructure:

| Service | Purpose |
|---------|---------|
| PostgreSQL + TimescaleDB | Relational data + time-series |
| Qdrant | Vector database for materials embeddings |
| NATS | Event-driven messaging |
| Redis | Caching and session storage |
| Prometheus + Grafana | Metrics and monitoring |
| Istio | Service mesh for INTERSECT controllers |

## Hardware Fleet

Integrated Desktop Metal systems controlled via INTERSECT:

| System | Capability |
|--------|-----------|
| **X25 Pro** | Agile volume production |
| **Shop System** | Batch production workhorse |
| **X160 Pro** | Heavy industrial ceramic printing |
| **InnoventX** | Open architecture R&D |
| **ETEC Xtreme 8K** | Top-down DLP polymer printing |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Frontend |
| `DATABASE_URL` | PostgreSQL connection string | Backend |
| `REDIS_URL` | Redis connection string | Backend |
| `NATS_URL` | NATS server URL | Backend |
| `GEMINI_API_KEY` | Google Gemini API key | Backend |

## Development

### Running Tests

```bash
# Frontend tests
cd frontend
npm test

# Contract tests
cd contract-test-scaffold/tests/node
npm test

# Fixture validation
npm run validate:fixtures
```

### Building for Production

```bash
# Frontend
cd frontend
npm run build
npm run preview

# Backend (Docker)
docker-compose build
docker-compose up -d
```

## Troubleshooting

### Frontend Issues
- **Page not scrolling**: The God Mode and IDE views lock scroll. Marketing page should scroll normally.
- **Canvas not displaying**: Ensure the Canvas components are properly imported in IDEPlatform.
- **Login not working**: Use demo credentials (`demo` / `demo123`) for development.

### API Key Issues
- Ensure your Gemini API key is valid and billing is enabled
- Verify the key is correctly set in backend environment

### INTERSECT Connection Issues
- Check that the instrument controller is running
- Verify network connectivity to controller endpoints
- Check SSE event stream with `curl http://localhost:8090/events`

### Contract Test Failures
- Run `npm run validate:fixtures` to check schema compliance
- Ensure Python simulator dependencies are installed
- Check that port 8090 is available

### Build Errors
- Clear node_modules: `rm -rf node_modules && npm install`
- Ensure Node.js 18+: `node --version`

## License

Copyright 2025 Arc Public Benefit Corp. All rights reserved.

## Contact

For questions or support, please contact Arc Impact.
