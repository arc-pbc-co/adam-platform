# ADAM Platform - Local Development Setup Guide

This guide will help you set up and run the ADAM Platform locally to review the web application.

## Prerequisites

Before starting, you'll need to install:

### 1. Node.js and npm

**macOS** (using Homebrew):
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js (includes npm)
brew install node

# Verify installation
node --version  # Should show v18.0.0 or higher
npm --version   # Should show v9.0.0 or higher
```

**Alternative** (using nvm - Node Version Manager):
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal, then:
nvm install 18
nvm use 18
```

### 2. Docker Desktop (for backend services)

**macOS**:
1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop/
2. Install and launch Docker Desktop
3. Verify installation:
```bash
docker --version
docker compose version
```

---

## Quick Start Options

You have **three options** for reviewing the ADAM Platform:

### Option 1: Frontend Only (Quick Preview - 5 minutes)

Run just the React frontend to see the UI components and design.

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at: **http://localhost:5173**

**Note**: Without the backend, the app will show the UI but won't be able to:
- Create experiments
- Run AI agents
- Submit hardware jobs
- Display real-time data

**What you CAN see**:
- ✅ UI design and layout
- ✅ Component structure
- ✅ Page navigation
- ✅ Frontend architecture

---

### Option 2: Full Stack (Complete Experience - 15 minutes)

Run the complete platform with all services.

#### Step 1: Set up API Keys

Edit `.env.backend` and add your API keys:

```bash
# Open in your editor
nano .env.backend

# Or use VS Code
code .env.backend
```

Add your keys (get free keys from respective platforms):
```bash
OPENAI_API_KEY=sk-your-openai-key-here      # Get from: https://platform.openai.com/api-keys
GEMINI_API_KEY=your-gemini-key-here          # Get from: https://aistudio.google.com/app/apikey
```

**Note**: You can use either OpenAI or Gemini. Both work, but OpenAI is recommended for the best experience.

#### Step 2: Start Backend Services

```bash
# Start all backend services (PostgreSQL, TimescaleDB, NATS, etc.)
./scripts/start-backend.sh

# Wait for services to be healthy (about 2 minutes)
# You'll see logs indicating services are starting
```

This starts:
- ✅ PostgreSQL (main database)
- ✅ TimescaleDB (time-series data)
- ✅ Qdrant (vector database)
- ✅ NATS (message broker)
- ✅ Redis (cache)
- ✅ Nova Orchestrator (AI agents)
- ✅ API Gateway (REST/WebSocket)
- ✅ Prometheus + Grafana (monitoring)

#### Step 3: Start Frontend

In a new terminal:
```bash
# Install frontend dependencies
npm install

# Start frontend dev server
npm run dev
```

#### Step 4: Access the Platform

- **ADAM Platform**: http://localhost:5173
- **API Gateway**: http://localhost:3200
- **Nova Orchestrator**: http://localhost:3100
- **Grafana Dashboard**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

---

### Option 3: Mock Mode (UI Testing - 10 minutes)

Run the frontend with mock data (no backend needed).

#### Step 1: Install Dependencies
```bash
npm install
```

#### Step 2: Start with Mock Environment
```bash
# Set mock mode
export VITE_MOCK_MODE=true

# Start frontend
npm run dev
```

The app will use mock data for experiments, agents, and hardware.

**What you CAN see**:
- ✅ Full UI functionality
- ✅ Mock experiment workflow
- ✅ Simulated agent responses
- ✅ Fake hardware status
- ✅ Complete user experience

---

## Testing the Application

Once running, here's what to test:

### 1. Create an Experiment

1. Open the ADAM Platform at http://localhost:5173
2. Click **"New Experiment"** button
3. Fill in the form:
   ```
   Name: Test Magnetic Alloy
   Hypothesis: Fe-Co alloy improves magnetic properties
   Risk Level: R1 (Low)
   ```
4. Click **"Create Experiment"**

### 2. Watch the Multi-Agent System

You should see the 5-phase workflow:

```
Planning → Design → Simulation → Execution → Analysis
```

Each phase shows:
- Agent activity
- Current status
- Progress indicators
- Real-time updates (via WebSocket)

### 3. View Experiment Dashboard

- See all experiments in a grid layout
- Filter by status (draft, running, completed)
- Click an experiment to see details
- View workflow progress

### 4. NovaTerminal

Try the interactive terminal:

```bash
# In the NovaTerminal component
> help
> status
> agents
> experiments
```

### 5. Hardware Integration

Navigate to the Hardware section to see:
- Fleet status (13 printers)
- Material database (26+ materials)
- Cost calculator
- Job queue

---

## Project Structure Overview

```
adam-platform/
├── components/               # React components
│   ├── ExperimentDashboard.tsx    # Main dashboard
│   ├── WorkflowProgress.tsx       # 5-phase visualization
│   ├── SafetyApproval.tsx         # R2/R3 approval UI
│   └── NovaTerminal.tsx           # Interactive terminal
│
├── services/                # Frontend services
│   └── novaService.ts            # API client + WebSocket
│
├── backend/                 # Backend services
│   ├── nova/                     # Nova Orchestrator (AI agents)
│   ├── api-gateway/              # REST/WebSocket gateway
│   └── hardware/                 # Hardware integration
│       ├── data/                # Enhanced specifications
│       │   ├── MaterialsDatabase.ts      # 26+ materials
│       │   ├── PrinterSpecifications.ts  # 13 printers
│       │   └── FurnaceSpecifications.ts  # 7 furnaces
│       └── services/
│           └── CostCalculationService.ts # Cost modeling
│
├── docker-compose.yml       # Backend orchestration
└── scripts/                # Helper scripts
    ├── start-backend.sh         # Start all services
    └── stop-backend.sh          # Stop all services
```

