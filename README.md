# Arc Impact - ADAM Platform

**Autonomous Discovery and Advanced Manufacturing**

The world's first end-to-end AI materials discovery through to advanced manufacturing platform. ADAM is an AI orchestrator that controls physical hardware (Desktop Metal binder jetting printers) to run autonomous materials experiments in closed loops.

## Features

- **AI Orchestrator**: Planner-Executor-Critic agent powered by Google Gemini
- **Materials Discovery**: Design experiments for rare-earth-free magnets, solid-state batteries, and more
- **Hardware Integration**: Direct control of Desktop Metal binder jetting fleet via ORNL INTERSECT
- **High Throughput**: 200+ experiments per week vs traditional 10/week
- **Interactive Terminal**: Chat interface to query ADAM and request experiments
- **Real-time Analytics**: Performance charts and experiment tracking

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ADAM Platform                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                                          │
│  ├── AdamTerminal     - Interactive AI chat interface                   │
│  ├── PerformanceChart - Throughput analytics                            │
│  └── ProductShowcase  - Hardware fleet visualization                    │
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
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion |
| **Backend** | Node.js, TypeScript, Express, WebSocket |
| **Database** | PostgreSQL + TimescaleDB, Qdrant (vectors), Redis (cache) |
| **Messaging** | NATS (event-driven architecture) |
| **Monitoring** | Prometheus, Grafana |
| **Lab Automation** | ORNL INTERSECT, Istio service mesh |
| **AI** | Google Gemini 2.0 Flash |

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
cd adam-platform
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local and add your Gemini API key

# Start development server
npm run dev

# Open http://localhost:3000
```

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
├── backend/
│   ├── api-gateway/                  # REST API + WebSocket server
│   ├── nova/                         # Nova orchestrator
│   ├── src/integrations/intersect/   # INTERSECT integration layer
│   │   ├── gateway/                  # Gateway service
│   │   ├── events/                   # Event bridge
│   │   ├── correlation/              # Correlation store
│   │   ├── mapping/                  # Schema mapper
│   │   ├── orchestration/            # Scheduler/Supervisor/Agent
│   │   └── contracts/                # JSON schemas & types
│   ├── test/fixtures/intersect/      # Test fixtures
│   └── docker/                       # Docker scripts
├── contract-test-scaffold/
│   ├── contracts/
│   │   ├── jsonschema/               # INTERSECT JSON schemas
│   │   └── fixtures/                 # Golden test fixtures
│   ├── simulator/python/             # FastAPI instrument simulator
│   └── tests/node/                   # Contract tests (Jest + AJV)
├── infrastructure/
│   └── istio/                        # Service mesh configuration
├── components/                       # React components
├── services/                         # Frontend services
├── scripts/                          # Helper scripts
├── App.tsx                           # Main React component
├── docker-compose.yml                # Service orchestration
└── vite.config.ts                    # Vite configuration
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
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Backend |
| `REDIS_URL` | Redis connection string | Backend |
| `NATS_URL` | NATS server URL | Backend |

## Development

### Running Tests

```bash
# Frontend tests
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
npm run build
npm run preview

# Backend (Docker)
docker-compose build
docker-compose up -d
```

## Troubleshooting

### API Key Issues
- Ensure your Gemini API key is valid and billing is enabled
- Verify the key is correctly set in `.env.local`

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