---

## Troubleshooting

### Frontend won't start

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Docker services won't start

```bash
# Reset all services
./scripts/reset-backend.sh

# Start fresh
./scripts/start-backend.sh
```

### Port conflicts

If ports are already in use, edit `docker-compose.yml` to change:
- PostgreSQL: 5432 → 5435
- API Gateway: 3200 → 3201
- Nova Orchestrator: 3100 → 3101

### Can't connect to backend

Check if services are running:
```bash
docker compose ps

# Should show all services as "healthy" or "running"
```

Check API Gateway logs:
```bash
docker compose logs -f api-gateway
```

### WebSocket connection issues

1. Ensure API Gateway is running
2. Check browser console for errors
3. Verify CORS settings in `.env.backend`:
   ```bash
   CORS_ORIGIN=http://localhost:5173
   ```

---

## Viewing Logs

### Backend Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f graph-orchestrator
docker compose logs -f api-gateway

# Last 100 lines
docker compose logs --tail=100 graph-orchestrator
```

### Frontend Logs
- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab for API calls

---

## Testing Hardware Integration

### 1. View Printer Fleet

```bash
# API endpoint
curl http://localhost:3200/api/hardware

# Should return 13 printers with real specifications
```

### 2. Calculate Experiment Cost

```bash
curl -X POST http://localhost:3200/api/hardware/cost \
  -H "Content-Type: application/json" \
  -d '{
    "volume": 25,
    "dimensions": { "x": 30, "y": 30, "z": 30 },
    "materialId": "SS_17_4PH",
    "quantity": 8
  }'

# Returns complete cost breakdown
```

### 3. Get Material Database

```bash
curl http://localhost:3200/api/materials

# Returns 26+ materials with pricing and specs
```

---

## Database Access

### PostgreSQL (Main Database)
```bash
docker compose exec postgres psql -U nova -d nova

# Example queries:
\dt                                    # List tables
SELECT * FROM experiments;             # View experiments
SELECT * FROM agent_activities;        # View agent activity
```

### TimescaleDB (Time-Series)
```bash
docker compose exec timescaledb psql -U timescale -d timescale

# Example queries:
SELECT * FROM measurements ORDER BY time DESC LIMIT 10;
SELECT * FROM hardware_telemetry ORDER BY time DESC LIMIT 10;
```

---

## Monitoring

### Grafana Dashboards

Access at: http://localhost:3001 (admin/admin)

Pre-configured dashboards:
- System overview
- Agent performance
- Hardware utilization
- Experiment metrics

### Prometheus Metrics

Access at: http://localhost:9090

Example queries:
```promql
# Experiment success rate
rate(experiments_completed_total[5m])

# Agent response time
histogram_quantile(0.95, agent_response_time_bucket)

# Hardware job queue depth
hardware_queue_depth
```

---

## Development Workflow

### Making Changes

1. **Frontend Changes**: Auto-reload via Vite HMR
   - Edit files in `components/` or `services/`
   - Browser updates immediately

2. **Backend Changes**: Restart service
   ```bash
   docker compose restart graph-orchestrator
   docker compose restart api-gateway
   ```

3. **Database Changes**: Apply migrations
   ```bash
   docker compose exec postgres psql -U nova -d nova -f /path/to/migration.sql
   ```

### Hot Reload Setup

For backend hot reload:
```bash
# Edit docker-compose.yml to add nodemon
# Already configured in the volumes section
```

---

## Cleanup

### Stop Services
```bash
./scripts/stop-backend.sh
```

### Remove All Data
```bash
# Stop and remove containers, volumes, and networks
docker compose down -v

# Remove all ADAM-related images
docker images | grep adam | awk '{print $3}' | xargs docker rmi
```

---

## Next Steps

Once you've reviewed the application:

1. **Customize UI**: Edit components in `components/`
2. **Add Features**: Create new React components
3. **Integrate Real Hardware**: Add Desktop Metal API credentials
4. **Deploy to Cloud**: Use Kubernetes configs (coming soon)
5. **Add Analytics**: Create custom Grafana dashboards

---

## Getting Help

### Documentation
- [README.md](README.md) - Project overview
- [PHASE_4_COMPLETE.md](PHASE_4_COMPLETE.md) - Hardware integration details
- [HARDWARE_INTEGRATION_ENHANCED.md](HARDWARE_INTEGRATION_ENHANCED.md) - Enhanced specs
- [BACKEND_SETUP.md](BACKEND_SETUP.md) - Backend architecture

### Check Logs
```bash
# Backend errors
docker compose logs -f

# Frontend errors
# Open browser DevTools → Console
```

### Common Issues
- Port conflicts → Change ports in docker-compose.yml
- Docker not running → Start Docker Desktop
- API key issues → Check .env.backend
- WebSocket errors → Check CORS settings

---

## Quick Reference Commands

```bash
# Install dependencies
npm install

# Start frontend only
npm run dev

# Start full stack
./scripts/start-backend.sh
npm run dev

# Stop backend
./scripts/stop-backend.sh

# View logs
docker compose logs -f

# Reset everything
./scripts/reset-backend.sh

# Check service status
docker compose ps

# Access databases
docker compose exec postgres psql -U nova -d nova
docker compose exec timescaledb psql -U timescale -d timescale

# View monitoring
open http://localhost:3001  # Grafana
open http://localhost:9090  # Prometheus
```

---

## System Requirements

- **Node.js**: v18.0.0 or higher
- **Docker**: 20.10.0 or higher
- **RAM**: 4GB minimum (8GB recommended)
- **Disk**: 10GB free space
- **OS**: macOS, Linux, or Windows with WSL2

---

**Ready to start?** Run one of the quick start options above! 🚀
